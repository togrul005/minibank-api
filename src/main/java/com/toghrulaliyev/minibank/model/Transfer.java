package com.toghrulaliyev.minibank.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public final class Transfer {
    private final String id;
    private final String fromId;
    private final String toId;
    private final BigDecimal amount;
    private final Instant createdAt;

    public Transfer(String fromId, String toId, BigDecimal amount) {
        this.id = UUID.randomUUID().toString();
        this.fromId = fromId;
        this.toId = toId;
        this.amount = amount;
        this.createdAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public String getFromId() {
        return fromId;
    }

    public String getToId() {
        return toId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
