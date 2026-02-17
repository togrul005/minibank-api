package com.toghrulaliyev.minibank.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.assertEquals;

class BankServiceConcurrencyTest {

    @Test
    void concurrentTransfers_doNotLoseMoney() throws Exception {
        BankService bank = new BankService();

        bank.createAccount("A", new BigDecimal("1000"));
        bank.createAccount("B", new BigDecimal("1000"));

        int threads = 20;
        int transfersPerThread = 200;
        BigDecimal amount = new BigDecimal("1");

        var pool = Executors.newFixedThreadPool(threads);
        CountDownLatch startGun = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);

        List<Exception> failures = new ArrayList<>();

        for (int i = 0; i < threads; i++) {
            boolean aToB = (i % 2 == 0);
            pool.submit(() -> {
                try {
                    startGun.await();

                    for (int j = 0; j < transfersPerThread; j++) {
                        if (aToB) {
                            bank.transfer("A", "B", amount, null);
                        } else {
                            bank.transfer("B", "A", amount, null);
                        }
                    }
                } catch (Exception ex) {
                    synchronized (failures) {
                        failures.add(ex);
                    }
                } finally {
                    done.countDown();
                }
            });
        }

        startGun.countDown();
        done.await();
        pool.shutdownNow();

        // no unexpected exceptions
        assertEquals(0, failures.size());

        // total money preserved
        BigDecimal total = bank.getAccount("A").getBalance().add(bank.getAccount("B").getBalance());
        assertEquals(new BigDecimal("2000"), total);
    }
}
