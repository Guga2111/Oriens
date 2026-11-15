package com.oriens.oriens_api.controller;

import com.oriens.oriens_api.entity.Tag;
import com.oriens.oriens_api.entity.dto.financial.TagDTO;
import com.oriens.oriens_api.service.TagServiceImpl;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@AllArgsConstructor
@RequestMapping("/financial")
public class TagController {

    private final TagServiceImpl tagService;
    private final com.oriens.oriens_api.security.WorkOwner owner;

    @PostMapping("/user/{userId}/tags")
    public ResponseEntity<Tag> createTag(org.springframework.security.core.Authentication auth, @PathVariable Long userId, @Valid @RequestBody TagDTO dto) {
        userId = owner.matching(auth,userId);
        return new ResponseEntity<>(tagService.createTag(dto, userId), HttpStatus.CREATED);
    }

    @GetMapping("/user/{userId}/tags/{id}")
    public ResponseEntity<TagDTO> getTag(org.springframework.security.core.Authentication auth, @PathVariable Long userId, @PathVariable Long id) {
        userId = owner.matching(auth,userId);
        return new ResponseEntity<>(tagService.getTag(id, userId), HttpStatus.OK);
    }

    @GetMapping("/user/{userId}/tags")
    public ResponseEntity<List<TagDTO>> getAllTags(org.springframework.security.core.Authentication auth, @PathVariable Long userId) {
        userId = owner.matching(auth,userId);
        return new ResponseEntity<>(tagService.getTags(userId), HttpStatus.OK);
    }

    @GetMapping("/user/{userId}/tags/default")
    public ResponseEntity<List<TagDTO>> getDefaultTags(org.springframework.security.core.Authentication auth, @PathVariable Long userId) {
        userId = owner.matching(auth,userId);
        return new ResponseEntity<>(tagService.getDefaultTags(userId), HttpStatus.OK);
    }

    @GetMapping("/user/{userId}/tags/custom")
    public ResponseEntity<List<TagDTO>> getCustomTags(org.springframework.security.core.Authentication auth, @PathVariable Long userId) {
        userId = owner.matching(auth,userId);
        return new ResponseEntity<>(tagService.getCustomTags(userId), HttpStatus.OK);
    }

    @PutMapping("/user/{userId}/tags/{id}")
    public ResponseEntity<TagDTO> updateTag(org.springframework.security.core.Authentication auth, @PathVariable Long userId, @PathVariable Long id, @Valid @RequestBody TagDTO dto) {
        userId = owner.matching(auth,userId);
        return new ResponseEntity<>(tagService.updateTag(id, userId, dto), HttpStatus.OK);
    }

    @DeleteMapping("/user/{userId}/tags/{id}")
    public ResponseEntity<Void> deleteTag(org.springframework.security.core.Authentication auth, @PathVariable Long userId, @PathVariable Long id) {
        userId = owner.matching(auth,userId);
        tagService.deleteTag(id, userId);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}
