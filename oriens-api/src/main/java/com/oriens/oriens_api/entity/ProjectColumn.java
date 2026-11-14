package com.oriens.oriens_api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.oriens.oriens_api.entity.enums.Status;
import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "project_columns")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ProjectColumn {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "project_id", nullable = false)
    @JsonIgnore private Project project;
    @Column(nullable = false, length = 60) private String name;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Status kind;
    @Column(nullable = false) private int position;
    @Version @Column(nullable = false) private long version;
}
