package com.oriens.oriens_api.repository;

import com.oriens.oriens_api.entity.FinancialEntry;
import com.oriens.oriens_api.entity.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface FinancialEntryRepository extends JpaRepository<FinancialEntry, Long> {
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

    @Query("""
        SELECT fe FROM FinancialEntry fe
        WHERE fe.isRecurring = true
        AND fe.parentEntryId IS NULL
        AND (fe.recurrenceEndDate IS NULL OR fe.recurrenceEndDate >= :currentDate)
        AND NOT EXISTS (
            SELECT 1 FROM FinancialEntry child
            WHERE child.parentEntryId = fe.id
            AND child.entryDate = :nextExecutionDate
        )
        AND fe.entryDate <= :nextExecutionDate
        ORDER BY fe.entryDate ASC
        """)
    List<FinancialEntry> findRecurringEntriesToProcess(
            @Param("currentDate") LocalDate currentDate,
            @Param("nextExecutionDate") LocalDate nextExecutionDate
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

    // Buscar entradas recorrentes do usuário (apenas parent entries)
    List<FinancialEntry> findByUserIdAndIsRecurringTrueAndParentEntryIdIsNull(Long userId);
}
