package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.Tag;
import com.oriens.oriens_api.entity.dto.financial.TagDTO;

import java.util.List;

public interface TagService {
    Tag createTag (TagDTO dto, Long userId);
    TagDTO getTag (Long tagId, Long userId);
    List<TagDTO> getTags (Long userId);
    List<TagDTO> getDefaultTags (Long userId);
    List<TagDTO> getCustomTags (Long userId);
    TagDTO updateTag (Long tagId, Long userId, TagDTO tagDTO);
    void deleteTag (Long tagId, Long userId);
}
