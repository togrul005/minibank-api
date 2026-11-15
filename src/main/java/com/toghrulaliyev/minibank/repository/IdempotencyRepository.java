package com.toghrulaliyev.minibank.repository;

import com.toghrulaliyev.minibank.model.IdempotencyRecord;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IdempotencyRepository extends JpaRepository<IdempotencyRecord, String> {
}
