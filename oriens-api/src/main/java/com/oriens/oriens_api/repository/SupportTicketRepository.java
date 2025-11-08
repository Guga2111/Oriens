package com.oriens.oriens_api.repository;

import com.oriens.oriens_api.entity.SupportTicket;
import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.entity.enums.TicketStatus;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SupportTicketRepository extends CrudRepository<SupportTicket, Long> {

    List<SupportTicket> findByUserOrderByCreatedAtDesc(User user);

    List<SupportTicket> findByUserAndStatusOrderByCreatedAtDesc(User user, TicketStatus status);

    @Query("SELECT s FROM SupportTicket s WHERE s.user.id = :userId ORDER BY s.createdAt DESC")
    List<SupportTicket> findTicketsByUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(s) FROM SupportTicket s WHERE s.user.id = :userId AND s.status = :status")
    long countByUserIdAndStatus(@Param("userId") Long userId, @Param("status") TicketStatus status);

    @Query("SELECT s FROM SupportTicket s ORDER BY s.createdAt DESC")
    List<SupportTicket> findAllTicketsOrderByCreatedAtDesc();
}
