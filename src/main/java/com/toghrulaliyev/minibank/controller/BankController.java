package com.toghrulaliyev.minibank.controller;

import com.toghrulaliyev.minibank.controller.BankController.TransferDetailsResponse;
import com.toghrulaliyev.minibank.model.Account;
import com.toghrulaliyev.minibank.model.Transfer;
import com.toghrulaliyev.minibank.service.BankService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;

@RestController
@RequestMapping("/api/v1")
public class BankController {

    private final BankService bankService;

    public BankController(BankService bankService) {
        this.bankService = bankService;
    }

    // --- Accounts ---

    @PostMapping("/accounts")
    @ResponseStatus(HttpStatus.CREATED)
    public AccountResponse createAccount(@Valid @RequestBody CreateAccountRequest req) {
        Account created = bankService.createAccount(req.id(), req.initialBalance());
        return AccountResponse.from(created);
    }

    @GetMapping("/accounts/{id}")
    public AccountResponse getAccount(@PathVariable String id) {
        Account acc = bankService.getAccount(id);
        return AccountResponse.from(acc);
    }

    // --- Transfers ---

    @PostMapping("/transfers")
    public TransferResponse transfer(
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody TransferRequest req
    ) {
        BankService.TransferOutcome outcome =
                bankService.transfer(req.fromId(), req.toId(), req.amount(), idempotencyKey);

        return new TransferResponse(
                outcome.transferId(),
                outcome.fromId(),
                outcome.toId(),
                outcome.amount(),
                outcome.fromBalanceAfter(),
                outcome.toBalanceAfter()
        );
    }

    @GetMapping("/transfers/{id}")
    public TransferDetailsResponse getTransfer(@PathVariable String id) {
        Transfer t = bankService.getTransfer(id);
        return new TransferDetailsResponse(
                t.getId(),
                t.getFromId(),
                t.getToId(),
                t.getAmount(),
                t.getCreatedAt()
        );
    }

    @GetMapping("/accounts/{id}/transfers")
    public java.util.List<TransferDetailsResponse> getAccountTransfers(
            @PathVariable String id,
            @RequestParam(value = "limit", defaultValue = "50") int limit
    ) {
        if (limit < 1 || limit > 200) {
            throw new IllegalArgumentException("limit must be between 1 and 200");
        }

        return bankService.getTransfersForAccount(id).stream()
                .limit(limit)
                .map(t -> new TransferDetailsResponse(
                        t.getId(),
                        t.getFromId(),
                        t.getToId(),
                        t.getAmount(),
                        t.getCreatedAt()
                ))
                .toList();
    }



    // --- DTOs ---

    public record CreateAccountRequest(
        @NotBlank
        @jakarta.validation.constraints.Size(max = 32)
        String id,
        @NotNull @Positive BigDecimal initialBalance
) {}

    public record AccountResponse(String id, BigDecimal balance) {
        static AccountResponse from(Account a) {
            return new AccountResponse(a.getId(), a.getBalance());
        }
    }

    public record TransferRequest(
        @NotBlank @jakarta.validation.constraints.Size(max = 32) String fromId,
        @NotBlank @jakarta.validation.constraints.Size(max = 32) String toId,
        @NotNull @Positive BigDecimal amount
) {}

    public record TransferResponse(
            String transferId,
            String fromId,
            String toId,
            BigDecimal amount,
            BigDecimal fromBalanceAfter,
            BigDecimal toBalanceAfter
    ) {}

    public record TransferDetailsResponse(
            String id,
            String fromId,
            String toId,
            BigDecimal amount,
            Instant createdAt
    ) {}
}
