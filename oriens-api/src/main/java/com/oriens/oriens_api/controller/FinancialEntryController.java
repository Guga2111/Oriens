package com.oriens.oriens_api.controller;

import com.oriens.oriens_api.entity.dto.financial.EntryDTO;
import com.oriens.oriens_api.service.FinancialEntryServiceImpl;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@AllArgsConstructor
@RequestMapping("/financial")
public class FinancialEntryController {

    private final FinancialEntryServiceImpl financialEntryService;

    @PostMapping("/user/{userId}/entries")
    public ResponseEntity<EntryDTO> createEntry(@PathVariable Long userId, @Valid @RequestBody EntryDTO dto) {
        return new ResponseEntity<>(financialEntryService.createEntry(dto, userId), HttpStatus.CREATED);
    }

    @GetMapping("/user/{userId}/entries/{id}")
    public ResponseEntity<EntryDTO> getEntry(@PathVariable Long userId, @PathVariable Long id) {
        return new ResponseEntity<>(financialEntryService.getEntry(id, userId), HttpStatus.OK);
    }

    @GetMapping("/user/{userId}/entries")
    public ResponseEntity<Page<EntryDTO>> getAllEntries(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "entryDate") String sortBy,
            @RequestParam(defaultValue = "DESC") String direction,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long tagId,
            @RequestParam(required = false) String search
    ) {
        Sort.Direction sortDirection = direction.equalsIgnoreCase("ASC")
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, sortBy));

        Page<EntryDTO> entries;

        if (search != null && !search.isBlank()) {
            entries = financialEntryService.searchEntriesByDescription(userId, search, pageable);
        } else if (tagId != null) {
            entries = financialEntryService.getEntriesByTag(userId, tagId, pageable);
        } else if (startDate != null && endDate != null) {
            entries = financialEntryService.getEntriesByPeriod(userId, startDate, endDate, pageable);
        } else {
            entries = financialEntryService.getEntries(userId, pageable);
        }

        return ResponseEntity.ok(entries);
    }

    @PutMapping("/user/{userId}/entries/{id}")
    public ResponseEntity<EntryDTO> updateEntry(@PathVariable Long userId, @PathVariable Long id, @Valid @RequestBody EntryDTO dto) {
        return new ResponseEntity<>(financialEntryService.updateEntry(id, dto, userId), HttpStatus.OK);
    }

    @DeleteMapping("/user/{userId}/entries/{id}")
    public ResponseEntity<Void> deleteEntry(@PathVariable Long userId, @PathVariable Long id) {
        financialEntryService.deleteEntry(id, userId);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @GetMapping("/user/{userId}/entries/count")
    public ResponseEntity<Long> countEntries(@PathVariable Long userId) {
        long count = financialEntryService.countUserEntries(userId);
        return new ResponseEntity<>(count, HttpStatus.OK);
    }

    @GetMapping("/user/{userId}/entries/recurring")
    public ResponseEntity<List<EntryDTO>> getRecurringEntries(@PathVariable Long userId) {
        return ResponseEntity.ok(financialEntryService.getRecurringEntries(userId));
    }
}
