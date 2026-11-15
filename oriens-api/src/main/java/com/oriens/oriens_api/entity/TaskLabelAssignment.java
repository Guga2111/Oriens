package com.oriens.oriens_api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;

/** Explicit owner column allows composite database FKs on both sides of the link. */
@Entity @Table(name = "task_label_assignments")
@IdClass(TaskLabelAssignment.Key.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class TaskLabelAssignment {
    @Id @Column(name = "task_id") private Long taskId;
    @Id @Column(name = "label_id") private Long labelId;
    @Column(name = "user_id", nullable = false) private Long userId;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @EqualsAndHashCode
    public static class Key implements Serializable {
        private Long taskId;
        private Long labelId;
    }
}
