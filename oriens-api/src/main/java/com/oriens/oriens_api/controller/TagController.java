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

    @PostMapping("/user/{userId}/tags")
    public ResponseEntity<Tag> createTag(@PathVariable Long userId, @Valid @RequestBody TagDTO dto) {
        return new ResponseEntity<>(tagService.createTag(dto, userId), HttpStatus.CREATED);
    }

    @GetMapping("/user/{userId}/tags/{id}")
    public ResponseEntity<TagDTO> getTag(@PathVariable Long userId, @PathVariable Long id) {
        return new ResponseEntity<>(tagService.getTag(id, userId), HttpStatus.OK);
    }

    @GetMapping("/user/{userId}/tags")
    public ResponseEntity<List<TagDTO>> getAllTags(@PathVariable Long userId) {
        return new ResponseEntity<>(tagService.getTags(userId), HttpStatus.OK);
    }

    @GetMapping("/user/{userId}/tags/default")
    public ResponseEntity<List<TagDTO>> getDefaultTags(@PathVariable Long userId) {
        return new ResponseEntity<>(tagService.getDefaultTags(userId), HttpStatus.OK);
    }

    @GetMapping("/user/{userId}/tags/custom")
    public ResponseEntity<List<TagDTO>> getCustomTags(@PathVariable Long userId) {
        return new ResponseEntity<>(tagService.getCustomTags(userId), HttpStatus.OK);
    }

    @PutMapping("/user/{userId}/tags/{id}")
    public ResponseEntity<TagDTO> updateTag(@PathVariable Long userId, @PathVariable Long id, @Valid @RequestBody TagDTO dto) {
        return new ResponseEntity<>(tagService.updateTag(id, userId, dto), HttpStatus.OK);
    }

    @DeleteMapping("/user/{userId}/tags/{id}")
    public ResponseEntity<Void> deleteTag(@PathVariable Long userId, @PathVariable Long id) {
        tagService.deleteTag(id, userId);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}
