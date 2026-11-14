package com.oriens.oriens_api.entity.dto.work;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.HashSet;
import java.util.Set;

/** Distinguishes an absent PATCH field from an explicit null without an extra dependency. */
public abstract class PatchFields {
    private final Set<String> supplied = new HashSet<>();
    protected void supplied(String name) { supplied.add(name); }
    @JsonIgnore public boolean has(String name) { return supplied.contains(name); }
}
