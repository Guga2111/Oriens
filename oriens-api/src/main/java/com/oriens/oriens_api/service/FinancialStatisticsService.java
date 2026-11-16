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
    public record CategoryTotals(long tagId,String name,Money totals) {}
    public record FilteredSummary(Money totals,org.springframework.data.domain.Page<CategoryTotals> categories) {}

    /** One SQL statement gives totals and category composition the same MVCC snapshot even
     * inside the delegated authorization transaction. OFFSET never truncates the aggregates. */
    public FilteredSummary filteredSummary(Long owner,LocalDate start,LocalDate end,Long tagId,String search,
            org.springframework.data.domain.Pageable page) {
        Period.of(start,end,clock);
        if(tagId!=null && db.queryForObject("select count(*) from tags where user_id=? and id=?",Long.class,owner,tagId)!=1)
            throw new com.oriens.oriens_api.exception.WorkDomainException("NOT_FOUND","tagId","Categoria não encontrada.");
        String query=search==null||search.isBlank()?null:search.strip();
        return db.query("""
            with filtered as materialized (
                select e.amount,e.tag_id,t.name from financial_entry e join tags t on t.id=e.tag_id and t.user_id=e.user_id
                where e.user_id=? and e.entry_date between ? and ?
                  and (?::bigint is null or e.tag_id=?)
                  and (?::text is null or lower(e.description) like lower('%'||?||'%'))
            ), totals as (
                select coalesce(sum(amount) filter(where amount>0),0) income,
                    coalesce(-sum(amount) filter(where amount<0),0) expenses,count(*) entries from filtered
            ), categories as (
                select tag_id,name,coalesce(sum(amount) filter(where amount>0),0) income,
                    coalesce(-sum(amount) filter(where amount<0),0) expenses,count(*) entries
                from filtered group by tag_id,name
            )
            select t.income,t.expenses,t.entries,(select count(*) from categories) category_count,
                c.tag_id,c.name,c.income,c.expenses,c.entries
            from totals t left join (select * from categories order by lower(name),tag_id limit ? offset ?) c on true
            order by lower(c.name),c.tag_id
            """,rs->{
                Money total=null;long count=0;var categories=new ArrayList<CategoryTotals>();
                while(rs.next()) {
                    total=new Money(rs.getBigDecimal(1),rs.getBigDecimal(2),rs.getBigDecimal(1).subtract(rs.getBigDecimal(2)),rs.getLong(3));count=rs.getLong(4);
                    if(rs.getObject(5)!=null) categories.add(new CategoryTotals(rs.getLong(5),rs.getString(6),
                        new Money(rs.getBigDecimal(7),rs.getBigDecimal(8),rs.getBigDecimal(7).subtract(rs.getBigDecimal(8)),rs.getLong(9))));
                }
                return new FilteredSummary(total,new org.springframework.data.domain.PageImpl<>(categories,page,count));
            },owner,start,end,tagId,tagId,query,query,page.getPageSize(),page.getOffset());
    }
    private Money money(Long owner, LocalDate start, LocalDate end) {
        return db.queryForObject("""
            select coalesce(sum(amount) filter(where amount>0),0),coalesce(-sum(amount) filter(where amount<0),0),count(*)
            from financial_entry where user_id=? and entry_date between ? and ?
            """,(r,i)->{BigDecimal income=r.getBigDecimal(1),expenses=r.getBigDecimal(2);return new Money(income,expenses,income.subtract(expenses),r.getLong(3));},owner,start,end);
    }
}
