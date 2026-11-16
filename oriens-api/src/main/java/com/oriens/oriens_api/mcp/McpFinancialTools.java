package com.oriens.oriens_api.mcp;

import com.fasterxml.jackson.databind.*;
import com.oriens.oriens_api.entity.dto.financial.*;
import com.oriens.oriens_api.entity.dto.financial.FinancialCommands.*;
import com.oriens.oriens_api.entity.enums.RecurrencePattern;
import com.oriens.oriens_api.service.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.data.domain.*;
import java.util.*;
import static com.oriens.oriens_api.mcp.McpWorkTools.*;
import static com.oriens.oriens_api.service.ScopedWorkReadService.fields;

/** Financial adaptation only: the shared service owns state, preconditions, receipts and recurrence. */
public class McpFinancialTools {
    private final FinancialEntryServiceImpl finance;
    private final FinancialStatisticsService statistics;
    private final JdbcTemplate db;
    private final ObjectMapper json;
    public McpFinancialTools(FinancialEntryServiceImpl finance,FinancialStatisticsService statistics,JdbcTemplate db,ObjectMapper json) {
        this.finance=finance;this.statistics=statistics;this.db=db;this.json=json;
    }
    static boolean handles(String name) { return name.contains("_financial_"); }
    public Object read(String name,McpStore.Policy policy,JsonNode n,Pageable page) {
        policy.require("finance:read");long owner=policy.userId();
        return switch(name) {
            case "oriens_list_financial_categories" -> {
                long total=db.queryForObject("select count(*) from tags where user_id=?",Long.class,owner);
                var rows=db.query("select id,name,color,allow_negative,is_default from tags where user_id=? order by lower(name),id limit ? offset ?",
                    (r,i)->fields("id",r.getString(1),"name",r.getString(2),"color",r.getString(3),"allowNegative",r.getBoolean(4),"isDefault",r.getBoolean(5)),owner,page.getPageSize(),page.getOffset());
                yield page(new PageImpl<>(rows,page,total));
            }
            case "oriens_list_financial_entries" -> {
                WorkReadService.interval(date(n,"startDate"),date(n,"endDate"));
                yield page(finance.filtered(owner,date(n,"startDate"),date(n,"endDate"),id(n,"tagId"),text(n,"search"),page).map(McpFinancialTools::entry));
            }
            case "oriens_get_financial_entry" -> entry(finance.getEntry(id(n,"entryId"),owner));
            case "oriens_get_financial_summary" -> {
                var categoriesPage=PageRequest.of(integer(n,"categoriesPage",0),integer(n,"categoriesPageSize",20));
                McpStore.page(categoriesPage.getPageNumber(),categoriesPage.getPageSize());
                var summary=statistics.filteredSummary(owner,date(n,"startDate"),date(n,"endDate"),id(n,"tagId"),text(n,"search"),categoriesPage);
                var out=money(summary.totals());out.put("startDate",text(n,"startDate"));out.put("endDate",text(n,"endDate"));
                out.put("categories",page(summary.categories().map(c->{var row=money(c.totals());row.put("tagId",Long.toString(c.tagId()));row.put("name",c.name());return row;})));yield out;
            }
            default -> throw new IllegalStateException("Unregistered financial read");
        };
    }
    public WorkCreationService.Completed write(String name,McpStore.Policy policy,JsonNode n) {
        policy.require("finance:read");
        Command command;
        if (name.equals("oriens_create_financial_entry")) command=new Create(new Input(new java.math.BigDecimal(text(n,"amount")),date(n,"entryDate"),text(n,"description"),id(n,"tagId"),
            bool(n,"isRecurring"),enumeration(n,"recurrencePattern",RecurrencePattern.class),date(n,"recurrenceEndDate")));
        else if (name.equals("oriens_delete_financial_entry")) command=new Delete(id(n,"entryId"),version(n,"expectedVersion"));
        else {
            var patch=new Patch();
            for(String field:List.of("amount","entryDate","description","tagId","isRecurring","recurrencePattern","recurrenceEndDate"))if(n.has(field)) {
                // Domain IDs are Longs; money remains a decimal through the entire path.
                patch.set(field,field.equals("tagId")&&!n.get(field).isNull()?json.valueToTree(id(n,field)):n.get(field));
            }
            command=new Update(id(n,"entryId"),version(n,"expectedVersion"),patch);
        }
        return finance.write(policy.userId(),"mcp:"+policy.connectionId()+":"+name,text(n,"idempotencyKey"),command);
    }
    public Object result(String name,Object body) {
        if (name.equals("oriens_delete_financial_entry")) {var node=json.valueToTree(body);return fields("id",node.path("id").asText(),"deleted",true);}
        return entry(json.convertValue(body,EntryDTO.class));
    }
    private static Map<String,Object> money(com.oriens.oriens_api.entity.dto.statistics.StatisticsViews.Money m) {
        return fields("income",decimal(m.income()),"expenses",decimal(m.expenses()),"result",decimal(m.result()),"entries",m.entries());
    }
    private static String decimal(java.math.BigDecimal n) { return n.setScale(2,java.math.RoundingMode.UNNECESSARY).toPlainString(); }
    private static Map<String,Object> entry(EntryDTO e) {
        return fields("id",e.getId().toString(),"version",e.getVersion(),"amount",decimal(e.getAmount()),"entryDate",e.getEntryDate().toString(),
            "description",e.getDescription(),"tagId",e.getTagId().toString(),"isRecurring",e.getIsRecurring(),"recurrencePattern",e.getRecurrencePattern(),
            "recurrenceEndDate",e.getRecurrenceEndDate(),"parentEntryId",e.getParentEntryId()==null?null:e.getParentEntryId().toString(),
            "isGenerated",e.getParentEntryId()!=null,"createdAt",e.getCreatedAt().toString(),"updatedAt",e.getUpdatedAt()==null?null:e.getUpdatedAt().toString());
    }
    private static Map<String,Object> page(Page<?> p) {
        return fields("items",p.getContent(),"page",p.getNumber(),"pageSize",p.getSize(),"totalElements",p.getTotalElements(),"hasNext",p.hasNext());
    }
}
