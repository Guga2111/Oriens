package com.oriens.oriens_api.service;

import com.oriens.oriens_api.configuration.ProductClockConfiguration;
import com.oriens.oriens_api.entity.*;
import com.oriens.oriens_api.entity.enums.*;
import com.oriens.oriens_api.exception.WorkDomainException;
import com.oriens.oriens_api.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import java.util.function.Function;

/** Bounded delegated reads. The owner/resource predicate is applied in SQL, including counts.
 * This layer has no OAuth, SDK, receipt or transport dependencies. */
@Service @Transactional(readOnly=true) @RequiredArgsConstructor
public class ScopedWorkReadService {
    private final ProjectRepository projects;
    private final TaskRepository tasks;
    private final ObjectiveRepository objectives;
    private final ProjectColumnRepository columns;
    private final TaskLabelService labels;
    private final EntityManager em;
    private final Clock clock;

    public record Access(long owner, Set<Long> projectIds, boolean standalone, boolean projectRead, boolean taskRead) {
        public Access { projectIds=Set.copyOf(projectIds); }
    }
    public record TaskFilter(Long projectId, boolean standaloneOnly, Long columnId, Status status, Priority priority,
                             String search, String dateField, LocalDate startDate, LocalDate endDate) {}
    public record PageResult(List<Map<String,Object>> items,int page,int pageSize,long totalElements,boolean hasNext) {}
    public static Map<String,Object> fields(Object... pairs) {
        var result=new LinkedHashMap<String,Object>();
        for(int i=0;i<pairs.length;i+=2) result.put((String)pairs[i],pairs[i+1]);
        return result;
    }
    public static String id(Long id) { return id==null?null:id.toString(); }
    private static <T> Specification<T> equal(String field,Object value) {
        return (r,q,b)->value==null?b.isNull(r.get(field)):b.equal(r.get(field),value);
    }
    private Specification<Project> projectScope(Access a) {
        return (r,q,b)->a.projectRead()&&!a.projectIds().isEmpty()
            ?b.and(b.equal(r.get("user").get("id"),a.owner()),r.get("id").in(a.projectIds())):b.disjunction();
    }
    private Specification<Task> taskScope(Access a) {
        return (r,q,b)->b.and(b.equal(r.get("user").get("id"),a.owner()), !a.taskRead()?b.disjunction():b.or(
            a.projectRead()&&!a.projectIds().isEmpty()?r.get("projectId").in(a.projectIds()):b.disjunction(),
            a.standalone()?b.isNull(r.get("projectId")):b.disjunction()));
    }
    private <T> Specification<T> childScope(Access a,long projectId) {
        return (r,q,b)->a.projectRead()&&a.projectIds().contains(projectId)
            ?b.and(b.equal(r.get("project").get("id"),projectId),b.equal(r.get("project").get("user").get("id"),a.owner())):b.disjunction();
    }
    public Project project(Access a,long id) { return projects.findOne(projectScope(a).and(equal("id",id))).orElseThrow(ScopedWorkReadService::missing); }
    public Task task(Access a,long id) { return tasks.findOne(taskScope(a).and(equal("id",id))).orElseThrow(ScopedWorkReadService::missing); }
    public Objective objective(Access a,long projectId,long id) {
        return objectives.findOne(this.<Objective>childScope(a,projectId).and(equal("id",id))).orElseThrow(ScopedWorkReadService::missing);
    }
    public ProjectColumn column(Access a,long projectId,long id) {
        return columns.findOne(this.<ProjectColumn>childScope(a,projectId).and(equal("id",id))).orElseThrow(ScopedWorkReadService::missing);
    }
    /** Creation confirmations check ownership but deliberately do not grant later project access. */
    public boolean ownedProjectExists(long owner,long id) { return projects.findByIdAndUserId(id,owner).isPresent(); }
    public void authorizeReplayResource(Access a,String kind,long id) {
        if(kind.equals("project")) {
            if(!ownedProjectExists(a.owner(),id)) throw gone();
            project(a,id);
        } else if(kind.equals("task")) {
            if(tasks.findByIdAndUserId(id,a.owner()).isEmpty()) throw gone();
            task(a,id);
        } else {
            Objective o=objectives.findOne((r,q,b)->b.and(b.equal(r.get("id"),id),b.equal(r.get("project").get("user").get("id"),a.owner()))).orElseThrow(ScopedWorkReadService::gone);
            objective(a,o.getProject().getId(),id);
        }
    }

    public PageResult listProjects(Access a,String search,boolean includeArchived,Pageable page) {
        Specification<Project> spec=projectScope(a);
        if(!includeArchived) spec=spec.and(equal("archived",false));
        if(search!=null) spec=spec.and(titleSearch(search));
        return page(projects.findAll(spec,page),this::projectBrief);
    }
    private static <T> Specification<T> titleSearch(String value) {
        String escaped=value.toLowerCase(Locale.ROOT).replace("\\","\\\\").replace("%","\\%").replace("_","\\_");
        return (r,q,b)->b.like(b.lower(r.get("title")),"%"+escaped+"%",'\\');
    }
    public Map<String,Object> getProject(Access a,long id,Pageable objectivePage) {
        Project p=project(a,id);
        var out=projectDetail(p);
        out.put("objectives",page(objectives.findAll(childScope(a,id),objectivePage),o->objectiveView(a,o)));
        var included=new ArrayList<>(List.of("objectives"));
        if(a.taskRead()) {out.put("taskSummary",counts(taskScope(a).and(equal("projectId",id))));included.add("taskSummary");}
        out.put("includedSections",included);return out;
    }
    public Map<String,Object> board(Access a,long id,Pageable columnPage,Pageable taskPage,Long objectiveId,String planning,boolean overdue,boolean open,
            LocalDate startDate,LocalDate endDate) {
        Project p=project(a,id);
        if(p.getMode()!=ProjectMode.DEVELOPMENT) throw new WorkDomainException("DOMAIN_VIOLATION","projectId","Projeto simples não possui quadro.");
        BoardWindow window=BoardWindow.of(startDate,endDate);
        if(objectiveId!=null) objective(a,id,objectiveId);
        Specification<Task> all=taskScope(a).and(equal("projectId",id)), visible=all;
        if(objectiveId!=null) visible=visible.and(equal("objectiveId",objectiveId));
        if(planning!=null) visible=visible.and(equal("plannedDate",planning.equals("today")?today():null));
        if(open||overdue) visible=visible.and((r,q,b)->r.get("status").in(Status.BACKLOG,Status.PENDING,Status.ON_DOING));
        if(overdue) visible=visible.and((r,q,b)->b.lessThan(r.get("dueDate"),today()));
        if(window!=null) visible=visible.and(window.specification());
        Specification<Task> filtered=visible;
        var out=fields("projectId",id(p.getId()),"projectVersion",p.getVersion(),
            "columns",page(columns.findAll(childScope(a,id),columnPage),c->{
                var row=columnView(c);
                if(a.taskRead()) {row.put("totalCount",tasks.count(all.and(equal("columnId",c.getId()))));row.put("visibleCount",tasks.count(filtered.and(equal("columnId",c.getId()))));}
                return row;
            }),"filtered",objectiveId!=null||planning!=null||overdue||open||window!=null);
        var included=new ArrayList<>(List.of("columns"));
        if(a.taskRead()) {
            out.put("tasks",page(tasks.findAll(visible,taskPage),this::taskBrief));
            out.put("projectTaskCounts",counts(all));out.put("filteredTaskCounts",counts(visible));included.addAll(List.of("tasks","projectTaskCounts","filteredTaskCounts"));
        }
        out.put("includedSections",included);return out;
    }
    private LocalDate today() { return LocalDate.now(clock.withZone(ProductClockConfiguration.ZONE)); }
    public PageResult listTasks(Access a,TaskFilter f,Pageable page) {
        if(f.projectId()!=null) project(a,f.projectId());
        if(f.standaloneOnly()&&!a.standalone()) throw missing();
        if(f.columnId()!=null) column(a,f.projectId(),f.columnId());
        Specification<Task> spec=taskScope(a);
        if(f.projectId()!=null||f.standaloneOnly()) spec=spec.and(equal("projectId",f.projectId()));
        if(f.columnId()!=null) spec=spec.and(equal("columnId",f.columnId()));
        if(f.status()!=null) spec=spec.and(equal("status",f.status()));
        if(f.priority()!=null) spec=spec.and(equal("priority",f.priority()));
        if(f.search()!=null) spec=spec.and(titleSearch(f.search()));
        if(f.startDate()!=null) spec=spec.and((r,q,b)->b.between(r.get(f.dateField()),f.startDate(),f.endDate()));
        return page(tasks.findAll(spec,page),this::taskBrief);
    }
    public Map<String,Object> getTask(Access a,long id) { return taskDetail(a,task(a,id)); }
    public Map<String,Object> projectBrief(Project p) {
        return fields("id",id(p.getId()),"title",p.getTitle(),"mode",p.getMode(),"color",p.getColor(),
            "favorite",p.isFavorite(),"archived",p.getArchived(),"version",p.getVersion());
    }
    public Map<String,Object> projectDetail(Project p) {
        var out=projectBrief(p);out.putAll(fields("description",p.getDescription(),"defaultPendingColumnId",id(p.getDefaultPendingColumnId()),
            "defaultCompletedColumnId",id(p.getDefaultCompletedColumnId())));return out;
    }
    public Map<String,Object> objectiveView(Access a,Objective o) {
        var out=fields("id",id(o.getId()),"projectId",id(o.getProject().getId()),"title",o.getTitle(),"dueDate",o.getDueDate(),
            "status",o.getStatus(),"position",o.getPosition(),"version",o.getVersion());
        if(a.taskRead()) out.put("taskCounts",counts(taskScope(a).and(equal("projectId",o.getProject().getId())).and(equal("objectiveId",o.getId()))));
        return out;
    }
    public Map<String,Object> columnView(ProjectColumn c) {
        return fields("id",id(c.getId()),"projectId",id(c.getProject().getId()),"name",c.getName(),"kind",c.getKind(),"position",c.getPosition(),"version",c.getVersion());
    }
    public Map<String,Object> taskBrief(Task t) {
        return fields("id",id(t.getId()),"title",t.getTitle(),"projectId",id(t.getProjectId()),"objectiveId",id(t.getObjectiveId()),"columnId",id(t.getColumnId()),
            "plannedDate",t.getPlannedDate(),"startTime",t.getStartTime(),"dueDate",t.getDueDate(),"priority",t.getPriority(),"status",t.getStatus(),"version",t.getVersion());
    }
    public Map<String,Object> taskDetail(Access a,Task t) {
        var out=taskBrief(t);
        out.putAll(fields("description",t.getDescription(),"position",t.getPosition(),"completedAt",t.getCompletedAt(),"createdAt",t.getCreatedAt(),
            "location",t.getLocation()==null?null:fields("address",t.getLocation().getAddress(),"latitude",t.getLocation().getLatitude(),"longitude",t.getLocation().getLongitude()),
            "labels",labels.forTasks(a.owner(),List.of(t.getId())).getOrDefault(t.getId(),List.of()).stream()
                .map(l->fields("id",id(l.id()),"name",l.name(),"color",l.color(),"version",l.version())).toList(),"project",null,"objective",null,"column",null));
        if(t.getProjectId()!=null) {
            Project p=project(a,t.getProjectId());out.put("project",fields("id",id(p.getId()),"title",p.getTitle(),"version",p.getVersion()));
            if(t.getObjectiveId()!=null) {var o=objective(a,p.getId(),t.getObjectiveId());out.put("objective",fields("id",id(o.getId()),"title",o.getTitle(),"version",o.getVersion()));}
            if(t.getColumnId()!=null) {var c=column(a,p.getId(),t.getColumnId());out.put("column",fields("id",id(c.getId()),"name",c.getName(),"kind",c.getKind(),"version",c.getVersion()));}
        }
        return out;
    }
    public long taskCount(Access a,long projectId,Long objectiveId) {
        project(a,projectId);
        Specification<Task> spec=taskScope(a).and(equal("projectId",projectId));
        return tasks.count(objectiveId==null?spec:spec.and(equal("objectiveId",objectiveId)));
    }
    private Map<String,Object> counts(Specification<Task> spec) {
        // Aggregate in the database, not by loading a board or a page of tasks.
        var b=em.getCriteriaBuilder();var q=b.createQuery(Object[].class);var r=q.from(Task.class);
        q.multiselect(r.get("status"),b.count(r)).where(spec.toPredicate(r,q,b)).groupBy(r.get("status"));
        var values=new EnumMap<Status,Long>(Status.class);
        for(Object[] row:em.createQuery(q).getResultList()) values.put((Status)row[0],(Long)row[1]);
        long total=values.values().stream().mapToLong(Long::longValue).sum(),cancelled=values.getOrDefault(Status.CANCELLED,0L);
        return fields("totalTasks",total,"nonCancelledTasks",total-cancelled,"completedTasks",values.getOrDefault(Status.CONCLUDED,0L),"cancelledTasks",cancelled);
    }
    private static <T> PageResult page(Page<T> page,Function<T,Map<String,Object>> project) {
        return new PageResult(page.getContent().stream().map(project).toList(),page.getNumber(),page.getSize(),page.getTotalElements(),page.hasNext());
    }
    private static WorkDomainException missing() { return new WorkDomainException("NOT_FOUND",null,"Recurso não encontrado."); }
    private static WorkDomainException gone() { return new WorkDomainException("RESOURCE_GONE",null,"O recurso foi excluído. Consulte o estado antes de uma nova intenção."); }
}
