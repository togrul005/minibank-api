package com.toghrulaliyev.minibank.error;

/** Mapped to HTTP 409 - e.g. duplicate account or reused Idempotency-Key. */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
