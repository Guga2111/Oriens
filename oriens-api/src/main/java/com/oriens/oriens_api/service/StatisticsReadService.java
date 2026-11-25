package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.dto.statistics.StatisticsViews.*;
import com.oriens.oriens_api.entity.dto.statistics.StatisticsViews.Period;
import com.oriens.oriens_api.exception.WorkDomainException;
import com.oriens.oriens_api.configuration.ProductClockConfiguration;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.time.*;
import java.util.*;

/** Read projections belong to analysis, not the planned-day agenda. All queries include the owner. */
@Service @RequiredArgsConstructor @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class StatisticsReadService {
    private final JdbcTemplate db;
    private final Clock clock;
    public LocalDate coverageFrom(Long owner) {
        return db.queryForObject("select greatest(c.started_on,u.statistics_started_on) from statistics_coverage c cross join users u where c.id=1 and u.id=?", LocalDate.class, owner);
    }
    /** Executions are validated at write time; prospective schedules/pauses preserve past executions. */
    public Streak streak(Long owner) {
        LocalDate today = LocalDate.now(clock.withZone(ProductClockConfiguration.ZONE));
        LocalDate coverage = coverageFrom(owner);
        return db.queryForObject("""
            with active_days as (
                select completed_at as day from tasks
                where user_id=? and status='CONCLUDED' and completed_at<=?
                union
                select execution_date as day from habit_executions
                where user_id=? and execution_date<=?
            ), ranked as (
                select day, max(day) over () as latest,
                    row_number() over (order by day desc) as ordinal from active_days
            )
            select count(*),min(day),max(day) from ranked
            where latest>=? and day=latest-(ordinal-1)::int
            """, (row, index) -> {
                long count = row.getLong(1);
                LocalDate start = row.getObject(2, LocalDate.class);
                LocalDate through = row.getObject(3, LocalDate.class);
                Long days = count == 0 && coverage.isAfter(today.minusDays(1)) ? null : count;
                return new Streak(today, days, start, through,
                    start != null && !start.isAfter(coverage), coverage);
            }, owner, today, owner, today, today.minusDays(1));
    }
    public Activity activity(Long owner, LocalDate start, LocalDate end) {
        Period period = Period.of(start, end, clock);
        Map<LocalDate, Long> counts = new HashMap<>();
        db.query("select completed_at, count(*) from tasks where user_id=? and status='CONCLUDED' and completed_at between ? and ? group by completed_at",
            row -> { counts.put(row.getDate(1).toLocalDate(), row.getLong(2)); }, owner, period.previousStartDate(), end);
        List<DayCount> current = days(start, end, counts), previous = days(period.previousStartDate(), period.previousEndDate(), counts);
        return new Activity(period, coverageFrom(owner), current.stream().mapToLong(DayCount::completed).sum(),
            previous.stream().mapToLong(DayCount::completed).sum(), current, previous);
    }
    private List<DayCount> days(LocalDate start, LocalDate end, Map<LocalDate, Long> values) {
        return start.datesUntil(end.plusDays(1)).map(d -> new DayCount(d, values.getOrDefault(d, 0L))).toList();
    }
    public Planning planning(Long owner, LocalDate start, LocalDate end) {
        Period p = Period.of(start, end, clock);
        List<OverdueGroup> overdue = db.query("""
            select t.project_id, coalesce(p.title,'Sem projeto'), count(*) from tasks t
            left join project p on p.id=t.project_id and p.user_id=t.user_id
            where t.user_id=? and t.status in ('BACKLOG','PENDING','ON_DOING') and t.due_date < ?
            group by t.project_id,p.title order by count(*) desc, coalesce(p.title,'Sem projeto'),t.project_id
            """, (r,i) -> new OverdueGroup(r.getObject(1,Long.class),r.getString(2),r.getLong(3)), owner,p.today());
        return new Planning(p, plan(owner,start,end), plan(owner,p.previousStartDate(),p.previousEndDate()),
            overdue.stream().mapToLong(OverdueGroup::total).sum(),overdue);
    }
    private PlanCounts plan(Long owner, LocalDate start, LocalDate end) {
        return db.queryForObject("""
            select count(*),count(*) filter(where status='CONCLUDED' and completed_at<=?) from tasks
            where user_id=? and status<>'CANCELLED' and planned_date between ? and ?
            """,(r,i) -> new PlanCounts(r.getLong(1),r.getLong(2)),end,owner,start,end);
    }
    public Page<TaskEvidence> evidence(Long owner, String kind, LocalDate start, LocalDate end, Long projectId, boolean unassigned, int page, int size) {
        Period p=Period.of(start,end,clock);
        if (page<0 || page>100000 || size<1 || size>100) throw new WorkDomainException("INVALID_REQUEST","page","Página inválida.");
        String filter=switch(kind) {
            case "completed" -> "t.status='CONCLUDED' and t.completed_at between ? and ?";
            case "planned" -> "t.status<>'CANCELLED' and t.planned_date between ? and ?";
            case "overdue" -> "t.status in ('BACKLOG','PENDING','ON_DOING') and t.due_date < ?";
            default -> throw new WorkDomainException("INVALID_REQUEST","kind","Escolha conclusões, planejamento ou atrasos.");
        };
        List<Object> args=new ArrayList<>();args.add(owner);
        if (kind.equals("overdue")) args.add(p.today()); else {args.add(start);args.add(end);}
        if(unassigned) filter+=" and t.project_id is null";
        if(projectId!=null) {filter+=" and t.project_id=?";args.add(projectId);}
        String where=" from tasks t where t.user_id=? and "+filter;
        long total=db.queryForObject("select count(*)"+where,Long.class,args.toArray());
        args.add(size);args.add((long)page*size);
        String order=switch(kind){case "completed"->"t.completed_at desc";case "planned"->"t.planned_date asc";default->"t.due_date asc";};
        List<TaskEvidence> rows=db.query("""
            select t.id,t.title,t.completed_at,t.planned_date,t.due_date,t.status,t.project_id,
              (select p.title from project p where p.id=t.project_id and p.user_id=t.user_id)
            """+where+" order by "+order+",t.id desc limit ? offset ?",
            (r,i)->new TaskEvidence(r.getLong(1),r.getString(2),r.getObject(3,LocalDate.class),r.getObject(4,LocalDate.class),
                r.getObject(5,LocalDate.class),r.getString(6),r.getObject(7,Long.class),r.getString(8)),args.toArray());
        return new PageImpl<>(rows,PageRequest.of(page,size),total);
    }
}
