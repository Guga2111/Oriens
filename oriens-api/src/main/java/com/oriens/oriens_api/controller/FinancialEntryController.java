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
    private final com.oriens.oriens_api.security.WorkOwner owner;

    @PostMapping("/user/{userId}/entries")
    public ResponseEntity<EntryDTO> createEntry(org.springframework.security.core.Authentication auth, @PathVariable Long userId, @Valid @RequestBody EntryDTO dto) {
        userId = owner.matching(auth,userId);
        return new ResponseEntity<>(financialEntryService.createEntry(dto, userId), HttpStatus.CREATED);
    }

    @GetMapping("/user/{userId}/entries/{id}")
    public ResponseEntity<EntryDTO> getEntry(org.springframework.security.core.Authentication auth, @PathVariable Long userId, @PathVariable Long id) {
        userId = owner.matching(auth,userId);
        return new ResponseEntity<>(financialEntryService.getEntry(id, userId), HttpStatus.OK);
    }

    @GetMapping("/user/{userId}/entries")
    public ResponseEntity<Page<EntryDTO>> getAllEntries(
            org.springframework.security.core.Authentication auth, @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "entryDate") String sortBy,
            @RequestParam(defaultValue = "DESC") String direction,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long tagId,
            @RequestParam(required = false) String search
    ) {
        userId = owner.matching(auth,userId);
        com.oriens.oriens_api.service.WorkReadService.interval(startDate,endDate);
        Sort.Direction sortDirection;
        try {sortDirection=Sort.Direction.fromString(direction);} catch(IllegalArgumentException e) {
            throw new com.oriens.oriens_api.exception.WorkDomainException("INVALID_REQUEST","direction","Ordenação inválida.");
        }
        Pageable pageable=WorkPagination.of(page,size,sortBy,sortDirection,500,"id","entryDate","amount","description","createdAt","updatedAt");
        Page<EntryDTO> entries=financialEntryService.filtered(userId,startDate,endDate,tagId,search,pageable);

        return ResponseEntity.ok(entries);
    }

    @PutMapping("/user/{userId}/entries/{id}")
    public ResponseEntity<EntryDTO> updateEntry(org.springframework.security.core.Authentication auth, @PathVariable Long userId, @PathVariable Long id, @Valid @RequestBody EntryDTO dto) {
        userId = owner.matching(auth,userId);
        return new ResponseEntity<>(financialEntryService.updateEntry(id, dto, userId), HttpStatus.OK);
    }

    @DeleteMapping("/user/{userId}/entries/{id}")
    public ResponseEntity<Void> deleteEntry(org.springframework.security.core.Authentication auth, @PathVariable Long userId, @PathVariable Long id) {
        userId = owner.matching(auth,userId);
        financialEntryService.deleteEntry(id, userId);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @GetMapping("/user/{userId}/entries/count")
    public ResponseEntity<Long> countEntries(org.springframework.security.core.Authentication auth, @PathVariable Long userId) {
        userId = owner.matching(auth,userId);
        long count = financialEntryService.countUserEntries(userId);
        return new ResponseEntity<>(count, HttpStatus.OK);
    }

    @GetMapping("/user/{userId}/entries/recurring")
    public ResponseEntity<List<EntryDTO>> getRecurringEntries(org.springframework.security.core.Authentication auth, @PathVariable Long userId) {
        userId = owner.matching(auth,userId);
        return ResponseEntity.ok(financialEntryService.getRecurringEntries(userId));
    }
}
