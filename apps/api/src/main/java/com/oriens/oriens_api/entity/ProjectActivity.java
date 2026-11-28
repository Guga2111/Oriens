package com.oriens.oriens_api.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;

@Entity
@Table(name = "project_activity")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProjectActivity {
    public enum Kind {
        PROJECT_CREATED, PROJECT_UPDATED, DESCRIPTION_UPDATED, COVER_UPDATED,
        OBJECTIVE_CREATED, OBJECTIVE_UPDATED, OBJECTIVE_REMOVED,
        TASK_CREATED, TASK_ADDED, TASK_MOVED, TASK_COMPLETED, TASK_REMOVED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Project project;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Kind kind;

    @Column(nullable = false)
    private Instant occurredAt;

    private Long subjectId;

    @Column(length = 200)
    private String subjectTitle;

    public ProjectActivity(Project project, Kind kind, Instant occurredAt, Long subjectId, String subjectTitle) {
        this.project = project;
        this.kind = kind;
        this.occurredAt = occurredAt;
        this.subjectId = subjectId;
        this.subjectTitle = subjectTitle;
    }
}
