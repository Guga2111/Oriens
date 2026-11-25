package com.oriens.oriens_api.entity.dto;

import com.oriens.oriens_api.entity.enums.Priority;
import com.oriens.oriens_api.entity.enums.TicketStatus;
import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class AdminSupportTicketDTO {

    private Long id;
    private String subject;
    private String message;
    private String userEmail;
    private Long userId;
    private String userName;
    private TicketStatus status;
    private Priority priority;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
