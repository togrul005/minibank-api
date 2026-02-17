package com.toghrulaliyev.minibank.model;

import java.math.BigDecimal;
import java.util.Objects;

public final class Account {
    private final String id;
    private final BigDecimal balance;

    public Account(String id, BigDecimal balance) {
        if (id == null || id.isBlank()) throw new IllegalArgumentException("Account id must not be blank");
        if (balance == null) throw new IllegalArgumentException("Balance must not be null");
        if (balance.compareTo(BigDecimal.ZERO) < 0) throw new IllegalArgumentException("Balance must not be negative");
        this.id = id;
        this.balance = balance;
    }

    public String getId() {
        return id;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public Account withBalance(BigDecimal newBalance) {
        return new Account(this.id, newBalance);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Account account)) return false;
        return id.equals(account.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
