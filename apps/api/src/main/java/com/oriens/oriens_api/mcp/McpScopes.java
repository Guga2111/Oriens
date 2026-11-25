package com.oriens.oriens_api.mcp;

import java.util.*;
import static com.oriens.oriens_api.mcp.McpStore.invalid;

/** Known permissions and their dependencies. Unknown or missing permissions never grant access. */
public final class McpScopes {
    private McpScopes() {}
    public static final Set<String> ALL = Set.of("mcp:context", "offline_access",
        "projects:read", "projects:create", "projects:update", "projects:delete",
        "objectives:create", "objectives:update", "objectives:delete",
        "tasks:read", "tasks:create", "tasks:update", "tasks:delete",
        "finance:read", "finance:create", "finance:update", "finance:delete");
    public static void validate(Set<String> scopes, Set<Long> projects, boolean standalone) {
        if (scopes == null || projects == null || scopes.stream().anyMatch(Objects::isNull) || !ALL.containsAll(scopes) || !scopes.contains("mcp:context")
                || projects.size() > 1000 || projects.stream().anyMatch(id -> id == null || id <= 0))
            throw invalid("Permissões ou projetos inválidos.");
        for (String scope : scopes) {
            if ((scope.startsWith("objectives:") || Set.of("projects:update", "projects:delete").contains(scope))
                    && !scopes.contains("projects:read")) throw invalid("Esta ação requer leitura de projetos.");
            if (scope.startsWith("tasks:") && !scope.equals("tasks:read") && !scopes.contains("tasks:read"))
                throw invalid("Esta ação requer leitura de tarefas.");
            if (scope.startsWith("finance:") && !scope.equals("finance:read") && !scopes.contains("finance:read"))
                throw invalid("Esta ação requer leitura financeira.");
        }
        if (!projects.isEmpty() && !scopes.contains("projects:read")) throw invalid("Selecionar projetos requer leitura de projetos.");
        if (standalone && scopes.stream().noneMatch(s -> s.startsWith("tasks:"))) throw invalid("Selecione uma ação sobre tarefas avulsas.");
    }
}
