package com.toghrulaliyev.minibank.error;

/** Mapped to HTTP 422 - the request is valid, but the balance is too low. */
public class InsufficientFundsException extends RuntimeException {
    public InsufficientFundsException(String accountId) {
        super("Insufficient funds in account: " + accountId);
    }
}
