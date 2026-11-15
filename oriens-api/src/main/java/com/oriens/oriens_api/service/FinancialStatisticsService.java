package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.dto.statistics.StatisticsViews.*;
import com.oriens.oriens_api.entity.dto.statistics.StatisticsViews.Period;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
public class FinancialStatisticsService {
    private final JdbcTemplate db;
    private final Clock clock;
    public Finance summary(Long owner, LocalDate start, LocalDate end) {
        Period p=Period.of(start,end,clock);
        List<MoneyDay> days=db.query("""
            select entry_date,coalesce(sum(amount) filter(where amount>0),0),coalesce(-sum(amount) filter(where amount<0),0)
            from financial_entry where user_id=? and entry_date between ? and ? group by entry_date order by entry_date
            """,(r,i)->new MoneyDay(r.getObject(1,LocalDate.class),r.getBigDecimal(2),r.getBigDecimal(3)),owner,start,end);
        List<Category> categories=db.query("""
            select e.tag_id,t.name,-sum(e.amount),count(*) from financial_entry e
            join tags t on t.id=e.tag_id and t.user_id=e.user_id
            where e.user_id=? and e.amount<0 and e.entry_date between ? and ?
            group by e.tag_id,t.name order by -sum(e.amount) desc,t.name,e.tag_id
            """,(r,i)->new Category(r.getLong(1),r.getString(2),r.getBigDecimal(3),r.getLong(4)),owner,start,end);
        long automatic=db.queryForObject("select count(*) from financial_entry where user_id=? and parent_entry_id is not null and entry_date between ? and ?",Long.class,owner,start,end);
        return new Finance(p,money(owner,start,end),money(owner,p.previousStartDate(),p.previousEndDate()),days,categories,automatic);
    }
    private Money money(Long owner, LocalDate start, LocalDate end) {
        return db.queryForObject("""
            select coalesce(sum(amount) filter(where amount>0),0),coalesce(-sum(amount) filter(where amount<0),0),count(*)
            from financial_entry where user_id=? and entry_date between ? and ?
            """,(r,i)->{BigDecimal income=r.getBigDecimal(1),expenses=r.getBigDecimal(2);return new Money(income,expenses,income.subtract(expenses),r.getLong(3));},owner,start,end);
    }
}
