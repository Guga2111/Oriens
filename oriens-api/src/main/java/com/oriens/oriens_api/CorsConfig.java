package com.oriens.oriens_api;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @org.springframework.beans.factory.annotation.Value("${oriens.mcp.enabled:false}") private boolean mcpEnabled;
    @org.springframework.beans.factory.annotation.Value("${oriens.mcp.frontend:}") private String mcpFrontend;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        var origins = new java.util.ArrayList<>(java.util.List.of("http://localhost:5173", "https://oriens.luisgosampaio.com", "http://oriens.luisgosampaio.com"));
        if (mcpEnabled && !mcpFrontend.isBlank()) origins.add(mcpFrontend.replaceAll("/$", ""));
        registry.addMapping("/**") //
                .allowedOrigins(origins.toArray(String[]::new))
                .allowedMethods("GET", "POST", "PUT", "PATCH","DELETE", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("Authorization", "ETag", "X-Request-Id")
                .allowCredentials(true);
    }
}