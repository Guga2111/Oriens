package com.oriens.oriens_api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "work_quick_links")
@Getter @Setter @NoArgsConstructor
public class WorkQuickLink {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false) private User user;
    @Column(nullable = false, length = 80) private String name;
    @Column(nullable = false, length = 2048) private String url;
    @Column(nullable = false) private Instant createdAt;
    @Version @Column(nullable = false) private long version;
}
