package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.SupportTicket;
import com.oriens.oriens_api.entity.dto.SupportDashboardStatsDTO;
import com.oriens.oriens_api.entity.dto.SupportTicketDTO;
import com.oriens.oriens_api.entity.enums.TicketStatus;

import java.util.List;

public interface SupportTicketService {

    SupportTicket createTicket(Long userId, SupportTicketDTO supportTicketDTO);

    SupportTicket getTicketById(Long ticketId);

    List<SupportTicket> getTicketsByUserId(Long userId);

    List<SupportTicket> getTicketsByUserIdAndStatus(Long userId, TicketStatus status);

    SupportTicket updateTicketStatus(Long ticketId, TicketStatus newStatus);

    SupportTicket updateTicketPriority(Long ticketId, Integer priority);

    List<SupportTicket> getAllTickets();

    long countOpenTicketsByUserId(Long userId);

    List<SupportTicket> getTicketsByStatus(TicketStatus status);

    SupportDashboardStatsDTO getDashboardStats();
}
