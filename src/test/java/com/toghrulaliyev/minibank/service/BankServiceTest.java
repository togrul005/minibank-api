package com.toghrulaliyev.minibank.service;

import com.toghrulaliyev.minibank.TestcontainersConfig;
import com.toghrulaliyev.minibank.error.ConflictException;
import com.toghrulaliyev.minibank.error.InsufficientFundsException;
import com.toghrulaliyev.minibank.error.NotFoundException;
import com.toghrulaliyev.minibank.model.TransferType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Integration tests against a real PostgreSQL (Testcontainers). */
@SpringBootTest
@Import(TestcontainersConfig.class)
class BankServiceTest {

    @Autowired
    BankService bank;

    private static String id(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    private static BigDecimal money(String v) {
        return new BigDecimal(v).setScale(2);
    }

    @Test
    void createAndGetAccount() {
        String a = id("A");
        bank.createAccount(a, new BigDecimal("100"));

        var acc = bank.getAccount(a);
        assertEquals(a, acc.getId());
        assertEquals(money("100"), acc.getBalance());
    }

    @Test
    void duplicateAccountIsRejected() {
        String a = id("A");
        bank.createAccount(a, new BigDecimal("100"));
        assertThrows(ConflictException.class, () -> bank.createAccount(a, new BigDecimal("5")));
    }

    @Test
    void transferMovesMoney() {
        String a = id("A"), b = id("B");
        bank.createAccount(a, new BigDecimal("100"));
        bank.createAccount(b, new BigDecimal("50"));

        var out = bank.transfer(a, b, new BigDecimal("30"), null);

        assertNotNull(out.transferId());
        assertEquals(money("70"), out.fromBalanceAfter());
        assertEquals(money("80"), out.toBalanceAfter());
        assertEquals(money("70"), bank.getAccount(a).getBalance());
        assertEquals(money("80"), bank.getAccount(b).getBalance());
    }

    @Test
    void insufficientFundsLeavesBalancesUnchanged() {
        String a = id("A"), b = id("B");
        bank.createAccount(a, new BigDecimal("10"));
        bank.createAccount(b, new BigDecimal("10"));

        assertThrows(InsufficientFundsException.class, () -> bank.transfer(a, b, new BigDecimal("11"), null));

        assertEquals(money("10"), bank.getAccount(a).getBalance());
        assertEquals(money("10"), bank.getAccount(b).getBalance());
    }

    @Test
    void transferToUnknownAccountIsNotFound() {
        String a = id("A");
        bank.createAccount(a, new BigDecimal("10"));
        assertThrows(NotFoundException.class, () -> bank.transfer(a, id("NOPE"), new BigDecimal("1"), null));
        assertEquals(money("10"), bank.getAccount(a).getBalance());
    }

    @Test
    void idempotencyKeyPreventsDoubleDebit() {
        String a = id("A"), b = id("B"), key = id("key");
        bank.createAccount(a, new BigDecimal("100"));
        bank.createAccount(b, new BigDecimal("50"));

        var first = bank.transfer(a, b, new BigDecimal("30"), key);
        var second = bank.transfer(a, b, new BigDecimal("30.00"), key);

        assertEquals(first.transferId(), second.transferId());
        assertEquals(first.fromBalanceAfter(), second.fromBalanceAfter());
        assertEquals(money("70"), bank.getAccount(a).getBalance());
        assertEquals(money("80"), bank.getAccount(b).getBalance());
    }

    @Test
    void idempotencyKeyReusedForDifferentRequestIsConflict() {
        String a = id("A"), b = id("B"), key = id("key");
        bank.createAccount(a, new BigDecimal("100"));
        bank.createAccount(b, new BigDecimal("50"));

        bank.transfer(a, b, new BigDecimal("30"), key);

        assertThrows(ConflictException.class, () -> bank.transfer(a, b, new BigDecimal("40"), key));
        assertEquals(money("70"), bank.getAccount(a).getBalance());
    }

    /** The old in-memory version could move money twice here. */
    @Test
    void sameKeyConcurrently_movesMoneyOnlyOnce() throws Exception {
        String a = id("A"), b = id("B"), key = id("key");
        bank.createAccount(a, new BigDecimal("1000"));
        bank.createAccount(b, new BigDecimal("0.01"));

        int threads = 8;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        List<String> ids = Collections.synchronizedList(new ArrayList<>());
        List<Throwable> failures = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    ids.add(bank.transfer(a, b, new BigDecimal("100"), key).transferId());
                } catch (Throwable t) {
                    failures.add(t);
                }
            });
        }
        start.countDown();
        pool.shutdown();
        assertTrue(pool.awaitTermination(60, TimeUnit.SECONDS));

        assertTrue(failures.isEmpty(), "unexpected failures: " + failures);
        Set<String> distinct = ids.stream().collect(Collectors.toSet());
        assertEquals(1, distinct.size(), "all retries must return the same transfer");
        assertEquals(money("900"), bank.getAccount(a).getBalance());
    }

    @Test
    void concurrentTransfers_doNotLoseMoney() throws Exception {
        String a = id("A"), b = id("B");
        bank.createAccount(a, new BigDecimal("1000"));
        bank.createAccount(b, new BigDecimal("1000"));

        int threads = 8;
        int transfersPerThread = 25;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        List<Throwable> failures = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threads; i++) {
            boolean aToB = i % 2 == 0;
            pool.submit(() -> {
                try {
                    start.await();
                    for (int j = 0; j < transfersPerThread; j++) {
                        if (aToB) bank.transfer(a, b, BigDecimal.ONE, null);
                        else bank.transfer(b, a, BigDecimal.ONE, null);
                    }
                } catch (Throwable t) {
                    failures.add(t);
                }
            });
        }
        start.countDown();
        pool.shutdown();
        assertTrue(pool.awaitTermination(120, TimeUnit.SECONDS));

        assertTrue(failures.isEmpty(), "unexpected failures: " + failures);
        BigDecimal total = bank.getAccount(a).getBalance().add(bank.getAccount(b).getBalance());
        assertEquals(money("2000"), total);
    }

    @Test
    void depositAndWithdrawShowUpInHistory() {
        String a = id("A");
        bank.createAccount(a, new BigDecimal("100"));

        assertEquals(money("150"), bank.deposit(a, new BigDecimal("50")).balanceAfter());
        assertEquals(money("130"), bank.withdraw(a, new BigDecimal("20")).balanceAfter());
        assertThrows(InsufficientFundsException.class, () -> bank.withdraw(a, new BigDecimal("1000")));

        var history = bank.getTransfersForAccount(a,
                PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt", "id")));
        assertEquals(2, history.getTotalElements());
        assertEquals(TransferType.WITHDRAWAL, history.getContent().get(0).getType());
        assertEquals(TransferType.DEPOSIT, history.getContent().get(1).getType());
    }

    @Test
    void moreThanTwoDecimalsIsRejected() {
        String a = id("A");
        assertThrows(IllegalArgumentException.class, () -> bank.createAccount(a, new BigDecimal("1.001")));
    }
}
