package com.oriens.oriens_api.repository;

import com.oriens.oriens_api.entity.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface TaskLabelAssignmentRepository extends JpaRepository<TaskLabelAssignment, TaskLabelAssignment.Key> {
    List<TaskLabelAssignment> findByTaskIdAndUserId(Long task, Long owner);
    @Query("select a.taskId, l from TaskLabelAssignment a, TaskLabel l where a.labelId = l.id and a.userId = :owner and l.userId = :owner and a.taskId in :tasks order by lower(l.name), l.id")
    List<Object[]> labelsForTasks(@Param("owner") Long owner, @Param("tasks") Collection<Long> tasks);
    @Modifying @Query("delete from TaskLabelAssignment a where a.labelId = :label and a.userId = :owner")
    void removeLabel(@Param("label") Long label, @Param("owner") Long owner);
}
