package com.oriens.oriens_api.controller;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.oriens.oriens_api.entity.Notification;
import com.oriens.oriens_api.entity.SupportTicket;
import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.entity.enums.Priority;
import com.oriens.oriens_api.entity.enums.TicketStatus;
import com.oriens.oriens_api.entity.enums.UserRole;
import com.oriens.oriens_api.repository.NotificationRepository;
import com.oriens.oriens_api.repository.SupportTicketRepository;
import com.oriens.oriens_api.repository.UserRepository;
import com.oriens.oriens_api.service.EmailService;
import com.oriens.oriens_api.service.FileStorageProjectService;
import com.oriens.oriens_api.service.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.Date;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Real JWT filter, method security and exception advice over H2: ownership is 404, missing role is 403. */
@SpringBootTest(properties = {
    "JWT_SECRET=synthetic-access-test-only-0123456789-abcdefghijklmnopqrstuvwxyz-0123456789",
    "spring.datasource.url=jdbc:h2:mem:notificationsupportaccess;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "file.upload-dir=${java.io.tmpdir}/oriens-access-profile",
    "file.upload-project-dir=${java.io.tmpdir}/oriens-access-project"
})
@AutoConfigureMockMvc
class NotificationSupportAccessTest {

    @MockBean FileStorageProjectService projectFiles;
    @MockBean FileStorageService profileFiles;
    @MockBean EmailService email;

    @Autowired MockMvc mvc;
    @Autowired Algorithm jwtAlgorithm;
    @Autowired UserRepository users;
    @Autowired NotificationRepository notifications;
    @Autowired SupportTicketRepository tickets;

    User owner;
    User stranger;
    User admin;

    @BeforeEach
    void fixtures() {
        owner = user(UserRole.USER);
        stranger = user(UserRole.USER);
        admin = user(UserRole.ADMIN);
    }

    // ----------------------------------------------------------------- notifications

    @Test
    void otherUserCannotReadOwnersNotifications() throws Exception {
        notification(owner);

        expectNotFound(get("/notifications/user/" + owner.getId()), stranger);
        expectNotFound(get("/notifications/user/" + owner.getId() + "/last-notifications"), stranger);
    }

    @Test
    void otherUserCannotMarkOwnersNotificationAsRead() throws Exception {
        Notification target = notification(owner);

        expectNotFound(post("/notifications/" + target.getId() + "/read"), stranger);

        assertThat(notifications.findById(target.getId())).get().extracting(Notification::isRead).isEqualTo(false);
    }

    @Test
    void otherUserCannotMarkAllOrClearOwnersNotifications() throws Exception {
        Notification target = notification(owner);

        expectNotFound(patch("/notifications/user/" + owner.getId() + "/read-all"), stranger);
        expectNotFound(delete("/notifications/user/" + owner.getId()), stranger);

        assertThat(notifications.findById(target.getId())).get().extracting(Notification::isRead).isEqualTo(false);
    }

    @Test
    void ownerManagesOwnNotifications() throws Exception {
        Notification first = notification(owner);
        notification(owner);
        Notification foreign = notification(stranger);

        mvc.perform(as(get("/notifications/user/" + owner.getId()), owner))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
        mvc.perform(as(get("/notifications/user/" + owner.getId() + "/last-notifications"), owner))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));

        mvc.perform(as(post("/notifications/" + first.getId() + "/read"), owner)).andExpect(status().isOk());
        assertThat(notifications.findById(first.getId())).get().extracting(Notification::isRead).isEqualTo(true);

        mvc.perform(as(patch("/notifications/user/" + owner.getId() + "/read-all"), owner))
            .andExpect(status().isOk()).andExpect(jsonPath("$.updatedCount").value(1));
        mvc.perform(as(delete("/notifications/user/" + owner.getId()), owner))
            .andExpect(status().isNoContent()).andExpect(jsonPath("$.deletedCount").value(2));

        assertThat(notifications.findById(foreign.getId())).get().extracting(Notification::isRead).isEqualTo(false);
    }

    // ----------------------------------------------------------------- support tickets

    @Test
    void otherUserCannotReadOwnersTicketOrListings() throws Exception {
        SupportTicket target = ticket(owner);

        expectNotFound(get("/support/ticket/" + target.getId()), stranger);
        expectNotFound(get("/support/user/" + owner.getId() + "/tickets"), stranger);
        expectNotFound(get("/support/user/" + owner.getId() + "/tickets/status/OPEN"), stranger);
        expectNotFound(get("/support/user/" + owner.getId() + "/tickets/count/open"), stranger);
    }

    @Test
    void otherUserCannotOpenTicketOnOwnersBehalf() throws Exception {
        expectNotFound(post("/support/user/" + owner.getId() + "/ticket")
            .contentType("application/json").content("{\"subject\":\"Ajuda\",\"message\":\"Texto\"}"), stranger);

        assertThat(tickets.findTicketsByUserId(owner.getId())).isEmpty();
    }

    @Test
    void ownerOpensAndReadsOwnTickets() throws Exception {
        mvc.perform(as(post("/support/user/" + owner.getId() + "/ticket")
                .contentType("application/json").content("{\"subject\":\"Ajuda\",\"message\":\"Texto\"}"), owner))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("OPEN"));
        SupportTicket created = tickets.findTicketsByUserId(owner.getId()).get(0);

        mvc.perform(as(get("/support/ticket/" + created.getId()), owner))
            .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(created.getId()));
        mvc.perform(as(get("/support/user/" + owner.getId() + "/tickets"), owner))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(as(get("/support/user/" + owner.getId() + "/tickets/status/OPEN"), owner))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(as(get("/support/user/" + owner.getId() + "/tickets/count/open"), owner))
            .andExpect(status().isOk()).andExpect(jsonPath("$").value(1));
    }

    @Test
    void nonAdminCannotUseAdminTicketActions() throws Exception {
        SupportTicket target = ticket(owner);

        expectForbidden(get("/support/tickets/admin"), owner);
        expectForbidden(patch("/support/ticket/" + target.getId() + "/status").param("status", "CLOSED"), owner);
        expectForbidden(patch("/support/ticket/" + target.getId() + "/priority").param("priority", "2"), owner);

        SupportTicket unchanged = tickets.findById(target.getId()).orElseThrow();
        assertThat(unchanged.getStatus()).isEqualTo(TicketStatus.OPEN);
        assertThat(unchanged.getPriority()).isEqualTo(Priority.MEDIUM);
    }

    @Test
    void adminManagesAnyTicket() throws Exception {
        SupportTicket target = ticket(owner);

        mvc.perform(as(get("/support/tickets/admin"), admin)).andExpect(status().isOk());
        mvc.perform(as(get("/support/admin/tickets"), admin)).andExpect(status().isOk());
        mvc.perform(as(patch("/support/ticket/" + target.getId() + "/status").param("status", "IN_PROGRESS"), admin))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("IN_PROGRESS"));
        mvc.perform(as(patch("/support/ticket/" + target.getId() + "/priority").param("priority", "2"), admin))
            .andExpect(status().isOk()).andExpect(jsonPath("$.priority").value("HIGH"));
        expectNotFound(patch("/support/ticket/" + Long.MAX_VALUE + "/status").param("status", "CLOSED"), admin);
    }

    // ----------------------------------------------------------------- helpers

    private void expectNotFound(MockHttpServletRequestBuilder request, User who) throws Exception {
        mvc.perform(as(request, who)).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    private void expectForbidden(MockHttpServletRequestBuilder request, User who) throws Exception {
        mvc.perform(as(request, who)).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    private RequestBuilder as(MockHttpServletRequestBuilder request, User who) {
        String token = JWT.create().withSubject(who.getEmail()).withClaim("role", who.getRole().name())
            .withExpiresAt(new Date(System.currentTimeMillis() + 60_000)).sign(jwtAlgorithm);
        return request.header("Authorization", "Bearer " + token);
    }

    private User user(UserRole role) {
        User user = new User();
        user.setName("Pessoa");
        user.setEmail(UUID.randomUUID() + "@example.invalid");
        user.setPassword("synthetic");
        user.setRole(role);
        return users.save(user);
    }

    private Notification notification(User user) {
        return notifications.save(new Notification("Tarefa vence hoje", user));
    }

    private SupportTicket ticket(User user) {
        return tickets.save(SupportTicket.builder()
            .subject("Ajuda").message("Texto").userEmail(user.getEmail())
            .status(TicketStatus.OPEN).priority(Priority.MEDIUM).user(user).build());
    }
}
