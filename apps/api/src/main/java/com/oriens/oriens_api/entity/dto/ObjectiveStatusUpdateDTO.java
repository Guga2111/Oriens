package com.oriens.oriens_api.entity.dto;

import com.oriens.oriens_api.entity.enums.ObjectiveStatus;
import lombok.Data;

@Data
public class ObjectiveStatusUpdateDTO {
    private ObjectiveStatus status;
}
