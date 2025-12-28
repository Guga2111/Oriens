package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.Tag;
import com.oriens.oriens_api.entity.dto.financial.TagDTO;
import com.oriens.oriens_api.exception.BusinessException;
import com.oriens.oriens_api.exception.TagNotFoundException;
import com.oriens.oriens_api.mapper.FinancialMapper;
import com.oriens.oriens_api.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TagServiceImpl implements TagService {

    private final TagRepository tagRepository;
    private final FinancialMapper financialMapper;

    @Override
    @Transactional
    public Tag createTag(TagDTO dto, Long userId) {
        if (tagRepository.existsByUserIdAndName(userId, dto.getName())) throw new BusinessException("The Tag already exists");

        Tag tag = financialMapper.toEntity(dto, userId);

        return tagRepository.save(tag);
    }

    @Override
    public TagDTO getTag(Long tagId, Long userId) {
        Tag tag = tagRepository.findByUserIdAndId(userId, tagId)
                .orElseThrow(() -> new TagNotFoundException(tagId));

        return financialMapper.toDTO(tag);
    }

    @Override
    public List<TagDTO> getTags(Long userId) {
        List<Tag> tags = tagRepository.findByUserId(userId);

        return tags.stream()
                .map(financialMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<TagDTO> getCustomTags(Long userId) {
        List<Tag> customTags = tagRepository.findByUserIdAndIsDefaultFalse(userId);

        return customTags.stream()
                .map(financialMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<TagDTO> getDefaultTags (Long userId) {
        List<Tag> defaultTags = tagRepository.findByUserIdAndIsDefaultTrue(userId);

        return defaultTags.stream()
                .map(financialMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public TagDTO updateTag(Long tagId, Long userId, TagDTO tagDTO) {
        Tag tag = tagRepository.findByUserIdAndId(userId, tagId)
                .orElseThrow(() -> new TagNotFoundException(tagId));

        boolean nameExists = tagRepository.findByUserId(userId).stream()
                .anyMatch(t -> t.getName().equalsIgnoreCase(tagDTO.getName())
                        && !t.getId().equals(tagId));


        if (tag.getIsDefault() && nameExists) throw new BusinessException("The tag is default ");

        financialMapper.updateEntity(tag, tagDTO);

        Tag updatedTag = tagRepository.save(tag);
        return financialMapper.toDTO(updatedTag);
    }

    @Override
    @Transactional
    public void deleteTag(Long tagId, Long userId) {
        Tag tag = tagRepository.findByUserIdAndId(userId, tagId)
                .orElseThrow(() -> new TagNotFoundException(tagId));

        if (tag.getIsDefault()) throw new RuntimeException();

        tagRepository.delete(tag);
    }
}
