package com.oriens.oriens_api.security;

import com.oriens.oriens_api.security.filters.AuthenticationFilter;
import com.oriens.oriens_api.security.filters.ExceptionHandlerFilter;
import com.oriens.oriens_api.security.filters.JWTAuthorizationFilter;
import com.oriens.oriens_api.security.manager.CustomAuthManager;
import com.oriens.oriens_api.service.UserServiceImpl;
import lombok.AllArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        AuthenticationFilter authenticationFilter = new AuthenticationFilter(customAuthManager, userService);
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

                        .requestMatchers(HttpMethod.POST, "/api/auth/forgot-password").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/reset-password").permitAll()
                        .requestMatchers(HttpMethod.POST, "/user/init-admin").permitAll()
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
