package com.toghrulaliyev.minibank.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

/** Body for deposit / withdraw. */
public record AmountRequest(
        @NotNull @Positive @Digits(integer = 17, fraction = 2) BigDecimal amount
) {}
