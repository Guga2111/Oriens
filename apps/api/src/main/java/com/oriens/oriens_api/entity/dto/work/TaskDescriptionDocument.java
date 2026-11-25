package com.oriens.oriens_api.entity.dto.work;

import tools.jackson.databind.JsonNode;

public record TaskDescriptionDocument(int schemaVersion, JsonNode content) {}
