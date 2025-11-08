package com.oriens.oriens_api.entity.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserPreferencesDTO {
    @JsonProperty(required = false)
    private Boolean notifications;

    @JsonProperty(required = false)
    private Boolean sound;

    @JsonProperty(required = false)
    private String theme;
}
