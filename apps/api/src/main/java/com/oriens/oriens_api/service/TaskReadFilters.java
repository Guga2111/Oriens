package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.dto.work.WorkResponses.TaskView;
import com.oriens.oriens_api.entity.enums.Priority;
import com.oriens.oriens_api.entity.enums.Status;
import com.oriens.oriens_api.exception.WorkDomainException;

import java.time.LocalDate;
import java.util.EnumSet;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

public record TaskReadFilters(Set<Status> statuses, Set<Priority> priorities, String search, Long labelId,
        String dateField, LocalDate startDate, LocalDate endDate) {
    public TaskReadFilters {
        statuses = validatedValues(statuses, "status");
        priorities = validatedValues(priorities, "priority");
        search = search == null || search.isBlank() ? null : search.strip();
    }

    private static <T> Set<T> validatedValues(Set<T> values, String field) {
        if (values == null) return Set.of();
        if (values.stream().anyMatch(Objects::isNull))
            throw new WorkDomainException("INVALID_REQUEST", field, "Informe apenas valores válidos.");
        return Set.copyOf(values);
    }

    public void validateDateField() {
        WorkReadService.interval(startDate, endDate);
        if (dateField == null) {
            if (startDate != null || endDate != null)
                throw new WorkDomainException("INVALID_REQUEST", "dateField", "Informe qual data filtrar.");
        } else if (!Set.of("plannedDate", "dueDate").contains(dateField)) {
            throw new WorkDomainException("INVALID_REQUEST", "dateField", "Campo de data inválido.");
        }
    }

    public Set<Status> statusesOrAll() {
        return statuses.isEmpty() ? EnumSet.allOf(Status.class) : statuses;
    }

    public Set<Priority> prioritiesOrAll() {
        return priorities.isEmpty() ? EnumSet.allOf(Priority.class) : priorities;
    }

    public boolean isActive() {
        return !statuses.isEmpty() || !priorities.isEmpty() || search != null || labelId != null || hasDateBounds();
    }

    public boolean matches(TaskView task) {
        return (statuses.isEmpty() || statuses.contains(task.status()))
            && (priorities.isEmpty() || priorities.contains(task.priority()))
            && (labelId == null || task.labels().stream().anyMatch(label -> labelId.equals(label.id())))
            && matchesText(task)
            && matchesDate(task);
    }

    private boolean matchesText(TaskView task) {
        if (search == null) return true;
        String term = search.toLowerCase(Locale.ROOT);
        return contains(task.title(), term) || contains(task.description(), term);
    }

    private static boolean contains(String text, String term) {
        return text != null && text.toLowerCase(Locale.ROOT).contains(term);
    }

    private boolean hasDateBounds() {
        return dateField != null && (startDate != null || endDate != null);
    }

    private boolean matchesDate(TaskView task) {
        if (!hasDateBounds()) return true;
        LocalDate date = "plannedDate".equals(dateField) ? task.plannedDate() : task.dueDate();
        return date != null && (startDate == null || !date.isBefore(startDate)) && (endDate == null || !date.isAfter(endDate));
    }
}
