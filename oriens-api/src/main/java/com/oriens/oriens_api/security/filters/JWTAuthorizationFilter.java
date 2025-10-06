package com.oriens.oriens_api.security.filters;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.oriens.oriens_api.security.SecurityConstants;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class JWTAuthorizationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        if (header == null || !header.startsWith(SecurityConstants.BEARER)) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.replace(SecurityConstants.BEARER, "");

        try {
            DecodedJWT decodedJWT = JWT.require(Algorithm.HMAC512(SecurityConstants.SECRET_KEY))
                    .build()
                    .verify(token);

            String userPrincipal = decodedJWT.getSubject();

            Authentication authentication = new UsernamePasswordAuthenticationToken(userPrincipal, null);

            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (JWTVerificationException e) {
            throw e;
        }

        filterChain.doFilter(request, response);
    }
}
