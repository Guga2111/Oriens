package com.oriens.oriens_api.entity;

import com.oriens.oriens_api.entity.embeddable.Objective;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Builder
@Table(name = "Project")
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description")
    private String description;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "color")
    private String color;

    @Column(name = "is_favorite", nullable = false)
    private boolean favorite = false;

    @Column(name = "last_accessed")
    private Instant lastAccessed;

    @Column(name = "archived")
    private Boolean archived = false;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "project_objectives", joinColumns = @JoinColumn(name = "project_id"))
    private List<Objective> objectives = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Transient
    public int getProgress() {
        if (objectives == null || objectives.isEmpty()) {
            return 0;
        }
        long completedCount = objectives.stream().filter(Objective::isCompleted).count();
        return (int) (((double) completedCount / objectives.size()) * 100);
    }
}
