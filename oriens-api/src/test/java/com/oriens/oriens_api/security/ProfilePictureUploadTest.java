package com.oriens.oriens_api.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.entity.enums.UserRole;
import com.oriens.oriens_api.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Date;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real storage, security chain and resource handler: only raster images are stored and served. */
@SpringBootTest(properties = {
    "JWT_SECRET=synthetic-profile-picture-test-only-0123456789-abcdefghijklmnopqrstuvwxyz",
    "spring.datasource.url=jdbc:h2:mem:profilepictures;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.task.scheduling.enabled=false",
    "file.upload-dir=${java.io.tmpdir}/oriens-picture-test-profile",
    "file.upload-project-dir=${java.io.tmpdir}/oriens-picture-test-project"
})
@AutoConfigureMockMvc
class ProfilePictureUploadTest {
    static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D};
    static final byte[] HTML = "<html><script>alert(document.cookie)</script></html>".getBytes(StandardCharsets.UTF_8);

    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired Algorithm jwtAlgorithm;
    @Value("${file.upload-dir}") Path uploads;
    User owner;
    String token;

    @BeforeEach
    void fixtures() {
        User u = new User();
        u.setName("Pessoa");
        u.setEmail(UUID.randomUUID() + "@example.invalid");
        u.setPassword("synthetic");
        u.setRole(UserRole.USER);
        owner = users.save(u);
        token = "Bearer " + JWT.create().withSubject(owner.getEmail()).withClaim("role", "USER")
            .withExpiresAt(new Date(System.currentTimeMillis() + 60_000)).sign(jwtAlgorithm);
    }

    // Regression: any file was stored with its own extension and served publicly (stored XSS).
    @Test
    void scriptableOrDisguisedUploadsAreRejectedAndNothingIsStored() throws Exception {
        for (MockMultipartFile evil : new MockMultipartFile[] {
                new MockMultipartFile("profileImage", "evil.html", "text/html", HTML),
                new MockMultipartFile("profileImage", "evil.svg", "image/svg+xml", "<svg onload=\"alert(1)\"/>".getBytes(StandardCharsets.UTF_8)),
                new MockMultipartFile("profileImage", "evil.png", "image/png", HTML)}) {
            mvc.perform(multipart(HttpMethod.PUT, "/user/" + owner.getId() + "/avatar").file(evil).header("Authorization", token))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("DOMAIN_VIOLATION"))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("profileImage"));
        }
        try (var stored = Files.list(uploads)) {
            assertThat(stored.map(p -> p.getFileName().toString())).noneMatch(name -> name.startsWith(owner.getId() + "_"));
        }
        assertThat(users.findById(owner.getId()).orElseThrow().getProfileImageUrl()).isNull();
    }

    @Test
    void aRealImageIsStoredAndServedAsAnImage() throws Exception {
        String url = mvc.perform(multipart(HttpMethod.PUT, "/user/" + owner.getId() + "/avatar")
                .file(new MockMultipartFile("profileImage", "me.PNG", "image/png", PNG)).header("Authorization", token))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()
            .replaceAll(".*\"profileImageUrl\":\"http://localhost([^\"]+)\".*", "$1");
        assertThat(url).startsWith("/profile-pictures/" + owner.getId() + "_").endsWith(".png");
        mvc.perform(get(url))
            .andExpect(status().isOk())
            .andExpect(content().contentType("image/png"))
            .andExpect(header().string("X-Content-Type-Options", "nosniff"));
    }

    @Test
    void filesStoredBeforeTheAllowlistAreNoLongerServed() throws Exception {
        Files.createDirectories(uploads);
        Files.write(uploads.resolve("legacy_" + UUID.randomUUID() + ".html"), HTML);
        try (var stored = Files.list(uploads)) {
            for (Path legacy : stored.filter(p -> p.toString().endsWith(".html")).toList())
                mvc.perform(get("/profile-pictures/" + legacy.getFileName())).andExpect(status().isNotFound());
        }
    }
}
