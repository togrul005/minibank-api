package com.toghrulaliyev.minibank.service;

import com.toghrulaliyev.minibank.controller.BankController.TransferDetailsResponse;
import com.toghrulaliyev.minibank.model.Account;
import com.toghrulaliyev.minibank.model.Transfer;

import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class BankService {

    private final ConcurrentMap<String, Account> accounts = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, ReentrantLock> locks = new ConcurrentHashMap<>();

    private static final Logger log = LoggerFactory.getLogger(BankService.class);

    // Idempotency-Key -> TransferOutcome
    private final ConcurrentMap<String, TransferOutcome> idempotency = new ConcurrentHashMap<>();

    // Audit trail
    private final ConcurrentMap<String, Transfer> transfers = new ConcurrentHashMap<>();

    public Account createAccount(String id, BigDecimal initialBalance) {
        validateMoneyPositive(initialBalance, "initialBalance");

        Account newAccount = new Account(id, initialBalance);
        Account existing = accounts.putIfAbsent(id, newAccount);
        if (existing != null) {
            throw new IllegalArgumentException("Account already exists: " + id);
        }
        locks.computeIfAbsent(id, ignored -> new ReentrantLock());
        return newAccount;
    }

    public Account getAccount(String id) {
        Account acc = accounts.get(id);
        if (acc == null) throw new NoSuchElementException("Account not found: " + id);
        return acc;
    }

    public Transfer getTransfer(String transferId) {
        Transfer t = transfers.get(transferId);
        if (t == null) throw new NoSuchElementException("Transfer not found: " + transferId);
        return t;
    }

    public TransferOutcome transfer(String fromId, String toId, BigDecimal amount, String idempotencyKey) {
        validateMoneyPositive(amount, "amount");
        if (fromId == null || fromId.isBlank()) throw new IllegalArgumentException("fromId must not be blank");
        if (toId == null || toId.isBlank()) throw new IllegalArgumentException("toId must not be blank");
        if (fromId.equals(toId)) throw new IllegalArgumentException("fromId and toId must be different");

        // Idempotency replay
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            TransferOutcome existing = idempotency.get(idempotencyKey);
            if (existing != null) return existing;
        }
    

        // Lock ordering to avoid deadlocks
        String first = fromId.compareTo(toId) < 0 ? fromId : toId;
        String second = fromId.compareTo(toId) < 0 ? toId : fromId;

        ReentrantLock lock1 = lockFor(first);
        ReentrantLock lock2 = lockFor(second);

        lock1.lock();
        try {
            lock2.lock();
            try {
                Account from = getAccount(fromId);
                Account to = getAccount(toId);

                if (from.getBalance().compareTo(amount) < 0) {
                    throw new IllegalArgumentException("Insufficient funds in account: " + fromId);
                }

                Account updatedFrom = from.withBalance(from.getBalance().subtract(amount));
                Account updatedTo = to.withBalance(to.getBalance().add(amount));

                accounts.put(fromId, updatedFrom);
                accounts.put(toId, updatedTo);

                Transfer transfer = new Transfer(fromId, toId, amount);
                transfers.put(transfer.getId(), transfer);

                TransferOutcome outcome = new TransferOutcome(
                        transfer.getId(),
                        fromId,
                        toId,
                        amount,
                        updatedFrom.getBalance(),
                        updatedTo.getBalance()
                );

                if (idempotencyKey != null && !idempotencyKey.isBlank()) {
                    TransferOutcome raced = idempotency.putIfAbsent(idempotencyKey, outcome);
                    if (raced != null) return raced;
                }
                log.info("Transfer {}: {} -> {} amount={}",
                transfer.getId(), fromId, toId, amount);
                
                return outcome;
            } finally {
                lock2.unlock();
            }
        } finally {
            lock1.unlock();
        }
    }

    public java.util.List<Transfer> getTransfersForAccount(String accountId) {
    // ensure account exists (nice API behavior)
    getAccount(accountId);

    return transfers.values().stream()
            .filter(t -> t.getFromId().equals(accountId) || t.getToId().equals(accountId))
            .sorted(java.util.Comparator.comparing(Transfer::getCreatedAt).reversed())
            .toList();
}



    private ReentrantLock lockFor(String accountId) {
        return locks.computeIfAbsent(accountId, ignored -> new ReentrantLock());
    }

    private static void validateMoneyPositive(BigDecimal value, String fieldName) {
        Objects.requireNonNull(value, fieldName + " must not be null");
        if (value.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(fieldName + " must be > 0");
        }
    }

    public record TransferOutcome(
            String transferId,
            String fromId,
            String toId,
            BigDecimal amount,
            BigDecimal fromBalanceAfter,
            BigDecimal toBalanceAfter
    ) {}
}
