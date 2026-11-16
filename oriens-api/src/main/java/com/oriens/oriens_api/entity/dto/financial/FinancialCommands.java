package com.oriens.oriens_api.entity.dto.financial;

import com.fasterxml.jackson.annotation.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.oriens.oriens_api.entity.dto.work.PatchFields;
import com.oriens.oriens_api.entity.enums.RecurrencePattern;
import com.oriens.oriens_api.exception.WorkDomainException;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/** Input contains only editable state. Patch's map preserves absent versus explicit null in receipts. */
public final class FinancialCommands {
    private FinancialCommands() {}
    public record Input(
        @NotNull @DecimalMin("-9999999999.99") @DecimalMax("9999999999.99") @Digits(integer=10,fraction=2) BigDecimal amount,
        @NotNull LocalDate entryDate, @Size(max=255) String description,
        @NotNull @Positive Long tagId, @NotNull Boolean isRecurring,
        RecurrencePattern recurrencePattern, LocalDate recurrenceEndDate) {}
    public static final class Patch extends PatchFields {
        private final Map<String,JsonNode> values=new LinkedHashMap<>();
        @JsonAnySetter public void set(String name,JsonNode value) {
            if(!Set.of("amount","entryDate","description","tagId","isRecurring","recurrencePattern","recurrenceEndDate").contains(name))
                throw new WorkDomainException("INVALID_REQUEST",name,"Campo não editável.");
            supplied(name);values.put(name,value);
        }
        @JsonAnyGetter public Map<String,JsonNode> values() { return Collections.unmodifiableMap(values); }
    }
    public sealed interface Command permits Create,Replace,Update,Delete {}
    public record Create(Input input) implements Command {}
    public record Replace(Long entryId,Long expectedVersion,Input input) implements Command {}
    public record Update(Long entryId,Long expectedVersion,Patch patch) implements Command {}
    public record Delete(Long entryId,Long expectedVersion) implements Command {}
}
