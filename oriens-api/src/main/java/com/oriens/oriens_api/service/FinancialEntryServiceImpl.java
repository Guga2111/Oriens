package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.FinancialEntry;
import com.oriens.oriens_api.entity.Tag;
import com.oriens.oriens_api.entity.dto.financial.EntryDTO;
import com.oriens.oriens_api.exception.BusinessException;
import com.oriens.oriens_api.exception.EntryNotFoundException;
import com.oriens.oriens_api.exception.TagNotFoundException;
import com.oriens.oriens_api.mapper.FinancialMapper;
import com.oriens.oriens_api.repository.FinancialEntryRepository;
import com.oriens.oriens_api.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class FinancialEntryServiceImpl implements FinancialEntryService {

    private final FinancialEntryRepository financialEntryRepository;
    private final TagRepository tagRepository;
    private final FinancialMapper financialMapper;

    @Override
    @Transactional
    public EntryDTO createEntry(EntryDTO entryDTO, Long userId) {

        Tag tag = tagRepository.findByUserIdAndId(userId, entryDTO.getTagId())
                        .orElseThrow(() -> new TagNotFoundException(entryDTO.getId()));

        if (!tag.getAllowNegative() && entryDTO.getAmount().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException(String.format("Tag '%s' não permite valores negativos", tag.getName()));
        }

        FinancialEntry entry = financialMapper.toEntity(entryDTO, userId, tag);
        FinancialEntry entrySaved = financialEntryRepository.save(entry);
        return financialMapper.toDTO(entrySaved);
    }

    @Override
    public EntryDTO getEntry(Long id, Long userId) {
        FinancialEntry financialEntry = financialEntryRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new EntryNotFoundException(id));

        return financialMapper.toDTO(financialEntry);
    }

    @Override
    public Page<EntryDTO> getEntries(Long userId, Pageable pageable) {
        Page<FinancialEntry> entryPage = financialEntryRepository.findByUserId(userId, pageable);

        return entryPage.map(financialMapper::toDTO);
    }

    @Override
    public Page<EntryDTO> getEntriesByPeriod(Long userId, LocalDate startDate, LocalDate endDate, Pageable pageable) {
        Page<FinancialEntry> entryPage = financialEntryRepository.findByUserIdAndEntryDateBetween(userId, startDate, endDate, pageable);

        return entryPage.map(financialMapper::toDTO);
    }

    @Override
    public Page<EntryDTO> getEntriesByTag(Long userId, Long tagId, Pageable pageable) {
        Tag tag = tagRepository.findByUserIdAndId(userId, tagId)
                .orElseThrow(() -> new TagNotFoundException(tagId));

        Page<FinancialEntry> entryPage = financialEntryRepository.findByUserIdAndTag(userId, tag, pageable);

        return entryPage.map(financialMapper::toDTO);
    }

    @Override
    public Page<EntryDTO> searchEntriesByDescription(Long userId, String description, Pageable pageable) {
        Page<FinancialEntry> entryPage = financialEntryRepository.findByUserIdAndDescriptionContainingIgnoreCase(userId, description, pageable);

        return entryPage.map(financialMapper::toDTO);
    }

    @Override
    @Transactional
    public EntryDTO updateEntry(Long entryId, EntryDTO entryDTO, Long userId) {
        FinancialEntry entry = financialEntryRepository.findByIdAndUserId(entryId, userId)
                .orElseThrow(() -> new EntryNotFoundException(entryId));

        Tag tag = tagRepository.findByUserIdAndId(userId, entryDTO.getTagId())
                        .orElseThrow(() -> new TagNotFoundException(entryDTO.getTagId()));

        financialMapper.updateEntity(entry, entryDTO, tag);

        FinancialEntry updatedEntry = financialEntryRepository.save(entry);

        return financialMapper.toDTO(updatedEntry);
    }

    @Override
    @Transactional
    public void deleteEntry(Long entryId, Long userId) {
        FinancialEntry entry = financialEntryRepository.findByIdAndUserId(entryId, userId)
                .orElseThrow(() -> new EntryNotFoundException(entryId));

        financialEntryRepository.delete(entry);
    }

    @Override
    public long countUserEntries(Long userId) {
        return financialEntryRepository.countByUserId(userId);
    }
}
