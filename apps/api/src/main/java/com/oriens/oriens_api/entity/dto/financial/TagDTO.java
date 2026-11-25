package com.oriens.oriens_api.entity.dto.financial;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class TagDTO {

    private Long id;

    @NotBlank(message = "Nome da tag é obrigatório")
    @Size(min = 2, max = 50, message = "Nome deve ter entre 2 e 50 caracteres")
    private String name;

    @NotBlank(message = "Cor é obrigatória")
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Cor deve estar no formato #RRGGBB")
    private String color;

    private Boolean isDefault; // Presente apenas em Response

    private LocalDateTime createdAt; // Presente apenas em Response
}