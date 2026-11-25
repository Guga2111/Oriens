package com.oriens.oriens_api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "task_attachments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TaskAttachment {
    @Id
    private UUID id;

    @Column(nullable = false, updatable = false)
    private Long taskId;

    @Column(nullable = false, updatable = false)
    private Long userId;

    @Column(nullable = false, length = 8, updatable = false)
    private String kind;

    @Column(length = 32)
    private String contentType;

    @Column(nullable = false)
    private long bytes;

    private Instant unusedSince;

    public TaskAttachment(UUID id, Long taskId, Long userId, String kind, long reservedBytes, Instant now) {
        this.id = id;
        this.taskId = taskId;
        this.userId = userId;
        this.kind = kind;
        this.bytes = reservedBytes;
        unusedSince = now;
    }

    public void completeUpload(String contentType, long actualBytes) {
        this.contentType = contentType;
        this.bytes = actualBytes;
    }

    public void reference() { unusedSince = null; }

    public void unreference(Instant now) {
        if (unusedSince == null) unusedSince = now;
    }
}
