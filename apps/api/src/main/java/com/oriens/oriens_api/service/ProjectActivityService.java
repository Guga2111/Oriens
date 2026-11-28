package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.Project;
import com.oriens.oriens_api.entity.ProjectActivity;
import com.oriens.oriens_api.entity.ProjectActivity.Kind;
import com.oriens.oriens_api.entity.Task;
import com.oriens.oriens_api.entity.enums.Status;
import com.oriens.oriens_api.repository.ProjectActivityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(propagation = Propagation.MANDATORY)
public class ProjectActivityService {
    private final ProjectActivityRepository events;
    private final Clock clock;

    public void record(Project project, Kind kind) {
        record(project, kind, null, null);
    }

    public void record(Project project, Kind kind, Long subjectId, String subjectTitle) {
        events.save(new ProjectActivity(project, kind, clock.instant(), subjectId, subjectTitle));
    }

    public record TaskPlacement(Long columnId, Integer position, Status status) {
        public static TaskPlacement of(Task task) {
            return new TaskPlacement(task.getColumnId(), task.getPosition(), task.getStatus());
        }
    }

    public void recordTaskPlacement(Project original, Project destination, TaskPlacement previous, Task task) {
        if (!Objects.equals(original, destination)) {
            if (original != null) record(original, Kind.TASK_REMOVED, task.getId(), task.getTitle());
            if (destination != null) record(destination, Kind.TASK_ADDED, task.getId(), task.getTitle());
        }
        if (destination == null) return;
        if (task.getStatus() == Status.CONCLUDED && previous.status() != Status.CONCLUDED) {
            record(destination, Kind.TASK_COMPLETED, task.getId(), task.getTitle());
        } else if (Objects.equals(original, destination) && !previous.equals(TaskPlacement.of(task))) {
            record(destination, Kind.TASK_MOVED, task.getId(), task.getTitle());
        }
    }
}
