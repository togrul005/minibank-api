package com.toghrulaliyev.minibank.dto;

import com.toghrulaliyev.minibank.model.Account;

import java.math.BigDecimal;
import java.time.Instant;

public record AccountResponse(String id, BigDecimal balance, Instant createdAt) {
    public static AccountResponse from(Account a) {
        return new AccountResponse(a.getId(), a.getBalance(), a.getCreatedAt());
    }
}
