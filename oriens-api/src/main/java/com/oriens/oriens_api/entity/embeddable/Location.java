package com.oriens.oriens_api.entity.embeddable;

import jakarta.persistence.Embeddable;
import lombok.*;

@Embeddable
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Builder
public class Location {
    private String address;
    private Double latitude;
    private Double longitude;
}
