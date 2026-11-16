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
    @Query("select e from FinancialEntry e where e.userId=:owner " +
        "and (cast(:start as date) is null or e.entryDate>=:start) and (cast(:end as date) is null or e.entryDate<=:end) " +
        "and (:tag is null or e.tag.id=:tag) " +
        "and (cast(:search as string) is null or lower(e.description) like lower(concat('%',cast(:search as string),'%')))")
    Page<FinancialEntry> filtered(@Param("owner") Long owner,@Param("start") LocalDate start,@Param("end") LocalDate end,
        @Param("tag") Long tag,@Param("search") String search,Pageable pageable);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from FinancialEntry e where e.id=:id and e.userId=:owner")
    Optional<FinancialEntry> lockOwned(@Param("id") Long id,@Param("owner") Long owner);
    boolean existsByIdAndUserId(Long id,Long userId);
    boolean existsByParentEntryId(Long parentEntryId);
    @Query(value="select exists(select 1 from financial_occurrences where parent_entry_id=:parent)",nativeQuery=true)
    boolean hasOccurrences(@Param("parent") Long parent);


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
