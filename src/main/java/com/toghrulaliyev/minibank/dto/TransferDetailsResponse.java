package com.toghrulaliyev.minibank.dto;

import com.toghrulaliyev.minibank.model.Transfer;
import com.toghrulaliyev.minibank.model.TransferType;

import java.math.BigDecimal;
import java.time.Instant;

public record TransferDetailsResponse(String id, TransferType type, String fromId, String toId,
                                      BigDecimal amount, Instant createdAt) {
    public static TransferDetailsResponse from(Transfer t) {
        return new TransferDetailsResponse(t.getId(), t.getType(), t.getFromAccountId(), t.getToAccountId(),
                t.getAmount(), t.getCreatedAt());
    }
}
