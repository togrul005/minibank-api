package com.toghrulaliyev.minibank.dto;

import com.toghrulaliyev.minibank.service.BankService.OperationOutcome;

import java.math.BigDecimal;

/** Result of a deposit or withdrawal. */
public record OperationResponse(String transferId, String accountId, BigDecimal amount, BigDecimal balanceAfter) {
    public static OperationResponse from(OperationOutcome o) {
        return new OperationResponse(o.transferId(), o.accountId(), o.amount(), o.balanceAfter());
    }
}
