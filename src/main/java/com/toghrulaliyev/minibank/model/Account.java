package com.toghrulaliyev.minibank.model;

import com.toghrulaliyev.minibank.error.InsufficientFundsException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "accounts")
public class Account {

    @Id
    @Column(length = 32)
    private String id;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal balance;

    /** Optimistic-locking safety net: Hibernate increments it on every update. */
    @Version
    @Column(nullable = false)
    private Long version;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Account() {
        // for JPA
    }

    public Account(String id, BigDecimal initialBalance) {
        if (id == null || id.isBlank()) throw new IllegalArgumentException("Account id must not be blank");
        if (initialBalance == null || initialBalance.signum() < 0) {
            throw new IllegalArgumentException("Balance must not be negative");
        }
        this.id = id;
        this.balance = money(initialBalance);
        this.createdAt = Instant.now();
    }

    public void deposit(BigDecimal amount) {
        balance = money(balance.add(amount));
    }

    public void withdraw(BigDecimal amount) {
        if (balance.compareTo(amount) < 0) {
            throw new InsufficientFundsException(id);
        }
        balance = money(balance.subtract(amount));
    }

    private static BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.UNNECESSARY);
    }

    public String getId() { return id; }
    public BigDecimal getBalance() { return balance; }
    public Long getVersion() { return version; }
    public Instant getCreatedAt() { return createdAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Account other)) return false;
        return Objects.equals(id, other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
