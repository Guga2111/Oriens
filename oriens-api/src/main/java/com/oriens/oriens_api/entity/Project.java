package com.oriens.oriens_api.entity;

import com.oriens.oriens_api.entity.enums.ProjectMode;
import com.oriens.oriens_api.entity.enums.ObjectiveStatus;
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
@Table(name = "project")
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", length = 10000)
    private String description;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "color")
    private String color;

    @Column(name = "is_favorite", nullable = false)
    private boolean favorite = false;

    @Column(name = "last_accessed")
    private Instant lastAccessed;

    @Column(name = "archived", nullable = false)
    @Builder.Default private Boolean archived = false;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    @Builder.Default private ProjectMode mode = ProjectMode.SIMPLE;

    @Version @Column(nullable = false) private long version;
    private Long defaultPendingColumnId;
    private Long defaultCompletedColumnId;

    @OneToMany(mappedBy = "project", cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @OrderBy("position ASC, id ASC")
    @Builder.Default private List<Objective> objectives = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Transient
    public int getProgress() {
        if (objectives == null || objectives.isEmpty()) {
            return 0;
        }
        long completedCount = objectives.stream().filter(o -> o.getStatus() == ObjectiveStatus.CONCLUDED).count();
        return (int) (((double) completedCount / objectives.size()) * 100);
    }
}
