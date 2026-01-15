package com.oriens.oriens_api.mapper;

import com.oriens.oriens_api.entity.FinancialEntry;
import com.oriens.oriens_api.entity.Tag;
import com.oriens.oriens_api.entity.dto.financial.EntryDTO;
import com.oriens.oriens_api.entity.dto.financial.TagDTO;
import org.springframework.stereotype.Component;

@Component
public class FinancialMapper {


    public TagDTO toDTO(Tag tag) {
        TagDTO dto = new TagDTO();
        dto.setId(tag.getId());
        dto.setName(tag.getName());
        dto.setColor(tag.getColor());
        dto.setIsDefault(tag.getIsDefault());
        dto.setCreatedAt(tag.getCreatedAt());
        return dto;
    }

    public Tag toEntity(TagDTO dto, Long userId) {
        Tag tag = new Tag();
        tag.setUserId(userId);
        tag.setName(dto.getName());
        tag.setColor(dto.getColor());
        tag.setIsDefault(false);
        return tag;
    }

    public void updateEntity(Tag tag, TagDTO dto) {
        tag.setName(dto.getName());
        tag.setColor(dto.getColor());
    }
    public EntryDTO toDTO(FinancialEntry entry) {
        EntryDTO dto = new EntryDTO();
        dto.setId(entry.getId());
        dto.setAmount(entry.getAmount());
        dto.setEntryDate(entry.getEntryDate());
        dto.setDescription(entry.getDescription());
        dto.setTagId(entry.getTag().getId());
        dto.setCreatedAt(entry.getCreatedAt());
        dto.setUpdatedAt(entry.getUpdatedAt());
        dto.setIsRecurring(entry.getIsRecurring());
        dto.setRecurrencePattern(entry.getRecurrencePattern());
        dto.setRecurrenceEndDate(entry.getRecurrenceEndDate());
        dto.setParentEntryId(entry.getParentEntryId());
        return dto;
    }

    public FinancialEntry toEntity(EntryDTO dto, Long userId, Tag tag) {
        FinancialEntry entry = new FinancialEntry();
        entry.setUserId(userId);
        entry.setAmount(dto.getAmount());
        entry.setEntryDate(dto.getEntryDate());
        entry.setDescription(dto.getDescription());
        entry.setTag(tag);
        entry.setIsRecurring(dto.getIsRecurring() != null ? dto.getIsRecurring() : false);
        entry.setRecurrencePattern(dto.getRecurrencePattern());
        entry.setRecurrenceEndDate(dto.getRecurrenceEndDate());
        entry.setParentEntryId(null);
        return entry;
    }

    public void updateEntity(FinancialEntry entry, EntryDTO dto, Tag tag) {
        entry.setAmount(dto.getAmount());
        entry.setEntryDate(dto.getEntryDate());
        entry.setDescription(dto.getDescription());
        entry.setTag(tag);
        entry.setIsRecurring(dto.getIsRecurring() != null ? dto.getIsRecurring() : false);
        entry.setRecurrencePattern(dto.getRecurrencePattern());
        entry.setRecurrenceEndDate(dto.getRecurrenceEndDate());
    }
}
