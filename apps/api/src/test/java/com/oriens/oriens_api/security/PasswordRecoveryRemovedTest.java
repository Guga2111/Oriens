package com.oriens.oriens_api.security;

import com.oriens.oriens_api.security.manager.CustomAuthManager;
import com.oriens.oriens_api.service.UserServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** E-mail delivery was removed; the former anonymous password-recovery routes must not stay public. */
@WebMvcTest(controllers = PasswordRecoveryRemovedTest.Probe.class, properties = {
        "JWT_SECRET=synthetic-password-recovery-test-only-0123456789-abcdefghijklmnopqrstuvwxyz"})
@Import({PasswordRecoveryRemovedTest.Probe.class, SecurityConfig.class, JwtConfiguration.class, com.oriens.oriens_api.CorsConfig.class})
class PasswordRecoveryRemovedTest {
    /** Answers 200 if security ever lets anonymous requests reach these paths again. */
    @RestController
    static class Probe {
        @PostMapping({"/api/auth/forgot-password", "/api/auth/reset-password"})
        String reachable() {
            return "reachable";
        }
    }

    @MockitoBean CustomAuthManager manager;
    @MockitoBean UserServiceImpl users;
    @Autowired MockMvc mvc;

    @Test
    void formerRecoveryRoutesRequireAuthentication() throws Exception {
        for (String path : new String[]{"/api/auth/forgot-password", "/api/auth/reset-password"}) {
            mvc.perform(post(path).contentType("application/json").content("{}"))
                    .andExpect(status().isUnauthorized());
        }
    }
}
