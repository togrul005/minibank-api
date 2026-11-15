package com.toghrulaliyev.minibank.dto;

import com.toghrulaliyev.minibank.service.BankService.TransferOutcome;

import java.math.BigDecimal;

public record TransferResponse(String transferId, String fromId, String toId, BigDecimal amount,
                               BigDecimal fromBalanceAfter, BigDecimal toBalanceAfter) {
    public static TransferResponse from(TransferOutcome o) {
        return new TransferResponse(o.transferId(), o.fromId(), o.toId(), o.amount(),
                o.fromBalanceAfter(), o.toBalanceAfter());
    }
}
