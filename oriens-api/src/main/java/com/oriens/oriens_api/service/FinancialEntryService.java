package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.dto.financial.EntryDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

public interface FinancialEntryService {
      EntryDTO createEntry (EntryDTO entryDTO, Long userId);
      EntryDTO getEntry (Long id, Long userId);
      Page<EntryDTO> getEntries (Long userId, Pageable pageable);
      Page<EntryDTO> getEntriesByPeriod (Long userId, LocalDate startDate, LocalDate endDate, Pageable pageable);
      Page<EntryDTO> getEntriesByTag (Long userId, Long tagId, Pageable pageable);
      Page<EntryDTO> searchEntriesByDescription (Long userId, String description, Pageable pageable);
      EntryDTO updateEntry (Long entryId, EntryDTO entryDTO, Long userId);
      void deleteEntry (Long entryId, Long userId);

      long countUserEntries (Long userId);

      List<EntryDTO> getRecurringEntries(Long userId);
}
