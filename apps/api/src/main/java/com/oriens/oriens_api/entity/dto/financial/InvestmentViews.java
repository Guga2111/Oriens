package com.oriens.oriens_api.entity.dto.financial;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Manual portfolio contract. Money travels as decimal strings, never binary floats. */
public final class InvestmentViews {
    private InvestmentViews() {}

    public enum AssetClass { FIXED_INCOME, STOCKS, REAL_ESTATE_FUNDS, OTHER }
    public enum MovementType { CONTRIBUTION, WITHDRAWAL, INCOME }
    /** VALUED: latest valuation, no later contribution/withdrawal. ESTIMATED: adjusted by later ones.
     * NEEDS_VALUATION: the estimate went negative. UNAVAILABLE: no valuation at all. */
    public enum PositionStatus { VALUED, ESTIMATED, NEEDS_VALUATION, UNAVAILABLE }

    public record Create(@NotBlank @Size(max=120) String name, @NotNull AssetClass assetClass,
                         @NotNull @DecimalMin("0.00") @DecimalMax("9999999999.99") @Digits(integer=10,fraction=2) BigDecimal initialValue,
                         @NotNull LocalDate valuedOn) {}
    /** Absent fields keep their value; at least one is required. */
    public record Patch(@Size(max=120) String name, AssetClass assetClass) {}
    public record ValuationInput(@NotNull @DecimalMin("0.00") @DecimalMax("9999999999.99") @Digits(integer=10,fraction=2) BigDecimal amount,
                                 @NotNull LocalDate valuedOn) {}
    public record MovementInput(@NotNull MovementType type,
                                @NotNull @DecimalMin("0.01") @DecimalMax("9999999999.99") @Digits(integer=10,fraction=2) BigDecimal amount,
                                @NotNull LocalDate occurredOn, @Size(max=255) String description) {}

    public record Valuation(Long id, Long investmentId, @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal amount,
                            LocalDate valuedOn, long version, LocalDateTime createdAt) {}
    public record Investment(Long id, String name, AssetClass assetClass, long version,
                             @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal position, PositionStatus positionStatus,
                             Valuation lastValuation, LocalDateTime createdAt) {}
    public record Movement(Long id, Long investmentId, MovementType type, @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal amount,
                           LocalDate occurredOn, String description, Long entryId, long version, LocalDateTime createdAt) {}
    public record ClassTotal(AssetClass assetClass, @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal total, long investments) {}
    /** {@code total} covers {@code covered} of {@code investments}; it is partial when they differ. */
    public record Summary(@JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal total, long covered, long investments,
                          @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal netContributions,
                          @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal incomeReceived, List<ClassTotal> composition) {}
}
