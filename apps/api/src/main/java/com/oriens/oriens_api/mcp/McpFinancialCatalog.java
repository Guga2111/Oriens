package com.oriens.oriens_api.mcp;

import java.util.*;
import static com.oriens.oriens_api.mcp.McpWorkCatalog.*;
import static com.oriens.oriens_api.service.ScopedWorkReadService.fields;

/** Financial permissions are independent of projects and standalone tasks. */
final class McpFinancialCatalog {
    private McpFinancialCatalog() {}
    private static final Map<String,Object> MONEY=Map.of("type","string","pattern","^-?(?:0|[1-9][0-9]{0,9})\\.[0-9]{2}$"),
        DESCRIPTION=Map.of("type","string","maxLength",255),
        PATTERN=choices("DAILY","WEEKLY","BIWEEKLY","MONTHLY","QUARTERLY","SEMIANNUALLY","YEARLY");
    static final Map<String,Object> ENTRY=complete(fields("id",ID,"version",VERSION,"amount",MONEY,"entryDate",DATE,
        "description",nullable(TEXT),"tagId",ID,"isRecurring",BOOL,"recurrencePattern",nullable(PATTERN),
        "recurrenceEndDate",nullable(DATE),"parentEntryId",nullable(ID),"isGenerated",BOOL,
        "createdAt",TEXT,"updatedAt",nullable(TEXT)));
    private static final Map<String,Object> TOTAL_MONEY=Map.of("type","string","pattern","^-?(?:0|[1-9][0-9]*)\\.[0-9]{2}$");
    private static final Map<String,Object> TOTALS=fields("income",TOTAL_MONEY,"expenses",TOTAL_MONEY,"result",TOTAL_MONEY,"entries",COUNT);
    private static Map<String,Object> inputFields() { return fields("amount",MONEY,"entryDate",DATE,"description",nullable(DESCRIPTION),
        "tagId",ID,"isRecurring",BOOL,"recurrencePattern",nullable(PATTERN),"recurrenceEndDate",nullable(DATE)); }
    static final List<Definition> ALL=List.of(
        definition("list_financial_categories","finance:read",false,false,"Categorias da conta para interpretar lançamentos e escolher uma categoria. Não concede escrita de categorias.",
            object(paging("")),page(complete(fields("id",ID,"name",TEXT,"color",nullable(TEXT),"allowNegative",BOOL,"isDefault",BOOL)))),
        definition("list_financial_entries","finance:read",false,false,"Lançamentos da conta, incluindo origens e ocorrências automáticas. Valores negativos são despesas. Datas futuras são permitidas nesta lista.",
            object(extend(sortedPaging("entryDate","id","entryDate","amount","createdAt"),"startDate",DATE,"endDate",DATE,"tagId",ID,"search",TEXT)),page(ENTRY)),
        definition("get_financial_entry","finance:read",false,false,"Detalhe e versão do lançamento. Uma ocorrência automática não é editável; parentEntryId identifica sua origem.",
            object(fields("entryId",ID),"entryId"),ENTRY),
        definition("get_financial_summary","finance:read",false,false,"Resumo exato de TODOS os lançamentos do filtro. Até 366 dias inclusivos, fim não futuro. Despesas são positivas; resultado é assinado. Composição por categoria tem paginação independente.",
            object(extend(paging("categories"),"startDate",DATE,"endDate",DATE,"tagId",ID,"search",TEXT),"startDate","endDate"),
            complete(extend(TOTALS,"startDate",DATE,"endDate",DATE,"categories",page(complete(extend(TOTALS,"tagId",ID,"name",TEXT)))))),
        definition("create_financial_entry","finance:create",true,false,"Cria lançamento na conta. Dinheiro é string com duas casas, sem milhar. Categoria deve pertencer à conta e permitir negativos. Recorrências seguem o calendário Oriens. Repetição exige a mesma chave UUID.",
            object(extend(inputFields(),"idempotencyKey",UUID_SCHEMA),"idempotencyKey","amount","entryDate","tagId","isRecurring"),ENTRY),
        definition("update_financial_entry","finance:update",true,false,"Patch atômico com versão e chave UUID. Ausente preserva; null limpa descrição ou dados opcionais de recorrência. Ocorrências automáticas não são editáveis. Com histórico, preserve início/frequência e encerre pela data final.",
            object(extend(inputFields(),"idempotencyKey",UUID_SCHEMA,"entryId",ID,"expectedVersion",VERSION),"idempotencyKey","entryId","expectedVersion"),ENTRY),
        definition("delete_financial_entry","finance:delete",true,true,"Exclui lançamento com versão e chave UUID. Uma origem com histórico não pode ser excluída. Excluir ocorrência preserva seu claim; o scheduler não a recria. Replay confirma a exclusão original.",
            object(fields("idempotencyKey",UUID_SCHEMA,"entryId",ID,"expectedVersion",VERSION),"idempotencyKey","entryId","expectedVersion"),complete(fields("id",ID,"deleted",BOOL)))
    );
}
