package com.oriens.oriens_api.configuration;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.type.filter.AssignableTypeFilter;

import static org.assertj.core.api.Assertions.assertThat;

class DataInitializerProfileTest {
    @Test void demoInitializerIsOnlyRegisteredInDevelopmentAndNeverAlongsideProduction() {
        assertThat(registered("dev")).isTrue();
        assertThat(registered()).isFalse();
        assertThat(registered("test")).isFalse();
        assertThat(registered("prod")).isFalse();
        assertThat(registered("dev", "prod")).isFalse();
    }

    private boolean registered(String... profiles) {
        StandardEnvironment environment = new StandardEnvironment();
        environment.setActiveProfiles(profiles);
        var scanner = new ClassPathScanningCandidateComponentProvider(false, environment);
        scanner.addIncludeFilter(new AssignableTypeFilter(DataInitializer.class));
        return scanner.findCandidateComponents(DataInitializer.class.getPackageName()).stream()
            .anyMatch(bean -> DataInitializer.class.getName().equals(bean.getBeanClassName()));
    }
}
