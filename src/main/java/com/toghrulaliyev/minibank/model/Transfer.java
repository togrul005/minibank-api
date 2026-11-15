package com.toghrulaliyev.minibank.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * One money movement (audit trail).
 * DEPOSIT has no fromAccountId, WITHDRAWAL has no toAccountId.
 */
@Entity
@Table(name = "transfers")
public class Transfer {

    @Id
    @Column(length = 36)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransferType type;

    @Column(name = "from_account_id", length = 32)
    private String fromAccountId;

    @Column(name = "to_account_id", length = 32)
    private String toAccountId;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Transfer() {
        // for JPA
    }

    private Transfer(TransferType type, String fromAccountId, String toAccountId, BigDecimal amount) {
        this.id = UUID.randomUUID().toString();
        this.type = type;
        this.fromAccountId = fromAccountId;
        this.toAccountId = toAccountId;
        this.amount = amount;
        this.createdAt = Instant.now();
    }

    public static Transfer transfer(String fromId, String toId, BigDecimal amount) {
        return new Transfer(TransferType.TRANSFER, fromId, toId, amount);
    }

    public static Transfer deposit(String accountId, BigDecimal amount) {
        return new Transfer(TransferType.DEPOSIT, null, accountId, amount);
    }

    public static Transfer withdrawal(String accountId, BigDecimal amount) {
        return new Transfer(TransferType.WITHDRAWAL, accountId, null, amount);
    }

    public String getId() { return id; }
    public TransferType getType() { return type; }
    public String getFromAccountId() { return fromAccountId; }
    public String getToAccountId() { return toAccountId; }
    public BigDecimal getAmount() { return amount; }
    public Instant getCreatedAt() { return createdAt; }
}
