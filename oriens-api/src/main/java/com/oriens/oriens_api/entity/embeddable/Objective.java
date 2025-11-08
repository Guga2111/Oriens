package com.oriens.oriens_api.entity.embeddable;

import com.oriens.oriens_api.entity.enums.Status;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.time.LocalDate;

@Embeddable
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Builder
public class Objective {

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private boolean completed = false;

    private LocalDate dueDate;

    private Status status;

}
