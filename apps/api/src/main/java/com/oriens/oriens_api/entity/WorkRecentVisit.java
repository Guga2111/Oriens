package com.oriens.oriens_api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "work_recent_visits")
@Getter @Setter @NoArgsConstructor
public class WorkRecentVisit {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false) private User user;
    private Long taskId;
    private Long projectId;
    @Column(nullable = false) private Instant visitedAt;
}
