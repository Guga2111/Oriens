package com.oriens.oriens_api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import com.oriens.oriens_api.service.FileStorageProjectService;
import com.oriens.oriens_api.service.FileStorageService;

@SpringBootTest(properties={
    "JWT_SECRET=synthetic-context-test-only-0123456789-abcdefghijklmnopqrstuvwxyz-0123456789",
    "spring.datasource.url=jdbc:h2:mem:contextproof;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "file.upload-dir=${java.io.tmpdir}/oriens-context-profile",
    "file.upload-project-dir=${java.io.tmpdir}/oriens-context-project"
})
class OriensApiApplicationTests {
    @MockBean FileStorageProjectService projectFiles;
    @MockBean FileStorageService profileFiles;
    @Test void contextLoads() {}
}
