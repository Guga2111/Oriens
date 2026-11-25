package com.oriens.oriens_api.service;

import com.oriens.oriens_api.configuration.ProductClockConfiguration;
import com.oriens.oriens_api.entity.dto.statistics.HabitViews.*;
import com.oriens.oriens_api.entity.dto.statistics.StatisticsViews.DayCount;
import com.oriens.oriens_api.entity.dto.statistics.StatisticsViews.Period;
import com.oriens.oriens_api.exception.WorkDomainException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.time.*;
import java.util.*;
import java.util.stream.*;

/** Habit lifecycle (fixed weekdays or a weekly target). Four bounded batch reads; never a query per day or habit. */
@Service @RequiredArgsConstructor @Transactional
public class HabitService {
    private final JdbcTemplate db;
    private final Clock clock;
    private record Row(Long id,String name,LocalDate createdOn,LocalDate start,LocalDate end,LocalDate archived,long version) {}
    private LocalDate today() {return LocalDate.now(clock.withZone(ProductClockConfiguration.ZONE));}
    private void lock(Long owner) {db.queryForObject("select id from users where id=? for update",Long.class,owner);}
    private Row owned(Long owner,Long id) {
        return db.query("select id,name,created_on,start_date,end_date,archived_on,version from habits where user_id=? and id=?",(r,i)->
            new Row(r.getLong(1),r.getString(2),r.getObject(3,LocalDate.class),r.getObject(4,LocalDate.class),r.getObject(5,LocalDate.class),r.getObject(6,LocalDate.class),r.getLong(7)),owner,id)
            .stream().findFirst().orElseThrow(()->fail("NOT_FOUND","habit","Hábito não encontrado."));
    }
    public boolean exists(Long owner,Long id) {return db.queryForObject("select count(*) from habits where user_id=? and id=?",Long.class,owner,id)>0;}
    private void version(Row h,Long v) {
        if(v==null) throw fail("PRECONDITION_REQUIRED","version","Informe a versão do hábito.");
        if(v!=h.version)throw fail("VERSION_CONFLICT","version","O hábito mudou. Recarregue antes de salvar.");
    }
    private String name(String name) {
        if(name==null || name.strip().isEmpty() || name.strip().length()>100 || name.chars().anyMatch(Character::isISOControl))
            throw fail("INVALID_REQUEST","name","Informe um nome de até 100 caracteres.");
        return name.strip();
    }
    private static final int EVERY_DAY=127;
    /** Fixed weekdays become their mask; a weekly target makes every weekday eligible. */
    private int mask(List<Integer> weekdays,Integer weeklyTarget) {
        if(weeklyTarget!=null) {
            if(weekdays!=null && !weekdays.isEmpty())throw fail("INVALID_REQUEST","weeklyTarget","Escolha dias fixos ou uma meta semanal, não ambos.");
            if(weeklyTarget<1 || weeklyTarget>7)throw fail("INVALID_REQUEST","weeklyTarget","A meta semanal deve ficar entre 1 e 7 vezes.");
            return EVERY_DAY;
        }
        if(weekdays==null || weekdays.isEmpty() || weekdays.stream().anyMatch(d->d==null || d<1 || d>7)
                || new HashSet<>(weekdays).size()!=weekdays.size())throw fail("INVALID_REQUEST","weekdays","Escolha dias da semana distintos.");
        return weekdays.stream().mapToInt(d->1<<(d-1)).reduce(0,(a,b)->a|b);
    }
    private List<Integer> weekdays(int mask) {return IntStream.rangeClosed(1,7).filter(d->(mask & (1<<(d-1)))!=0).boxed().toList();}
    public Habit create(Long owner,Input input) {
        lock(owner);String name=name(input.name());int days=mask(input.weekdays(),input.weeklyTarget());
        if(input.startDate()==null || input.startDate().isBefore(today()) || (input.endDate()!=null && input.endDate().isBefore(input.startDate())))
            throw fail("INVALID_REQUEST","startDate","O hábito deve começar hoje ou no futuro; o fim não pode anteceder o início.");
        Long id=db.queryForObject("insert into habits(user_id,name,created_on,start_date,end_date) values(?,?,?,?,?) returning id",Long.class,owner,name,today(),input.startDate(),input.endDate());
        db.update("insert into habit_schedules(habit_id,user_id,start_date,weekdays,weekly_target) values(?,?,?,?,?)",id,owner,input.startDate(),days,input.weeklyTarget());
        return current(owner,id);
    }
    public Habit update(Long owner,Long id,Update input) {
        lock(owner);Row h=owned(owner,id);version(h,input.version());
        if(h.archived!=null)throw fail("INVALID_REQUEST","habit","Hábitos arquivados preservam seu histórico.");
        int days=mask(input.weekdays(),input.weeklyTarget());String name=name(input.name());
        LocalDate effective=today().plusDays(1).isAfter(h.start)?today().plusDays(1):h.start;
        // Replace only a not-yet-effective revision. Past definitions remain unchanged.
        db.update("delete from habit_schedules where habit_id=? and user_id=? and start_date>=?",id,owner,effective);
        db.update("update habit_schedules set end_date=? where habit_id=? and user_id=? and (end_date is null or end_date>=?)",effective.minusDays(1),id,owner,effective);
        db.update("insert into habit_schedules(habit_id,user_id,start_date,weekdays,weekly_target) values(?,?,?,?,?)",id,owner,effective,days,input.weeklyTarget());
        db.update("update habits set name=?,version=version+1 where user_id=? and id=?",name,owner,id);
        return current(owner,id);
    }
    public Habit execute(Long owner,Long id,LocalDate date,Execution input) {
        lock(owner);Row h=owned(owner,id);version(h,input.version());
        if(date==null || date.isAfter(today()) || date.isBefore(h.createdOn))throw fail("INVALID_REQUEST","date","Escolha uma data programada, desde o cadastro até hoje.");
        Habit habit=summary(owner,date,date).habits().stream().filter(v->v.id().equals(id)).findFirst().orElseThrow();
        String state=habit.days().get(0).state();
        if(!HabitCalendar.EXECUTABLE.contains(state))throw fail("INVALID_REQUEST","date","Este dia não possui uma ocorrência prevista.");
        boolean already=state.equals("DONE");
        if(already!=input.completed()) {
            if(input.completed())db.update("insert into habit_executions(habit_id,user_id,execution_date) values(?,?,?) on conflict do nothing",id,owner,date);
            else db.update("delete from habit_executions where habit_id=? and user_id=? and execution_date=?",id,owner,date);
            db.update("update habits set version=version+1 where user_id=? and id=?",owner,id);
        }
        return current(owner,id);
    }
    public Habit pause(Long owner,Long id,PauseInput input) {
        lock(owner);Row h=owned(owner,id);version(h,input.version());
        LocalDate start=input.startDate(),end=input.endDate();
        if(start==null || end==null || start.isBefore(today()) || end.isBefore(start) || h.archived!=null
                || start.isBefore(h.start) || (h.end!=null && end.isAfter(h.end)))throw fail("INVALID_REQUEST","startDate","Pause a partir de hoje, dentro da vigência do hábito.");
        if(db.queryForObject("select count(*) from habit_pauses where habit_id=? and start_date<=? and end_date>=?",Long.class,id,end,start)>0)
            throw fail("INVALID_REQUEST","startDate","Já existe uma pausa nesse intervalo.");
        if(db.queryForObject("select count(*) from habit_executions where habit_id=? and execution_date between ? and ?",Long.class,id,start,end)>0)
            throw fail("INVALID_REQUEST","startDate","Desmarque a execução de hoje antes de pausar esse dia.");
        db.update("insert into habit_pauses(habit_id,user_id,start_date,end_date) values(?,?,?,?)",id,owner,start,end);
        db.update("update habits set version=version+1 where user_id=? and id=?",owner,id);
        return current(owner,id);
    }
    public Habit archive(Long owner,Long id,Long expected) {
        lock(owner);Row h=owned(owner,id);version(h,expected);
        if(h.archived==null)db.update("update habits set archived_on=?,version=version+1 where user_id=? and id=?",today().plusDays(1),owner,id);
        return current(owner,id);
    }
    private Habit current(Long owner,Long id) {return summary(owner,today(),today()).habits().stream().filter(h->h.id().equals(id)).findFirst().orElseThrow();}
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Summary summary(Long owner,LocalDate start,LocalDate end) {
        Period p=Period.of(start,end,clock);
        List<Row> rows=db.query("select id,name,created_on,start_date,end_date,archived_on,version from habits where user_id=? order by archived_on nulls first,lower(name),id",(r,i)->
            new Row(r.getLong(1),r.getString(2),r.getObject(3,LocalDate.class),r.getObject(4,LocalDate.class),r.getObject(5,LocalDate.class),r.getObject(6,LocalDate.class),r.getLong(7)),owner);
        Map<Long,List<Schedule>> schedules=new HashMap<>();
        db.query("select habit_id,start_date,end_date,weekdays,weekly_target from habit_schedules where user_id=? order by start_date",r->{
            schedules.computeIfAbsent(r.getLong(1),k->new ArrayList<>()).add(new Schedule(r.getObject(2,LocalDate.class),r.getObject(3,LocalDate.class),weekdays(r.getInt(4)),r.getObject(5,Integer.class)));},owner);
        Map<Long,List<Pause>> pauses=new HashMap<>();
        db.query("select habit_id,start_date,end_date from habit_pauses where user_id=? order by start_date",r->{
            pauses.computeIfAbsent(r.getLong(1),k->new ArrayList<>()).add(new Pause(r.getObject(2,LocalDate.class),r.getObject(3,LocalDate.class)));},owner);
        // Whole ISO weeks: a weekly target judges each day against every execution of its week.
        Map<Long,Set<LocalDate>> executions=new HashMap<>();
        db.query("select habit_id,execution_date from habit_executions where user_id=? and execution_date between ? and ?",r->{
            executions.computeIfAbsent(r.getLong(1),k->new HashSet<>()).add(r.getObject(2,LocalDate.class));},owner,p.previousStartDate().with(DayOfWeek.MONDAY),end.with(DayOfWeek.SUNDAY));
        Map<LocalDate,Long> totals=new HashMap<>();List<Habit> values=new ArrayList<>();
        for(Row h:rows) {
            List<Schedule> ss=schedules.getOrDefault(h.id,List.of());List<Pause> ps=pauses.getOrDefault(h.id,List.of());
            List<Day> days=new ArrayList<>();long completed=0,expected=0,previousCompleted=0,previousExpected=0;
            HabitCalendar calendar=calendar(h,ss,ps,executions.getOrDefault(h.id,Set.of()),p.today());
            for(LocalDate d=p.previousStartDate();!d.isAfter(end);d=d.plusDays(1)) {
                String state=calendar.state(d);
                boolean done=state.equals("DONE"),planned=HabitCalendar.EXPECTED.contains(state);
                if(done)totals.merge(d,1L,Long::sum);
                if(!d.isBefore(start)) {days.add(new Day(d,state));if(done)completed++;if(planned)expected++;}
                else {if(done)previousCompleted++;if(planned)previousExpected++;}
            }
            values.add(new Habit(h.id,h.name,h.createdOn,h.start,h.end,h.archived,h.version,ss,ps,days,completed,expected,previousCompleted,previousExpected));
        }
        LocalDate coverage=db.queryForObject("select greatest(c.started_on,u.statistics_started_on) from statistics_coverage c cross join users u where c.id=1 and u.id=?",LocalDate.class,owner);
        return new Summary(p,coverage,values,counts(start,end,totals),counts(p.previousStartDate(),p.previousEndDate(),totals),
            values.stream().mapToLong(Habit::completed).sum(),values.stream().mapToLong(Habit::expected).sum(),
            values.stream().mapToLong(Habit::previousCompleted).sum(),values.stream().mapToLong(Habit::previousExpected).sum());
    }
    private List<DayCount> counts(LocalDate start,LocalDate end,Map<LocalDate,Long> counts) {
        return start.datesUntil(end.plusDays(1)).map(d->new DayCount(d,counts.getOrDefault(d,0L))).toList();
    }
    private HabitCalendar calendar(Row h,List<Schedule> schedules,List<Pause> pauses,Set<LocalDate> executions,LocalDate today) {
        LocalDate from=h.start.isBefore(h.createdOn)?h.createdOn:h.start;
        LocalDate until=h.archived==null?h.end:(h.end==null || h.archived.minusDays(1).isBefore(h.end)?h.archived.minusDays(1):h.end);
        return new HabitCalendar(from,until,schedules,pauses,executions,today);
    }
    private static WorkDomainException fail(String code,String field,String message){return new WorkDomainException(code,field,message);}
}
