CREATE TABLE accounts (
    id          VARCHAR(32)    PRIMARY KEY,
    balance     NUMERIC(19, 2) NOT NULL CHECK (balance >= 0),
    version     BIGINT         NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ    NOT NULL
);

-- One table for every money movement: TRANSFER, DEPOSIT, WITHDRAWAL
CREATE TABLE transfers (
    id               VARCHAR(36)    PRIMARY KEY,
    type             VARCHAR(20)    NOT NULL,
    from_account_id  VARCHAR(32)    REFERENCES accounts (id),
    to_account_id    VARCHAR(32)    REFERENCES accounts (id),
    amount           NUMERIC(19, 2) NOT NULL CHECK (amount > 0),
    created_at       TIMESTAMPTZ    NOT NULL
);

CREATE INDEX idx_transfers_from ON transfers (from_account_id, created_at DESC);
CREATE INDEX idx_transfers_to   ON transfers (to_account_id, created_at DESC);

-- The PRIMARY KEY on idempotency_key is what makes retries safe:
-- two requests with the same key can never both commit.
CREATE TABLE idempotency_keys (
    idempotency_key     VARCHAR(100)   PRIMARY KEY,
    request_hash        VARCHAR(200)   NOT NULL,
    transfer_id         VARCHAR(36)    NOT NULL REFERENCES transfers (id),
    from_balance_after  NUMERIC(19, 2) NOT NULL,
    to_balance_after    NUMERIC(19, 2) NOT NULL,
    created_at          TIMESTAMPTZ    NOT NULL
);
