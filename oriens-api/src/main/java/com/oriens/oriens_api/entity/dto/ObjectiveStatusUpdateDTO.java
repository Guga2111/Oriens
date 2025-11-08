package com.oriens.oriens_api.entity.dto;

import com.oriens.oriens_api.entity.enums.Status;
import lombok.Data;

@Data
public class ObjectiveStatusUpdateDTO {
    private Status status;
}
