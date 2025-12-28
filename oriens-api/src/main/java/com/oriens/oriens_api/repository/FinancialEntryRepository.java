package com.oriens.oriens_api.repository;

import com.oriens.oriens_api.entity.FinancialEntry;
import com.oriens.oriens_api.entity.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface FinancialEntryRepository extends CrudRepository<FinancialEntry, Long> {
    Page<FinancialEntry> findByUserId(Long userId, Pageable pageable);
    Optional<FinancialEntry> findByIdAndUserId(Long id, Long userId);

    Page<FinancialEntry> findByUserIdAndEntryDateBetween(
            Long userId,
            LocalDate startDate,
            LocalDate endDate,
            Pageable pageable
    );

    // filter by tag
    Page<FinancialEntry> findByUserIdAndTag(
            Long userId,
            Tag tag,
            Pageable pageable
    );

    // filter by tag and period
    Page<FinancialEntry> findByUserIdAndTagAndEntryDateBetween(
            Long userId,
            Tag tag,
            LocalDate startDate,
            LocalDate endDate,
            Pageable pageable
    );

    // filter by description search
    Page<FinancialEntry> findByUserIdAndDescriptionContainingIgnoreCase(
            Long userId,
            String search,
            Pageable pageable
    );

    // searching by period without pagination
    List<FinancialEntry> findByUserIdAndEntryDateBetween(
            Long userId,
            LocalDate startDate,
            LocalDate endDate
    );

    // inbounds amount
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM FinancialEntry e " +
            "WHERE e.userId = :userId " +
            "AND e.entryDate BETWEEN :startDate AND :endDate " +
            "AND e.amount > 0")
    BigDecimal sumIncomeByUserIdAndPeriod(
            @Param("userId") Long userId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    // cost amount
    @Query("SELECT COALESCE(ABS(SUM(e.amount)), 0) FROM FinancialEntry e " +
            "WHERE e.userId = :userId " +
            "AND e.entryDate BETWEEN :startDate AND :endDate " +
            "AND e.amount < 0")
    BigDecimal sumExpensesByUserIdAndPeriod(
            @Param("userId") Long userId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    long countByUserId(Long userId);
    long countByUserIdAndTag(Long userId, Tag tag);
}
