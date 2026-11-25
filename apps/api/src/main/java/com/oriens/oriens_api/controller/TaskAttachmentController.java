package com.oriens.oriens_api.controller;

import com.oriens.oriens_api.security.WorkOwner;
import com.oriens.oriens_api.service.TaskAttachmentService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/task")
public class TaskAttachmentController {
    private final WorkOwner owner;
    private final TaskAttachmentService attachments;

    @PostMapping(value = "/{taskId}/attachments", consumes = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<TaskAttachmentService.Upload> upload(Authentication auth, @PathVariable Long taskId,
            @RequestParam String kind, HttpServletRequest request) throws IOException {
        try (var body = request.getInputStream()) {
            var uploaded = attachments.upload(owner.id(auth), taskId, kind, request.getContentLengthLong(), body);
            return ResponseEntity.status(HttpStatus.CREATED).body(uploaded);
        }
    }

    @GetMapping("/{taskId}/attachments/{id}")
    public ResponseEntity<TaskAttachmentService.DownloadLink> link(Authentication auth, @PathVariable Long taskId,
            @PathVariable UUID id) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(attachments.issue(owner.id(auth), taskId, id, false));
    }

    @GetMapping("/attachments/content/{taskId}/{id}")
    public ResponseEntity<Resource> download(@PathVariable Long taskId, @PathVariable UUID id, @RequestParam(required = false) Long owner,
            @RequestParam(required = false) Long expires, @RequestParam(required = false) String signature) {
        var download = attachments.download(owner, taskId, id, expires, signature);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .header("Content-Security-Policy", "default-src 'none'; sandbox")
            .header("Referrer-Policy", "no-referrer")
            .contentType(MediaType.parseMediaType(download.contentType()))
            .body(download.resource());
    }
}
