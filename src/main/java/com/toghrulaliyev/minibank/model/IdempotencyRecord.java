package com.toghrulaliyev.minibank.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import org.springframework.data.domain.Persistable;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Remembers which transfer an Idempotency-Key produced, so retries return the same result.
 * <p>
 * Implements {@link Persistable} so that save() always does a plain INSERT.
 * Without it, Spring Data would MERGE (select + update) and a second request with the
 * same key would silently overwrite the first record instead of failing on the primary key.
 */
@Entity
@Table(name = "idempotency_keys")
public class IdempotencyRecord implements Persistable<String> {

    @Id
    @Column(name = "idempotency_key", length = 100)
    private String key;

    /** Fingerprint of the request (from|to|amount) - detects a key reused for a different request. */
    @Column(name = "request_hash", nullable = false, length = 200)
    private String requestHash;

    @Column(name = "transfer_id", nullable = false, length = 36)
    private String transferId;

    @Column(name = "from_balance_after", nullable = false, precision = 19, scale = 2)
    private BigDecimal fromBalanceAfter;

    @Column(name = "to_balance_after", nullable = false, precision = 19, scale = 2)
    private BigDecimal toBalanceAfter;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Transient
    private boolean isNew = true;

    protected IdempotencyRecord() {
        // for JPA
    }

    public IdempotencyRecord(String key, String requestHash, String transferId,
                             BigDecimal fromBalanceAfter, BigDecimal toBalanceAfter) {
        this.key = key;
        this.requestHash = requestHash;
        this.transferId = transferId;
        this.fromBalanceAfter = fromBalanceAfter;
        this.toBalanceAfter = toBalanceAfter;
        this.createdAt = Instant.now();
    }

    @Override
    public String getId() { return key; }

    @Override
    public boolean isNew() { return isNew; }

    @PostLoad
    @PostPersist
    void markNotNew() { this.isNew = false; }

    public String getKey() { return key; }
    public String getRequestHash() { return requestHash; }
    public String getTransferId() { return transferId; }
    public BigDecimal getFromBalanceAfter() { return fromBalanceAfter; }
    public BigDecimal getToBalanceAfter() { return toBalanceAfter; }
    public Instant getCreatedAt() { return createdAt; }
}
