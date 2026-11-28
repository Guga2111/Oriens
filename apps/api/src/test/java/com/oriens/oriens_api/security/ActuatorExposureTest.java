package com.oriens.oriens_api.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.oriens.oriens_api.service.FileStorageProjectService;
import com.oriens.oriens_api.service.FileStorageService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.micrometer.metrics.test.autoconfigure.AutoConfigureMetrics;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.boot.test.web.server.LocalManagementPort;
import org.springframework.boot.test.web.server.LocalServerPort;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/** Metrics are served only on the internal management port; the public port never returns them. */
// Tests disable metrics export by default; without this the Prometheus endpoint would not exist at all.
@AutoConfigureMetrics
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "JWT_SECRET=synthetic-actuator-test-only-0123456789-abcdefghijklmnopqrstuvwxyz-0123456789",
    "management.server.port=0",
    "spring.datasource.url=jdbc:h2:mem:actuatorproof;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "file.upload-dir=${java.io.tmpdir}/oriens-actuator-profile",
    "file.upload-project-dir=${java.io.tmpdir}/oriens-actuator-project"
})
class ActuatorExposureTest {
    @MockitoBean FileStorageProjectService projectFiles;
    @MockitoBean FileStorageService profileFiles;

    @LocalServerPort int publicPort;
    @LocalManagementPort int managementPort;
    @Autowired Algorithm algorithm;

    private final HttpClient http = HttpClient.newHttpClient();

    @Test
    void managementPortServesPrometheusMetricsAndHealthWithoutUserToken() throws Exception {
        get(publicPort, "/user/me", null); // produces at least one http.server.requests sample

        HttpResponse<String> metrics = get(managementPort, "/actuator/prometheus", null);
        assertThat(metrics.statusCode()).isEqualTo(200);
        assertThat(metrics.body())
            .contains("http_server_requests_seconds_bucket")
            .contains("application=\"oriens-api\"")
            .contains("jvm_memory_used_bytes")
            .contains("hikaricp_connections");

        assertThat(get(managementPort, "/actuator/health", null).statusCode()).isEqualTo(200);

        var readiness = get(managementPort, "/actuator/health/readiness", null);
        assertThat(readiness.statusCode()).isEqualTo(200);
        assertThat(readiness.body()).isEqualTo("{\"status\":\"UP\"}");
    }

    @Test
    void publicPortNeverServesMetricsEvenToAuthenticatedUsers() throws Exception {
        String jwt = "Bearer " + JWT.create().withSubject("synthetic@example.invalid").withClaim("role", "USER")
            .withExpiresAt(Instant.now().plusSeconds(60)).sign(algorithm);

        HttpResponse<String> anonymous = get(publicPort, "/actuator/prometheus", null);
        HttpResponse<String> authenticated = get(publicPort, "/actuator/prometheus", jwt);

        assertThat(anonymous.statusCode()).isEqualTo(401);
        assertThat(authenticated.statusCode()).isNotEqualTo(200);
        assertThat(anonymous.body() + authenticated.body()).doesNotContain("jvm_memory_used_bytes");
        assertThat(get(publicPort, "/actuator/health", jwt).statusCode()).isNotEqualTo(200);
        assertThat(get(publicPort, "/actuator/health/readiness", jwt).statusCode()).isNotEqualTo(200);
    }

    @Test
    void managementPortServesNothingOutsideTheAllowList() throws Exception {
        for (String path : new String[] {"/actuator", "/actuator/env", "/actuator/beans", "/actuator/heapdump"}) {
            assertThat(get(managementPort, path, null).statusCode()).as(path).isNotEqualTo(200);
        }
    }

    private HttpResponse<String> get(int port, String path, String authorization) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).GET();
        if (authorization != null) request.header("Authorization", authorization);
        return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }
}
