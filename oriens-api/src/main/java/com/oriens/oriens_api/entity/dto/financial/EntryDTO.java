package com.oriens.oriens_api.entity.dto.financial;
import com.oriens.oriens_api.entity.enums.RecurrencePattern;
import jakarta.validation.constraints.*;
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

    @NotNull(message = "Valor é obrigatório")
    @DecimalMin(value = "-999999999.99", message = "Valor mínimo excedido")
    @DecimalMax(value = "999999999999.99", message = "Valor máximo excedido")
    private BigDecimal amount;

    @NotNull(message = "Data é obrigatória")
    private LocalDate entryDate;

    @Size(max = 255, message = "Descrição deve ter no máximo 255 caracteres")
    private String description;

    private Long tagId;

    @NotNull(message = "Campo 'isRecurring' é obrigatório")
    private Boolean isRecurring = false;

    private RecurrencePattern recurrencePattern;

    private LocalDate recurrenceEndDate;

    private Long parentEntryId;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}