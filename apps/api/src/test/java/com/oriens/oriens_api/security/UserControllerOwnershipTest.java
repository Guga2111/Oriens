package com.oriens.oriens_api.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.entity.embeddable.UserPreferences;
import com.oriens.oriens_api.entity.enums.UserRole;
import com.oriens.oriens_api.repository.UserRepository;
import com.oriens.oriens_api.service.FileStorageProjectService;
import com.oriens.oriens_api.service.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.Date;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Real security chain and JWT filter over H2: user routes must be scoped to the token owner. */
@SpringBootTest(properties = {
    "JWT_SECRET=synthetic-user-ownership-test-only-0123456789-abcdefghijklmnopqrstuvwxyz",
    "spring.datasource.url=jdbc:h2:mem:userownership;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.task.scheduling.enabled=false",
    "file.upload-dir=${java.io.tmpdir}/oriens-ownership-profile",
    "file.upload-project-dir=${java.io.tmpdir}/oriens-ownership-project"
})
@AutoConfigureMockMvc
class UserControllerOwnershipTest {
    @MockitoBean FileStorageProjectService projectFiles;
    @MockitoBean FileStorageService profileFiles;
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired Algorithm jwtAlgorithm;

    User owner, stranger;
    String ownerToken, strangerToken;

    @BeforeEach
    void fixtures() {
        owner = user(UserRole.USER, "+5581999990000");
        stranger = user(UserRole.USER, null);
        ownerToken = jwt(owner);
        strangerToken = jwt(stranger);
    }

    @Test
    void otherUserGetsNotFoundOnEveryOwnedRouteAndOwnerDataStaysIntact() throws Exception {
        String base = "/user/" + owner.getId();
        List<org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder<?>> attempts = List.of(
            get(base),
            patch(base).contentType(MediaType.APPLICATION_JSON).content("{\"phoneNumber\":\"+5511988887777\"}"),
            get(base + "/preferences"),
            patch(base + "/preferences").contentType(MediaType.APPLICATION_JSON).content("{\"theme\":\"dark\",\"sound\":false}"),
            multipart(HttpMethod.PUT, base + "/avatar").file(avatar()),
            delete(base));

        for (org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder<?> attempt : attempts) {
            mvc.perform(as(attempt, strangerToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        }

        User intact = users.findById(owner.getId()).orElseThrow();
        assertThat(intact.getPhoneNumber()).isEqualTo("+5581999990000");
        assertThat(intact.getUserPreferences().getTheme()).isEqualTo("light");
        assertThat(intact.getUserPreferences().getSound()).isTrue();
        assertThat(intact.getProfileImageUrl()).isNull();
        verify(profileFiles, never()).storeFile(any(), anyLong());
    }

    @Test
    void nonExistentUserIdRespondsLikeAnotherUsersId() throws Exception {
        mvc.perform(as(get("/user/" + (stranger.getId() + 10_000)), strangerToken))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void ownerStillManagesOwnAccount() throws Exception {
        String base = "/user/" + owner.getId();
        mvc.perform(as(get(base), ownerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value(owner.getEmail()))
            .andExpect(jsonPath("$.password").doesNotExist());
        mvc.perform(as(patch(base).contentType(MediaType.APPLICATION_JSON).content("{\"phoneNumber\":\"+5511988887777\"}"), ownerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.phoneNumber").value("+5511988887777"));
        mvc.perform(as(get(base + "/preferences"), ownerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.theme").value("light"));
        mvc.perform(as(patch(base + "/preferences").contentType(MediaType.APPLICATION_JSON).content("{\"theme\":\"dark\"}"), ownerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.theme").value("dark"));

        when(profileFiles.storeFile(any(), eq(owner.getId()))).thenReturn(owner.getId() + "_avatar.png");
        mvc.perform(as(multipart(HttpMethod.PUT, base + "/avatar").file(avatar()), ownerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.profileImageUrl").value("http://localhost/profile-pictures/" + owner.getId() + "_avatar.png"));

        User updated = users.findById(owner.getId()).orElseThrow();
        assertThat(updated.getPhoneNumber()).isEqualTo("+5511988887777");
        assertThat(updated.getUserPreferences().getTheme()).isEqualTo("dark");
        assertThat(updated.getProfileImageUrl()).endsWith(owner.getId() + "_avatar.png");

        mvc.perform(as(delete(base), ownerToken)).andExpect(status().isNoContent());
        assertThat(users.findById(owner.getId())).isEmpty();
    }

    @Test
    void ownerPhoneValidationStillAnswersBadRequest() throws Exception {
        String base = "/user/" + owner.getId();
        mvc.perform(as(patch(base).contentType(MediaType.APPLICATION_JSON).content("{\"phoneNumber\":\"81999990000\"}"), ownerToken))
            .andExpect(status().isBadRequest());
        mvc.perform(as(patch(base).contentType(MediaType.APPLICATION_JSON).content("{}"), ownerToken))
            .andExpect(status().isBadRequest());
        assertThat(users.findById(owner.getId()).orElseThrow().getPhoneNumber()).isEqualTo("+5581999990000");
    }

    @Test
    void emailLookupOnlyResolvesTheCallersOwnAccount() throws Exception {
        mvc.perform(as(get("/user").param("email", owner.getEmail().toUpperCase()), ownerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(owner.getId()));
        mvc.perform(as(get("/user").param("email", owner.getEmail()), strangerToken))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mvc.perform(as(get("/user").param("email", "nobody-" + UUID.randomUUID() + "@example.invalid"), strangerToken))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void unauthenticatedRequestsAreRejected() throws Exception {
        String base = "/user/" + owner.getId();
        mvc.perform(get(base)).andExpect(status().isUnauthorized());
        mvc.perform(delete(base)).andExpect(status().isUnauthorized());
        mvc.perform(get("/user").param("email", owner.getEmail())).andExpect(status().isUnauthorized());
        assertThat(users.findById(owner.getId())).isPresent();
    }

    @Test
    void registrationStaysPublicAndIgnoresRoleInBody() throws Exception {
        String email = "new-" + UUID.randomUUID() + "@example.invalid";
        mvc.perform(post("/user/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Nova\",\"email\":\"" + email + "\",\"password\":\"synthetic\",\"role\":\"ADMIN\",\"id\":" + owner.getId() + "}"))
            .andExpect(status().isCreated());
        User created = users.findByEmail(email).orElseThrow();
        assertThat(created.getRole()).isEqualTo(UserRole.USER);
        assertThat(created.getId()).isNotEqualTo(owner.getId());
        assertThat(users.findById(owner.getId()).orElseThrow().getEmail()).isEqualTo(owner.getEmail());
    }

    @Test
    void adminRoutesRequireAdminRole() throws Exception {
        mvc.perform(as(get("/user/admin/all-users"), strangerToken))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        mvc.perform(as(patch("/user/admin/" + stranger.getId() + "/role/ADMIN"), strangerToken))
            .andExpect(status().isForbidden());
        assertThat(users.findById(stranger.getId()).orElseThrow().getRole()).isEqualTo(UserRole.USER);

        String adminToken = jwt(user(UserRole.ADMIN, null));
        mvc.perform(as(get("/user/admin/all-users"), adminToken)).andExpect(status().isOk());
    }

    private User user(UserRole role, String phoneNumber) {
        User u = new User();
        u.setName("Pessoa");
        u.setEmail(UUID.randomUUID() + "@example.invalid");
        u.setPassword("synthetic");
        u.setRole(role);
        u.setPhoneNumber(phoneNumber);
        u.setUserPreferences(new UserPreferences(true, true, "light", null));
        return users.save(u);
    }

    private String jwt(User u) {
        return "Bearer " + JWT.create().withSubject(u.getEmail()).withClaim("role", u.getRole().name())
            .withExpiresAt(new Date(System.currentTimeMillis() + 60_000)).sign(jwtAlgorithm);
    }

    private static org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder<?> as(org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder<?> request, String token) {
        return request.header("Authorization", token);
    }

    private static MockMultipartFile avatar() {
        return new MockMultipartFile("profileImage", "avatar.png", "image/png", new byte[] {1, 2, 3});
    }
}
