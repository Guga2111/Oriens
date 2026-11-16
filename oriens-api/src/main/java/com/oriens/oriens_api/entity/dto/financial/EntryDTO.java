package com.oriens.oriens_api.entity.dto.financial;
import com.oriens.oriens_api.entity.enums.RecurrencePattern;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class EntryDTO {

    private Long id;

    private long version;

    private BigDecimal amount;

    private LocalDate entryDate;

    private String description;

    private Long tagId;

    private Boolean isRecurring = false;

    private RecurrencePattern recurrencePattern;

    private LocalDate recurrenceEndDate;

    private Long parentEntryId;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}