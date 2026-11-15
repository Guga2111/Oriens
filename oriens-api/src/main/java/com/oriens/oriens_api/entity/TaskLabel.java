package com.oriens.oriens_api.entity;

import com.oriens.oriens_api.entity.enums.TaskLabelColor;
import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "task_labels")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TaskLabel {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(nullable = false, length = 50) private String name;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16) private TaskLabelColor color;
    @Version @Column(nullable = false) private long version;
}
