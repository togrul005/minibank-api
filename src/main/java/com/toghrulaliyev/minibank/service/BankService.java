package com.toghrulaliyev.minibank.service;

import com.toghrulaliyev.minibank.error.ConflictException;
import com.toghrulaliyev.minibank.error.NotFoundException;
import com.toghrulaliyev.minibank.model.Account;
import com.toghrulaliyev.minibank.model.IdempotencyRecord;
import com.toghrulaliyev.minibank.model.Transfer;
import com.toghrulaliyev.minibank.repository.AccountRepository;
import com.toghrulaliyev.minibank.repository.IdempotencyRepository;
import com.toghrulaliyev.minibank.repository.TransferRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.Objects;

@Service
public class BankService {

    private static final Logger log = LoggerFactory.getLogger(BankService.class);

    private final AccountRepository accounts;
    private final TransferRepository transfers;
    private final IdempotencyRepository idempotency;
    private final TransactionTemplate tx;

    public BankService(AccountRepository accounts,
                       TransferRepository transfers,
                       IdempotencyRepository idempotency,
                       PlatformTransactionManager transactionManager) {
        this.accounts = accounts;
        this.transfers = transfers;
        this.idempotency = idempotency;
        this.tx = new TransactionTemplate(transactionManager);
    }

    // ---------------------------------------------------------------- accounts

    @Transactional
    public Account createAccount(String id, BigDecimal initialBalance) {
        validateAmount(initialBalance, "initialBalance");
        if (accounts.existsById(id)) {
            throw new ConflictException("Account already exists: " + id);
        }
        // saveAndFlush: a parallel duplicate fails here (PK violation -> 409), not later
        return accounts.saveAndFlush(new Account(id, initialBalance));
    }

    @Transactional(readOnly = true)
    public Account getAccount(String id) {
        return accounts.findById(id)
                .orElseThrow(() -> new NotFoundException("Account not found: " + id));
    }

    @Transactional(readOnly = true)
    public Page<Account> listAccounts(Pageable pageable) {
        return accounts.findAll(pageable);
    }

    // ------------------------------------------------------- deposit / withdraw

    @Transactional
    public OperationOutcome deposit(String accountId, BigDecimal amount) {
        validateAmount(amount, "amount");
        Account account = lockAccount(accountId);
        account.deposit(amount);
        Transfer t = transfers.save(Transfer.deposit(accountId, amount));
        log.info("Deposit {}: {} amount={}", t.getId(), accountId, amount);
        return new OperationOutcome(t.getId(), accountId, amount, account.getBalance());
    }

    @Transactional
    public OperationOutcome withdraw(String accountId, BigDecimal amount) {
        validateAmount(amount, "amount");
        Account account = lockAccount(accountId);
        account.withdraw(amount);
        Transfer t = transfers.save(Transfer.withdrawal(accountId, amount));
        log.info("Withdrawal {}: {} amount={}", t.getId(), accountId, amount);
        return new OperationOutcome(t.getId(), accountId, amount, account.getBalance());
    }

    // --------------------------------------------------------------- transfers

    /**
     * Moves money between two accounts.
     * <p>
     * Idempotency: if the same Idempotency-Key arrives twice, money moves only once.
     * The key is stored in the same DB transaction as the money movement, and it is a
     * PRIMARY KEY - so if two requests with the same key run at the same time, the second
     * one fails on insert, its whole transaction (including the money) is rolled back,
     * and it returns the first request's result instead.
     */
    public TransferOutcome transfer(String fromId, String toId, BigDecimal amount, String idempotencyKey) {
        validateAmount(amount, "amount");
        if (fromId == null || fromId.isBlank()) throw new IllegalArgumentException("fromId must not be blank");
        if (toId == null || toId.isBlank()) throw new IllegalArgumentException("toId must not be blank");
        if (fromId.equals(toId)) throw new IllegalArgumentException("fromId and toId must be different");

        String key = (idempotencyKey == null || idempotencyKey.isBlank()) ? null : idempotencyKey;
        String requestHash = fromId + "|" + toId + "|" + amount.stripTrailingZeros().toPlainString();

        // Fast path: key already used -> replay the stored result
        if (key != null) {
            var existing = idempotency.findById(key);
            if (existing.isPresent()) {
                return replay(existing.get(), requestHash);
            }
        }

        try {
            return tx.execute(status -> doTransfer(fromId, toId, amount, key, requestHash));
        } catch (DataIntegrityViolationException e) {
            // Another request with the same key committed first -> return its result
            if (key != null) {
                var winner = idempotency.findById(key);
                if (winner.isPresent()) {
                    return replay(winner.get(), requestHash);
                }
            }
            throw e;
        }
    }

    private TransferOutcome doTransfer(String fromId, String toId, BigDecimal amount,
                                       String key, String requestHash) {
        // Always lock in the same (alphabetical) order -> no deadlocks
        String firstId = fromId.compareTo(toId) < 0 ? fromId : toId;
        String secondId = firstId.equals(fromId) ? toId : fromId;
        Account first = lockAccount(firstId);
        Account second = lockAccount(secondId);

        Account from = first.getId().equals(fromId) ? first : second;
        Account to = from == first ? second : first;

        from.withdraw(amount);
        to.deposit(amount);

        Transfer transfer = transfers.save(Transfer.transfer(fromId, toId, amount));

        if (key != null) {
            idempotency.saveAndFlush(new IdempotencyRecord(
                    key, requestHash, transfer.getId(), from.getBalance(), to.getBalance()));
        }

        log.info("Transfer {}: {} -> {} amount={}", transfer.getId(), fromId, toId, amount);
        return new TransferOutcome(transfer.getId(), fromId, toId, amount,
                from.getBalance(), to.getBalance());
    }

    private TransferOutcome replay(IdempotencyRecord record, String requestHash) {
        if (!record.getRequestHash().equals(requestHash)) {
            throw new ConflictException("Idempotency-Key was already used for a different request");
        }
        Transfer t = transfers.findById(record.getTransferId())
                .orElseThrow(() -> new IllegalStateException("Transfer missing for idempotency key"));
        return new TransferOutcome(t.getId(), t.getFromAccountId(), t.getToAccountId(), t.getAmount(),
                record.getFromBalanceAfter(), record.getToBalanceAfter());
    }

    @Transactional(readOnly = true)
    public Transfer getTransfer(String transferId) {
        return transfers.findById(transferId)
                .orElseThrow(() -> new NotFoundException("Transfer not found: " + transferId));
    }

    @Transactional(readOnly = true)
    public Page<Transfer> getTransfersForAccount(String accountId, Pageable pageable) {
        if (!accounts.existsById(accountId)) {
            throw new NotFoundException("Account not found: " + accountId);
        }
        return transfers.findByAccount(accountId, pageable);
    }

    // ----------------------------------------------------------------- helpers

    private Account lockAccount(String id) {
        return accounts.findByIdForUpdate(id)
                .orElseThrow(() -> new NotFoundException("Account not found: " + id));
    }

    private static void validateAmount(BigDecimal value, String field) {
        Objects.requireNonNull(value, field + " must not be null");
        if (value.signum() <= 0) {
            throw new IllegalArgumentException(field + " must be > 0");
        }
        if (value.stripTrailingZeros().scale() > 2) {
            throw new IllegalArgumentException(field + " must have at most 2 decimal places");
        }
    }

    public record TransferOutcome(String transferId, String fromId, String toId, BigDecimal amount,
                                  BigDecimal fromBalanceAfter, BigDecimal toBalanceAfter) {}

    public record OperationOutcome(String transferId, String accountId, BigDecimal amount,
                                   BigDecimal balanceAfter) {}
}
