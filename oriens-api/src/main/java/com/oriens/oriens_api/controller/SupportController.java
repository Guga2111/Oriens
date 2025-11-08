package com.oriens.oriens_api.controller;

import com.oriens.oriens_api.entity.SupportTicket;
import com.oriens.oriens_api.entity.dto.SupportDashboardStatsDTO;
import com.oriens.oriens_api.entity.dto.SupportTicketDTO;
import com.oriens.oriens_api.entity.enums.TicketStatus;
import com.oriens.oriens_api.service.SupportTicketService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@AllArgsConstructor
@RestController
@RequestMapping("/support")
public class SupportController {

    private final SupportTicketService supportTicketService;

    @PostMapping("/user/{userId}/ticket")
    public ResponseEntity<SupportTicket> createSupportTicket(
            @PathVariable Long userId,
            @RequestBody SupportTicketDTO supportTicketDTO) {
        SupportTicket ticket = supportTicketService.createTicket(userId, supportTicketDTO);
        return new ResponseEntity<>(ticket, HttpStatus.CREATED);
    }

    @GetMapping("/ticket/{ticketId}")
    public ResponseEntity<SupportTicket> getTicketById(@PathVariable Long ticketId) {
        SupportTicket ticket = supportTicketService.getTicketById(ticketId);
        return new ResponseEntity<>(ticket, HttpStatus.OK);
    }

    @GetMapping("/user/{userId}/tickets")
    public ResponseEntity<List<SupportTicket>> getUserTickets(@PathVariable Long userId) {
        List<SupportTicket> tickets = supportTicketService.getTicketsByUserId(userId);
        return new ResponseEntity<>(tickets, HttpStatus.OK);
    }

    @GetMapping("/user/{userId}/tickets/status/{status}")
    public ResponseEntity<List<SupportTicket>> getUserTicketsByStatus(
            @PathVariable Long userId,
            @PathVariable TicketStatus status) {
        List<SupportTicket> tickets = supportTicketService.getTicketsByUserIdAndStatus(userId, status);
        return new ResponseEntity<>(tickets, HttpStatus.OK);
    }

    @PatchMapping("/ticket/{ticketId}/status")
    public ResponseEntity<SupportTicket> updateTicketStatus(
            @PathVariable Long ticketId,
            @RequestParam TicketStatus status) {
        SupportTicket ticket = supportTicketService.updateTicketStatus(ticketId, status);
        return new ResponseEntity<>(ticket, HttpStatus.OK);
    }

    @PatchMapping("/ticket/{ticketId}/priority")
    public ResponseEntity<SupportTicket> updateTicketPriority(
            @PathVariable Long ticketId,
            @RequestParam Integer priority) {
        SupportTicket ticket = supportTicketService.updateTicketPriority(ticketId, priority);
        return new ResponseEntity<>(ticket, HttpStatus.OK);
    }

    @GetMapping("/tickets/admin")
    public ResponseEntity<List<SupportTicket>> getAllTickets() {
        List<SupportTicket> tickets = supportTicketService.getAllTickets();
        return new ResponseEntity<>(tickets, HttpStatus.OK);
    }

    @GetMapping("/user/{userId}/tickets/count/open")
    public ResponseEntity<Long> countOpenTickets(@PathVariable Long userId) {
        long count = supportTicketService.countOpenTicketsByUserId(userId);
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
