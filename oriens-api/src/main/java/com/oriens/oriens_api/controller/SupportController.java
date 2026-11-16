package com.oriens.oriens_api.controller;

import com.oriens.oriens_api.entity.SupportTicket;
import com.oriens.oriens_api.entity.dto.SupportDashboardStatsDTO;
import com.oriens.oriens_api.entity.dto.SupportTicketDTO;
import com.oriens.oriens_api.entity.enums.TicketStatus;
import com.oriens.oriens_api.security.WorkOwner;
import com.oriens.oriens_api.service.SupportTicketService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@AllArgsConstructor
@RestController
@RequestMapping("/support")
public class SupportController {

    private final SupportTicketService supportTicketService;
    private final WorkOwner owner;

    @PostMapping("/user/{userId}/ticket")
    public ResponseEntity<SupportTicket> createSupportTicket(
            Authentication auth,
            @PathVariable Long userId,
            @RequestBody SupportTicketDTO supportTicketDTO) {
        Long ownerId = owner.matching(auth, userId);
        SupportTicket ticket = supportTicketService.createTicket(ownerId, supportTicketDTO);
        return new ResponseEntity<>(ticket, HttpStatus.CREATED);
    }

    @GetMapping("/ticket/{ticketId}")
    public ResponseEntity<SupportTicket> getTicketById(Authentication auth, @PathVariable Long ticketId) {
        SupportTicket ticket = supportTicketService.getTicketById(owner.id(auth), ticketId);
        return new ResponseEntity<>(ticket, HttpStatus.OK);
    }

    @GetMapping("/user/{userId}/tickets")
    public ResponseEntity<List<SupportTicket>> getUserTickets(Authentication auth, @PathVariable Long userId) {
        Long ownerId = owner.matching(auth, userId);
        List<SupportTicket> tickets = supportTicketService.getTicketsByUserId(ownerId);
        return new ResponseEntity<>(tickets, HttpStatus.OK);
    }

    @GetMapping("/user/{userId}/tickets/status/{status}")
    public ResponseEntity<List<SupportTicket>> getUserTicketsByStatus(
            Authentication auth,
            @PathVariable Long userId,
            @PathVariable TicketStatus status) {
        Long ownerId = owner.matching(auth, userId);
        List<SupportTicket> tickets = supportTicketService.getTicketsByUserIdAndStatus(ownerId, status);
        return new ResponseEntity<>(tickets, HttpStatus.OK);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/ticket/{ticketId}/status")
    public ResponseEntity<SupportTicket> updateTicketStatus(
            @PathVariable Long ticketId,
            @RequestParam TicketStatus status) {
        SupportTicket ticket = supportTicketService.updateTicketStatus(ticketId, status);
        return new ResponseEntity<>(ticket, HttpStatus.OK);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/ticket/{ticketId}/priority")
    public ResponseEntity<SupportTicket> updateTicketPriority(
            @PathVariable Long ticketId,
            @RequestParam Integer priority) {
        SupportTicket ticket = supportTicketService.updateTicketPriority(ticketId, priority);
        return new ResponseEntity<>(ticket, HttpStatus.OK);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/tickets/admin")
    public ResponseEntity<List<SupportTicket>> getAllTickets() {
        List<SupportTicket> tickets = supportTicketService.getAllTickets();
        return new ResponseEntity<>(tickets, HttpStatus.OK);
    }

    @GetMapping("/user/{userId}/tickets/count/open")
    public ResponseEntity<Long> countOpenTickets(Authentication auth, @PathVariable Long userId) {
        Long ownerId = owner.matching(auth, userId);
        long count = supportTicketService.countOpenTicketsByUserId(ownerId);
        return new ResponseEntity<>(count, HttpStatus.OK);
    }

    // Admin endpoints
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/tickets")
    public ResponseEntity<List<SupportTicket>> getAllTicketsAdmin() {
        List<SupportTicket> tickets = supportTicketService.getAllTickets();
        return new ResponseEntity<>(tickets, HttpStatus.OK);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/tickets/status/{status}")
    public ResponseEntity<List<SupportTicket>> getTicketsByStatusAdmin(@PathVariable TicketStatus status) {
        List<SupportTicket> tickets = supportTicketService.getTicketsByStatus(status);
        return new ResponseEntity<>(tickets, HttpStatus.OK);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/stats")
    public ResponseEntity<SupportDashboardStatsDTO> getDashboardStats() {
        SupportDashboardStatsDTO stats = supportTicketService.getDashboardStats();
        return new ResponseEntity<>(stats, HttpStatus.OK);
    }
}
