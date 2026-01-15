package com.oriens.oriens_api.controller.scheduler;

import com.oriens.oriens_api.entity.FinancialEntry;
import com.oriens.oriens_api.entity.enums.RecurrencePattern;
import com.oriens.oriens_api.repository.FinancialEntryRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@AllArgsConstructor
@Component
@Slf4j
public class RecurringFinancialScheduler {

    private final FinancialEntryRepository financialEntryRepository;

    @Scheduled(cron = "0 * * * * ?")
    public void createRecurringFinancialEntries () {

        LocalDate today = LocalDate.now();

        log.info("Iniciando processamento de entradas recorrentes para {}", today);

        try {
            List<FinancialEntry> recurringEntries =  financialEntryRepository.findRecurringEntriesToProcess(today, today);

            if (recurringEntries.isEmpty()) {
                log.debug("Nenhuma entrada recorrente para processar hoje");
                return;
            }

            log.info("Encontradas {} entradas recorrentes para processar", recurringEntries.size());

            int successCount = 0;
            int errorCount = 0;


            for (FinancialEntry parentEntry : recurringEntries) {
                try {
                    if (shouldCreateEntryToday(parentEntry, today)) {
                        processRecurringEntry(parentEntry, today);
                        successCount++;
                    }
                } catch (Exception e) {
                    errorCount++;
                    log.error("Erro ao processar entrada recorrente ID {}: {}",
                            parentEntry.getId(), e.getMessage(), e);
                }
            }

            log.info("Processamento finalizado - Sucesso: {}, Erros: {}", successCount, errorCount);
        } catch (Exception e) {
            log.error("Erro geral no processamento de recorrências: {}", e.getMessage(), e);
        }
    }

    private void processRecurringEntry(FinancialEntry parentEntry, LocalDate executionDate) {
        log.debug("Processando entrada recorrente ID {} para data {}",
                parentEntry.getId(), executionDate);

        FinancialEntry newEntry = new FinancialEntry();
        newEntry.setUserId(parentEntry.getUserId());
        newEntry.setAmount(parentEntry.getAmount());
        newEntry.setEntryDate(executionDate);
        newEntry.setDescription(parentEntry.getDescription());
        newEntry.setTag(parentEntry.getTag());

        // Marca como entrada normal (não recorrente)
        newEntry.setIsRecurring(false);
        newEntry.setRecurrencePattern(null);
        newEntry.setRecurrenceEndDate(null);
        newEntry.setParentEntryId(parentEntry.getId());

        financialEntryRepository.save(newEntry);

        log.info("Entrada recorrente criada - Parent ID: {}, Nova ID: {}, Data: {}, Valor: {}",
                parentEntry.getId(), newEntry.getId(), executionDate, newEntry.getAmount());
    }

    private boolean shouldCreateEntryToday(FinancialEntry parentEntry, LocalDate today) {
        LocalDate startDate = parentEntry.getEntryDate();
        RecurrencePattern pattern = parentEntry.getRecurrencePattern();

        // Se hoje é antes da data inicial, não processa
        if (today.isBefore(startDate)) {
            return false;
        }

        // Se hoje é exatamente a data inicial, sempre processa
        if (today.isEqual(startDate)) {
            return true;
        }

        // Calcula quantos dias passaram desde o início
        long daysSinceStart = ChronoUnit.DAYS.between(startDate, today);

        return switch (pattern) {
            case DAILY -> true; // Todo dia

            case WEEKLY -> {
                yield daysSinceStart % 7 == 0;
            }

            case BIWEEKLY -> {
                yield daysSinceStart % 14 == 0;
            }

            case MONTHLY -> {
                yield startDate.getDayOfMonth() == today.getDayOfMonth();
            }

            case QUARTERLY -> {
                // A cada 3 meses, no mesmo dia
                long monthsSinceStart = ChronoUnit.MONTHS.between(startDate, today);
                yield monthsSinceStart % 3 == 0 && startDate.getDayOfMonth() == today.getDayOfMonth();
            }

            case SEMIANNUALLY -> {
                // A cada 6 meses, no mesmo dia
                long monthsSinceStart = ChronoUnit.MONTHS.between(startDate, today);
                yield monthsSinceStart % 6 == 0 && startDate.getDayOfMonth() == today.getDayOfMonth();
            }

            case YEARLY -> {
                boolean sameMonthAndDay = startDate.getMonthValue() == today.getMonthValue()
                        && startDate.getDayOfMonth() == today.getDayOfMonth();

                // Tratamento especial para 29 de fevereiro em anos não bissextos
                // Cria no dia 28/02 quando o ano não é bissexto
                boolean leap29FebWorkaround = startDate.getMonthValue() == 2
                        && startDate.getDayOfMonth() == 29
                        && today.getMonthValue() == 2
                        && today.getDayOfMonth() == 28
                        && !today.isLeapYear();

                yield sameMonthAndDay || leap29FebWorkaround;
            }
        };
    }
}
