package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.*;
import com.oriens.oriens_api.entity.dto.work.WorkCommands.LabelInput;
import com.oriens.oriens_api.entity.dto.work.WorkResponses.LabelView;
import com.oriens.oriens_api.exception.WorkDomainException;
import com.oriens.oriens_api.repository.*;
import jakarta.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service @Transactional @RequiredArgsConstructor
public class TaskLabelService {
    private final EntityManager em;
    private final TaskLabelRepository labels;
    private final TaskLabelAssignmentRepository assignments;

    /** Same first lock as idempotent creation. Never acquire this after a project/task lock. */
    public void lockOwner(Long owner) {
        if (em.find(User.class, owner, LockModeType.PESSIMISTIC_WRITE) == null) throw missing();
    }
    @Transactional(readOnly = true)
    public List<LabelView> list(Long owner) {
        return labels.findByUserIdOrderByNameAscIdAsc(owner).stream().map(TaskLabelService::view).toList();
    }
    public TaskLabel create(Long owner, LabelInput input) {
        lockOwner(owner);
        String name = name(input.name());
        if (labels.nameExists(owner, name, null)) throw invalid("name", "Já existe uma etiqueta com este nome.");
        if (input.color() == null) throw invalid("color", "Escolha a cor da etiqueta.");
        return labels.saveAndFlush(TaskLabel.builder().userId(owner).name(name).color(input.color()).build());
    }
    public LabelView update(Long owner, Long id, long expected, LabelInput input) {
        lockOwner(owner);
        TaskLabel label = owned(owner, id); version(label, expected);
        String name = name(input.name());
        if (labels.nameExists(owner, name, id)) throw invalid("name", "Já existe uma etiqueta com este nome.");
        if (input.color() == null) throw invalid("color", "Escolha a cor da etiqueta.");
        label.setName(name); label.setColor(input.color()); em.flush(); return view(label);
    }
    public void delete(Long owner, Long id, long expected) {
        lockOwner(owner);
        TaskLabel label = owned(owner, id); version(label, expected);
        // Changing membership invalidates drafts of every affected task, not their dates/states.
        em.createQuery("update Task t set t.version = t.version + 1 where t.user.id = :owner and t.id in (select a.taskId from TaskLabelAssignment a where a.labelId = :label and a.userId = :owner)")
            .setParameter("owner", owner).setParameter("label", id).executeUpdate();
        assignments.removeLabel(id, owner); labels.delete(label); em.flush();
    }
    /** Caller holds owner → project → task locks. Creation has no prior version; updates pass the verified version. */
    void replace(Task task, List<Long> requested, Long priorVersion) {
        if (requested == null) {
            if (priorVersion != null) throw invalid("labelIds", "Use uma lista de etiquetas; [] remove todas.");
            requested = List.of();
        }
        if (requested.size() > 20 || requested.stream().anyMatch(id -> id == null || id <= 0)
                || new HashSet<>(requested).size() != requested.size())
            throw invalid("labelIds", "Escolha até 20 etiquetas distintas e válidas.");
        Long owner = task.getUser().getId();
        if (!requested.isEmpty() && labels.findByUserIdAndIdIn(owner, requested).size() != requested.size()) throw missing();
        List<TaskLabelAssignment> existing = assignments.findByTaskIdAndUserId(task.getId(), owner);
        Set<Long> previous = new HashSet<>();
        existing.forEach(a -> previous.add(a.getLabelId()));
        if (previous.equals(new HashSet<>(requested))) return;
        Set<Long> wanted = new HashSet<>(requested);
        existing.stream().filter(a -> !wanted.contains(a.getLabelId())).forEach(assignments::delete);
        for (Long id : requested) if (!previous.contains(id)) assignments.save(new TaskLabelAssignment(task.getId(), id, owner));
        em.flush();
        // A scalar edit may already have advanced the task. Membership-only edits must do so too.
        if (priorVersion != null && task.getVersion() == priorVersion) em.lock(task, LockModeType.PESSIMISTIC_FORCE_INCREMENT);
    }
    @Transactional(readOnly = true)
    public Map<Long, List<LabelView>> forTasks(Long owner, Collection<Long> taskIds) {
        Map<Long, List<LabelView>> result = new HashMap<>();
        if (!taskIds.isEmpty()) for (Object[] row : assignments.labelsForTasks(owner, taskIds))
            result.computeIfAbsent((Long) row[0], ignored -> new ArrayList<>()).add(view((TaskLabel) row[1]));
        return result;
    }
    private TaskLabel owned(Long owner, Long id) { return labels.findByIdAndUserId(id, owner).orElseThrow(TaskLabelService::missing); }
    private void version(TaskLabel label, long expected) {
        if (label.getVersion() != expected) throw new WorkDomainException("VERSION_CONFLICT", "version", "A etiqueta mudou. Recarregue antes de salvar.");
    }
    private String name(String value) {
        if (value == null || value.strip().isEmpty() || value.strip().length() > 50 || value.chars().anyMatch(Character::isISOControl))
            throw invalid("name", "Informe um nome de etiqueta com até 50 caracteres.");
        return value.strip();
    }
    public static LabelView view(TaskLabel label) { return new LabelView(label.getId(), label.getName(), label.getColor(), label.getVersion()); }
    private static WorkDomainException invalid(String field, String message) { return new WorkDomainException("INVALID_REQUEST", field, message); }
    private static WorkDomainException missing() { return new WorkDomainException("NOT_FOUND", "labelIds", "Etiqueta indisponível nesta conta."); }
}
