package com.oriens.oriens_api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.oriens.oriens_api.entity.enums.ObjectiveStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "project_objectives")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Objective {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "project_id", nullable = false)
    @JsonIgnore
    private Project project;
    @Column(nullable = false, length = 200)
    private String title;
    private LocalDate dueDate;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    @Builder.Default private ObjectiveStatus status = ObjectiveStatus.PENDING;
    @Column(nullable = false) private int position;
    @Version @Column(nullable = false) private long version;
}
