package com.oriens.oriens_api.security;

import com.oriens.oriens_api.security.filters.AuthenticationFilter;
import com.oriens.oriens_api.security.filters.ExceptionHandlerFilter;
import com.oriens.oriens_api.security.filters.JWTAuthorizationFilter;
import com.oriens.oriens_api.security.manager.CustomAuthManager;
import com.oriens.oriens_api.service.UserServiceImpl;
import lombok.AllArgsConstructor;
import org.springframework.boot.security.autoconfigure.actuate.web.servlet.EndpointRequest;
import org.springframework.boot.actuate.autoconfigure.web.server.ConditionalOnManagementPort;
import org.springframework.boot.actuate.autoconfigure.web.server.ManagementPortType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@AllArgsConstructor
public class SecurityConfig {

    private final CustomAuthManager customAuthManager;
    private UserServiceImpl userService;

    /**
     * Management port only (never published nor proxied): Prometheus scrapes without a user token, so only
     * health and the scrape endpoint are open there and anything else exposed later stays denied. Absent
     * when management shares the public port, so metrics then fall to the JWT chain instead of going public.
     */
    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    @ConditionalOnManagementPort(ManagementPortType.DIFFERENT)
    public SecurityFilterChain actuatorFilterChain(HttpSecurity http) throws Exception {
        return http
                .securityMatcher(EndpointRequest.toAnyEndpoint())
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(authz -> authz
                        .requestMatchers(EndpointRequest.to("health", "prometheus")).permitAll()
                        .anyRequest().denyAll())
                .build();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, com.auth0.jwt.algorithms.Algorithm jwtAlgorithm) throws Exception {
        AuthenticationFilter authenticationFilter = new AuthenticationFilter(customAuthManager, userService, jwtAlgorithm);
        authenticationFilter.setFilterProcessesUrl("/authenticate");

        http
                .cors(Customizer.withDefaults())
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(authz -> authz

                        //public routes
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.POST, SecurityConstants.REGISTER_PATH).permitAll()
                        .requestMatchers("/profile-pictures/**").permitAll() // para conseguir pegar as imagens
                        .requestMatchers("/projects-pictures/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/task/attachments/content/*/*").permitAll()
                        .requestMatchers(HttpMethod.HEAD, "/task/attachments/content/*/*").permitAll()

                        .requestMatchers(HttpMethod.POST, "/user/init-admin").denyAll()
                        // user routes

                        // task routes


                        .anyRequest().authenticated())
                .exceptionHandling(errors -> errors.authenticationEntryPoint((request, response, failure) -> {
                    response.setStatus(401);
                    response.setContentType("application/json");
                    String requestId = java.util.UUID.randomUUID().toString();
                    response.setHeader("X-Request-Id", requestId);
                    response.getWriter().write("{\"code\":\"UNAUTHENTICATED\",\"message\":\"Entre novamente para continuar.\",\"fieldErrors\":[],\"requestId\":\"" + requestId + "\"}");
                }))
                .addFilterBefore(new ExceptionHandlerFilter(), AuthenticationFilter.class)
                .addFilter(authenticationFilter)
                .addFilterAfter(new JWTAuthorizationFilter(jwtAlgorithm), AuthenticationFilter.class)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        http.headers(headers -> headers.frameOptions(frameOptionsConfig -> frameOptionsConfig.disable()));
        return http.build();
    }
}
