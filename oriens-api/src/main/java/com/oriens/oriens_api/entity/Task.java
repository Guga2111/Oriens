package com.oriens.oriens_api.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.oriens.oriens_api.entity.embeddable.Location;
import com.oriens.oriens_api.entity.enums.Priority;
import com.oriens.oriens_api.entity.enums.Status;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", length = 10000)
    private String description;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "completed_at")
    private LocalDate completedAt; // atribuir completedAt a regra de negocio de task

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false)
    @Builder.Default private Priority priority = Priority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default private Status status = Status.PENDING;

    @Column(name = "reminder_sent", nullable = false)
    private boolean reminderSent = false;

    @Column(name = "overdue_notification_sent", nullable = false)
    private boolean overdueNotificationSent = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Version @Column(nullable = false) private long version;
    private LocalDate plannedDate;
    // Scalar IDs mirror the composite owner/project/status FKs in the sealed SQL baseline.
    // No cascades: lifecycle operations explicitly detach tasks in the domain service.
    private Long projectId;
    private Long objectiveId;
    private Long columnId;
    private Integer position;

    @Embedded
    private Location location;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonBackReference
    private User user;
}
