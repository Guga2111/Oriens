package com.oriens.oriens_api.repository;
import com.oriens.oriens_api.entity.Objective;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ObjectiveRepository extends JpaRepository<Objective, Long> {
    List<Objective> findByProjectIdOrderByPositionAscIdAsc(Long projectId);
}
