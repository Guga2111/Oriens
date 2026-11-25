package com.oriens.oriens_api.repository;

import com.oriens.oriens_api.entity.WorkRecentVisit;
import com.oriens.oriens_api.entity.dto.work.WorkHome.RecentView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface WorkRecentVisitRepository extends JpaRepository<WorkRecentVisit, Long> {
    Optional<WorkRecentVisit> findByUserIdAndTaskId(Long owner, Long taskId);
    Optional<WorkRecentVisit> findByUserIdAndProjectId(Long owner, Long projectId);

    @Query("""
        select new com.oriens.oriens_api.entity.dto.work.WorkHome$RecentView(
            case when t.id is not null then 'TASK' else 'PROJECT' end,
            coalesce(t.id, p.id), coalesce(t.title, p.title), v.visitedAt)
        from WorkRecentVisit v
        left join Task t on t.id = v.taskId and t.user.id = :owner
        left join Project tp on tp.id = t.projectId and tp.user.id = :owner
        left join Project p on p.id = v.projectId and p.user.id = :owner
        where v.user.id = :owner and
            ((t.id is not null and (t.projectId is null or tp.archived = false)) or
             (p.id is not null and p.archived = false))
        order by v.visitedAt desc, v.id desc
        """)
    List<RecentView> recent(@Param("owner") Long owner, Pageable page);
}
