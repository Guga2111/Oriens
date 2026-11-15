package com.oriens.oriens_api.controller.scheduler;

import com.oriens.oriens_api.service.RecurringFinancialService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component @RequiredArgsConstructor @Slf4j
public class RecurringFinancialScheduler {
    private final RecurringFinancialService recurring;
    @Scheduled(cron="0 * * * * *",zone="America/Recife")
    public void createRecurringFinancialEntries() {
        try {int generated=recurring.generate();if(generated>0)log.info("Generated {} registered financial occurrences",generated);}
        catch(Exception e){log.error("Financial recurrence processing failed; transaction rolled back",e);}
    }
}
