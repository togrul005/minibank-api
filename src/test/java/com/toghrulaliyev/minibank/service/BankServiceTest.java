package com.toghrulaliyev.minibank.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class BankServiceTest {

    @Test
    void createAndGetAccount() {
        BankService bank = new BankService();
        bank.createAccount("A", new BigDecimal("100"));

        var a = bank.getAccount("A");
        assertEquals("A", a.getId());
        assertEquals(new BigDecimal("100"), a.getBalance());
    }

    @Test
    void transferMovesMoney() {
        BankService bank = new BankService();
        bank.createAccount("A", new BigDecimal("100"));
        bank.createAccount("B", new BigDecimal("50"));

        var out = bank.transfer("A", "B", new BigDecimal("30"), null);

        assertEquals(new BigDecimal("70"), bank.getAccount("A").getBalance());
        assertEquals(new BigDecimal("80"), bank.getAccount("B").getBalance());
        assertEquals(new BigDecimal("30"), out.amount());
        assertNotNull(out.transferId());
    }

    @Test
    void idempotencyKeyPreventsDoubleDebit() {
        BankService bank = new BankService();
        bank.createAccount("A", new BigDecimal("100"));
        bank.createAccount("B", new BigDecimal("50"));

        var first = bank.transfer("A", "B", new BigDecimal("30"), "key-1");
        var second = bank.transfer("A", "B", new BigDecimal("30"), "key-1");

        assertEquals(first.transferId(), second.transferId());
        assertEquals(new BigDecimal("70"), bank.getAccount("A").getBalance());
        assertEquals(new BigDecimal("80"), bank.getAccount("B").getBalance());
    }
}
