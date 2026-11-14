package com.oriens.oriens_api.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.time.Clock;
import java.time.ZoneId;

@Configuration
public class ProductClockConfiguration {
    public static final ZoneId ZONE = ZoneId.of("America/Recife");
    @Bean public Clock productClock() { return Clock.system(ZONE); }
}
