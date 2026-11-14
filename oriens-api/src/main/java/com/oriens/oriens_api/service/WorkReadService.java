package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.*;
import com.oriens.oriens_api.entity.dto.work.WorkResponses.*;
import com.oriens.oriens_api.exception.WorkDomainException;
import com.oriens.oriens_api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class WorkReadService {
    private final ProjectRepository projects;
    private final TaskRepository tasks;
    private final ObjectiveRepository objectives;
    private final ProjectColumnRepository columns;
    public Project project(Long owner, Long id) {
        return projects.findByIdAndUserId(id, owner).orElseThrow(WorkReadService::missing);
    }
    public Task task(Long owner, Long id) {
        return tasks.findByIdAndUserId(id, owner).orElseThrow(WorkReadService::missing);
    }
    public TaskView taskView(Long owner, Long id) { return view(owner, task(owner, id)); }
    public ProjectView projectView(Long owner, Long id) { return ProjectView.of(project(owner, id), true); }
    public TaskView view(Long owner, Task t) {
        Project p = t.getProjectId() == null ? null : project(owner, t.getProjectId());
        Objective o = t.getObjectiveId() == null ? null : objectives.findById(t.getObjectiveId()).orElseThrow(WorkReadService::missing);
        ProjectColumn c = t.getColumnId() == null ? null : columns.findById(t.getColumnId()).orElseThrow(WorkReadService::missing);
        return new TaskView(t.getId(), t.getUser().getId(), t.getTitle(), t.getDescription(), t.getProjectId(), t.getObjectiveId(), t.getColumnId(),
            t.getPosition(), t.getPlannedDate(), t.getStartTime(), t.getDueDate(), t.getPriority(), t.getStatus(), t.getCompletedAt(),
            t.getCreatedAt(), t.getLocation(), t.getVersion(), p == null ? null : new ProjectLink(p.getId(), p.getTitle(), p.getArchived(), p.getVersion()),
            o == null ? null : new ObjectiveLink(o.getId(), o.getTitle()), c == null ? null : new ColumnLink(c.getId(), c.getName(), c.getKind()));
    }
    public BoardConfigMutation config(Long owner, Long id) {
        Project p = project(owner, id);
        return new BoardConfigMutation(id, p.getVersion(), columns.findByProjectIdOrderByPositionAscIdAsc(id).stream()
            .map(ColumnView::of).toList(), p.getDefaultPendingColumnId(), p.getDefaultCompletedColumnId());
    }
    public DeletionPreview preview(Long owner, Long id) {
        Project p = project(owner, id);
        return new DeletionPreview(p.getVersion(), p.getObjectives().size(), columns.countByProjectId(id), tasks.countByProjectId(id));
    }
    private static WorkDomainException missing() { return new WorkDomainException("NOT_FOUND", null, "Recurso não encontrado."); }
}
