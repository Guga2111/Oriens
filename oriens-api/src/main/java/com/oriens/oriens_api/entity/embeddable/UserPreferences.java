package com.oriens.oriens_api.entity.embeddable;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

@Embeddable
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Builder
public class UserPreferences {
    private Boolean notifications;
    private Boolean sound;
    private String theme;
}
