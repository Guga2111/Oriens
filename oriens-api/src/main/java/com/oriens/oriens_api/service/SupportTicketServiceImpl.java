package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.SupportTicket;
import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.entity.dto.SupportDashboardStatsDTO;
import com.oriens.oriens_api.entity.dto.SupportTicketDTO;
import com.oriens.oriens_api.entity.enums.Priority;
import com.oriens.oriens_api.entity.enums.TicketStatus;
import com.oriens.oriens_api.exception.UserNotFoundException;
import com.oriens.oriens_api.repository.SupportTicketRepository;
import com.oriens.oriens_api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SupportTicketServiceImpl implements SupportTicketService {

    private final SupportTicketRepository supportTicketRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    @Override
    public SupportTicket createTicket(Long userId, SupportTicketDTO supportTicketDTO) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        SupportTicket ticket = SupportTicket.builder()
                .subject(supportTicketDTO.getSubject().trim())
                .message(supportTicketDTO.getMessage().trim())
                .userEmail(user.getEmail())
                .status(TicketStatus.OPEN)
                .priority(supportTicketDTO.getPriority() != null ? supportTicketDTO.getPriority() : Priority.MEDIUM)
                .user(user)
                .build();

        SupportTicket savedTicket = supportTicketRepository.save(ticket);

        try {
            emailService.sendSupportTicketConfirmation(
                    savedTicket.getUserEmail(),
                    savedTicket.getId().toString(),
                    savedTicket.getSubject()
            );
        } catch (Exception e) {
            // Log email error but don't fail the ticket creation
            System.err.println("Failed to send support ticket confirmation email: " + e.getMessage());
        }

        return savedTicket;
    }

    @Override
    public SupportTicket getTicketById(Long ticketId) {
        return supportTicketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Support ticket not found with id: " + ticketId));
    }

    @Override
    public List<SupportTicket> getTicketsByUserId(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        return supportTicketRepository.findByUserOrderByCreatedAtDesc(user);
    }

    @Override
    public List<SupportTicket> getTicketsByUserIdAndStatus(Long userId, TicketStatus status) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        return supportTicketRepository.findByUserAndStatusOrderByCreatedAtDesc(user, status);
    }

    @Override
    public SupportTicket updateTicketStatus(Long ticketId, TicketStatus newStatus) {
        SupportTicket ticket = getTicketById(ticketId);
        ticket.setStatus(newStatus);
        SupportTicket updatedTicket = supportTicketRepository.save(ticket);

        try {
            emailService.sendSupportTicketStatusUpdate(
                    updatedTicket.getUserEmail(),
                    updatedTicket.getId().toString(),
                    newStatus.toString()
            );
        } catch (Exception e) {
            // Log email error but don't fail the status update
            System.err.println("Failed to send support ticket status update email: " + e.getMessage());
        }

        return updatedTicket;
    }

    @Override
    public SupportTicket updateTicketPriority(Long ticketId, Integer priority) {
        SupportTicket ticket = getTicketById(ticketId);
        try {
            Priority priorityEnum = Priority.values()[priority];
            ticket.setPriority(priorityEnum);
            return supportTicketRepository.save(ticket);
        } catch (ArrayIndexOutOfBoundsException e) {
            throw new IllegalArgumentException("Invalid priority value: " + priority);
        }
    }

    @Override
    public List<SupportTicket> getAllTickets() {
        return supportTicketRepository.findAllTicketsOrderByCreatedAtDesc();
    }

    @Override
    public long countOpenTicketsByUserId(Long userId) {
        return supportTicketRepository.countByUserIdAndStatus(userId, TicketStatus.OPEN);
    }

    @Override
    public List<SupportTicket> getTicketsByStatus(TicketStatus status) {
        List<SupportTicket> allTickets = supportTicketRepository.findAllTicketsOrderByCreatedAtDesc();
        return allTickets.stream()
                .filter(ticket -> ticket.getStatus() == status)
                .toList();
    }

    @Override
    public SupportDashboardStatsDTO getDashboardStats() {
        List<SupportTicket> allTickets = supportTicketRepository.findAllTicketsOrderByCreatedAtDesc();

        long openTickets = allTickets.stream()
                .filter(t -> t.getStatus() == TicketStatus.OPEN)
                .count();

        long inProgressTickets = allTickets.stream()
                .filter(t -> t.getStatus() == TicketStatus.IN_PROGRESS)
                .count();

        long closedTickets = allTickets.stream()
                .filter(t -> t.getStatus() == TicketStatus.CLOSED)
                .count();

        // Calculate average resolution time (in hours) - simplified version
        double averageResolutionTime = allTickets.stream()
                .filter(t -> t.getStatus() == TicketStatus.CLOSED && t.getUpdatedAt() != null)
                .mapToLong(t -> java.time.temporal.ChronoUnit.HOURS.between(t.getCreatedAt(), t.getUpdatedAt()))
                .average()
                .orElse(0.0);

        return SupportDashboardStatsDTO.builder()
                .totalTickets(allTickets.size())
                .openTickets(openTickets)
                .inProgressTickets(inProgressTickets)
                .closedTickets(closedTickets)
                .averageResolutionTime(averageResolutionTime)
                .build();
    }
}
