package com.oriens.oriens_api.security;

import com.oriens.oriens_api.security.filters.AuthenticationFilter;
import com.oriens.oriens_api.security.filters.ExceptionHandlerFilter;
import com.oriens.oriens_api.security.filters.JWTAuthorizationFilter;
import com.oriens.oriens_api.security.manager.CustomAuthManager;
import lombok.AllArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@AllArgsConstructor
public class SecurityConfig {

    private final CustomAuthManager customAuthManager;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        AuthenticationFilter authenticationFilter = new AuthenticationFilter(customAuthManager);
        authenticationFilter.setFilterProcessesUrl("/authenticate");

        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(authz -> authz

                        //public routes
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.POST, SecurityConstants.REGISTER_PATH).permitAll()

                        // user routes

                        // task routes


                        .anyRequest().authenticated())
                .addFilterBefore(new ExceptionHandlerFilter(), AuthenticationFilter.class)
                .addFilter(authenticationFilter)
                .addFilterAfter(new JWTAuthorizationFilter(), AuthenticationFilter.class)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        http.headers(headers -> headers.frameOptions(frameOptionsConfig -> frameOptionsConfig.disable()));
        return http.build();
    }
}
