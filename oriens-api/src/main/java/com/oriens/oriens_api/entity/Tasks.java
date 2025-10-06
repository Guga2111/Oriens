package com.oriens.oriens_api.entity;

import com.oriens.oriens_api.entity.enums.Priority;
import com.oriens.oriens_api.entity.enums.Status;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "tasks")
public class Tasks {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description")
    private String description;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "priority")
    private Priority priority;

    @Column(name = "status")
    private Status status;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
