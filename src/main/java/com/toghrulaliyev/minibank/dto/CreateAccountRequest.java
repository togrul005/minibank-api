package com.toghrulaliyev.minibank.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreateAccountRequest(
        @NotBlank @Size(max = 32) String id,
        @NotNull @Positive @Digits(integer = 17, fraction = 2) BigDecimal initialBalance
) {}
