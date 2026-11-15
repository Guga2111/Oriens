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
    @DecimalMin(value = "-9999999999.99", message = "Valor mínimo excedido")
    @DecimalMax(value = "9999999999.99", message = "Valor máximo excedido")
    @Digits(integer=10, fraction=2, message="Use um valor com até duas casas decimais")
    private BigDecimal amount;

    @NotNull(message = "Data é obrigatória")
    private LocalDate entryDate;

    @Size(max = 255, message = "Descrição deve ter no máximo 255 caracteres")
    private String description;

    @NotNull(message="Escolha uma categoria")
    private Long tagId;

    @NotNull(message = "Campo 'isRecurring' é obrigatório")
    private Boolean isRecurring = false;

    private RecurrencePattern recurrencePattern;

    private LocalDate recurrenceEndDate;

    private Long parentEntryId;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}