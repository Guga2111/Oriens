package com.oriens.oriens_api;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class CorsConfig {
    @org.springframework.beans.factory.annotation.Value("${oriens.mcp.enabled:false}") private boolean mcpEnabled;
    @org.springframework.beans.factory.annotation.Value("${oriens.mcp.frontend:}") private String mcpFrontend;

    @Bean
    public UrlBasedCorsConfigurationSource corsConfigurationSource() {
        var origins = new java.util.ArrayList<>(java.util.List.of("http://localhost:5173", "https://oriens.luisgosampaio.com", "http://oriens.luisgosampaio.com"));
        if (mcpEnabled && !mcpFrontend.isBlank()) origins.add(mcpFrontend.replaceAll("/$", ""));
        var configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(java.util.List.of("*"));
        configuration.setExposedHeaders(java.util.List.of("Authorization", "ETag", "X-Request-Id"));
        configuration.setAllowCredentials(true);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}