package com.oriens.oriens_api.repository;

import com.oriens.oriens_api.entity.TaskLabel;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface TaskLabelRepository extends JpaRepository<TaskLabel, Long> {
    List<TaskLabel> findByUserIdOrderByNameAscIdAsc(Long owner);
    Optional<TaskLabel> findByIdAndUserId(Long id, Long owner);
    List<TaskLabel> findByUserIdAndIdIn(Long owner, Collection<Long> ids);
    @Query("select count(l) > 0 from TaskLabel l where l.userId = :owner and lower(l.name) = lower(:name) and (:except is null or l.id <> :except)")
    boolean nameExists(@Param("owner") Long owner, @Param("name") String name, @Param("except") Long except);
}
