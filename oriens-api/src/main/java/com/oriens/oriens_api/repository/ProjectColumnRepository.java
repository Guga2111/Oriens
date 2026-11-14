package com.oriens.oriens_api.repository;
import com.oriens.oriens_api.entity.ProjectColumn;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ProjectColumnRepository extends JpaRepository<ProjectColumn, Long> {
    List<ProjectColumn> findByProjectIdOrderByPositionAscIdAsc(Long projectId);
}
