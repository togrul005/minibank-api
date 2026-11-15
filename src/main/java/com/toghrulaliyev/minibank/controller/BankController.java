package com.toghrulaliyev.minibank.controller;

import com.toghrulaliyev.minibank.dto.AccountResponse;
import com.toghrulaliyev.minibank.dto.AmountRequest;
import com.toghrulaliyev.minibank.dto.CreateAccountRequest;
import com.toghrulaliyev.minibank.dto.OperationResponse;
import com.toghrulaliyev.minibank.dto.PageResponse;
import com.toghrulaliyev.minibank.dto.TransferDetailsResponse;
import com.toghrulaliyev.minibank.dto.TransferRequest;
import com.toghrulaliyev.minibank.dto.TransferResponse;
import com.toghrulaliyev.minibank.service.BankService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "MiniBank", description = "Accounts, deposits, withdrawals and transfers")
public class BankController {

    private final BankService bankService;

    public BankController(BankService bankService) {
        this.bankService = bankService;
    }

    // ---------------------------------------------------------------- accounts

    @Operation(summary = "Create an account")
    @PostMapping("/accounts")
    @ResponseStatus(HttpStatus.CREATED)
    public AccountResponse createAccount(@Valid @RequestBody CreateAccountRequest req) {
        return AccountResponse.from(bankService.createAccount(req.id(), req.initialBalance()));
    }

    @Operation(summary = "List all accounts (paged)")
    @GetMapping("/accounts")
    public PageResponse<AccountResponse> listAccounts(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(200) int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").and(Sort.by("id")));
        return PageResponse.from(bankService.listAccounts(pageable), AccountResponse::from);
    }

    @Operation(summary = "Get one account")
    @GetMapping("/accounts/{id}")
    public AccountResponse getAccount(@PathVariable String id) {
        return AccountResponse.from(bankService.getAccount(id));
    }

    @Operation(summary = "Deposit money into an account")
    @PostMapping("/accounts/{id}/deposit")
    public OperationResponse deposit(@PathVariable String id, @Valid @RequestBody AmountRequest req) {
        return OperationResponse.from(bankService.deposit(id, req.amount()));
    }

    @Operation(summary = "Withdraw money from an account")
    @PostMapping("/accounts/{id}/withdraw")
    public OperationResponse withdraw(@PathVariable String id, @Valid @RequestBody AmountRequest req) {
        return OperationResponse.from(bankService.withdraw(id, req.amount()));
    }

    @Operation(summary = "Transaction history of an account, newest first (paged)")
    @GetMapping("/accounts/{id}/transfers")
    public PageResponse<TransferDetailsResponse> getAccountTransfers(
            @PathVariable String id,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(200) int size) {
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id"));
        return PageResponse.from(bankService.getTransfersForAccount(id, pageable), TransferDetailsResponse::from);
    }

    // --------------------------------------------------------------- transfers

    @Operation(summary = "Transfer money between two accounts",
            description = "Send the same Idempotency-Key again to safely retry: money moves only once.")
    @PostMapping("/transfers")
    public TransferResponse transfer(
            @Parameter(description = "Optional key for safe retries")
            @RequestHeader(value = "Idempotency-Key", required = false) @Size(max = 100) String idempotencyKey,
            @Valid @RequestBody TransferRequest req) {
        return TransferResponse.from(
                bankService.transfer(req.fromId(), req.toId(), req.amount(), idempotencyKey));
    }

    @Operation(summary = "Get one transfer")
    @GetMapping("/transfers/{id}")
    public TransferDetailsResponse getTransfer(@PathVariable String id) {
        return TransferDetailsResponse.from(bankService.getTransfer(id));
    }
}
