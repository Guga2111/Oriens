package com.oriens.oriens_api.service;

import com.oriens.oriens_api.configuration.ProductClockConfiguration;
import com.oriens.oriens_api.entity.enums.RecurrencePattern;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

/** Atomic occurrence claims survive entry deletion. No payment assertions or legacy backfill. */
@Service @RequiredArgsConstructor
public class RecurringFinancialService {
    private final JdbcTemplate db;
    private final Clock clock;
    private record Parent(long id,LocalDate start,LocalDate end,LocalDate processingFrom,RecurrencePattern pattern) {}
    @Transactional public int generate() {
        LocalDate coverage=db.queryForObject("select started_on from statistics_coverage where id=1 for update",LocalDate.class);
        LocalDate today=LocalDate.now(clock.withZone(ProductClockConfiguration.ZONE));
        List<Parent> parents=db.query("select id,entry_date,recurrence_end_date,recurrence_started_on,recurrence_pattern from financial_entry where is_recurring=true and parent_entry_id is null and entry_date<? order by id for update",
            (r,i)->new Parent(r.getLong(1),r.getObject(2,LocalDate.class),r.getObject(3,LocalDate.class),r.getObject(4,LocalDate.class),r.getString(5)==null?null:RecurrencePattern.valueOf(r.getString(5))),today);
        int generated=0;
        for(Parent p:parents) {
            int before=generated;
            if(p.pattern==null)continue;
            LocalDate start=p.start.plusDays(1).isAfter(coverage)?p.start.plusDays(1):coverage;
            if(p.processingFrom.isAfter(start))start=p.processingFrom;
            LocalDate end=p.end!=null && p.end.isBefore(today)?p.end:today;
            for(LocalDate d=start;!d.isAfter(end);d=d.plusDays(1)) {
                if(!scheduled(p.start,d,p.pattern))continue;
                int claim=db.update("insert into financial_occurrences(parent_entry_id,entry_date) values(?,?) on conflict do nothing",p.id,d);
                if(claim==0)continue;
                Long id=db.queryForObject("""
                    insert into financial_entry(user_id,tag_id,amount,description,entry_date,is_recurring,parent_entry_id,created_at)
                    select user_id,tag_id,amount,description,?,false,id,current_timestamp from financial_entry where id=? returning id
                    """,Long.class,d,p.id);
                db.update("update financial_occurrences set entry_id=? where parent_entry_id=? and entry_date=?",id,p.id,d);
                generated++;
            }
            if(generated>before) db.update("update financial_entry set version=version+1,updated_at=current_timestamp where id=?",p.id);
        }
        return generated;
    }
    public static boolean scheduled(LocalDate anchor,LocalDate day,RecurrencePattern pattern) {
        if(!day.isAfter(anchor))return false;
        long elapsed=ChronoUnit.DAYS.between(anchor,day);
        return switch(pattern) {
            case DAILY -> true;
            case WEEKLY -> elapsed%7==0;
            case BIWEEKLY -> elapsed%14==0;
            case MONTHLY,QUARTERLY,SEMIANNUALLY,YEARLY -> {
                int step=switch(pattern){case MONTHLY->1;case QUARTERLY->3;case SEMIANNUALLY->6;default->12;};
                long months=ChronoUnit.MONTHS.between(YearMonth.from(anchor),YearMonth.from(day));
                yield months>0 && months%step==0 && day.getDayOfMonth()==Math.min(anchor.getDayOfMonth(),day.lengthOfMonth());
            }
        };
    }
}
