package com.oriens.oriens_api.entity;

import com.oriens.oriens_api.entity.enums.RecurrencePattern;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "financial_entry", indexes = {
        @Index(name = "idx_is_recurring", columnList = "is_recurring"),
        @Index(name = "idx_parent_entry", columnList = "parent_entry_id")
})
public class FinancialEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate; // insert post data (entries of monday being inserted on friday for an example)

    @Column(name = "description", nullable = false)
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tag_id", nullable = false)
    private Tag tag;

    @Column(name = "is_recurring", nullable = false)
    private Boolean isRecurring = false;

    @Column(name = "recurrence_pattern")
    @Enumerated(EnumType.STRING)
    private RecurrencePattern recurrencePattern;

    @Column(name = "recurrence_end_date")
    private LocalDate recurrenceEndDate;

    @Column(name = "parent_entry_id")
    private Long parentEntryId;

    @PreUpdate
    protected void onUpdate () {
        updatedAt = LocalDateTime.now();
    }

    public boolean isExpense () {
        return amount.compareTo(BigDecimal.ZERO) < 0;
    }

    public boolean isIncome () {
        return amount.compareTo(BigDecimal.ZERO) > 0;
    }
}
