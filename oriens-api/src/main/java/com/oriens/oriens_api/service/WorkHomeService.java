package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.*;
import com.oriens.oriens_api.entity.dto.work.WorkHome.*;
import com.oriens.oriens_api.exception.WorkDomainException;
import com.oriens.oriens_api.repository.*;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.net.URI;
import java.time.Clock;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class WorkHomeService {
    private final WorkQuickLinkRepository links;
    private final WorkRecentVisitRepository visits;
    private final WorkReadService read;
    private final EntityManager em;
    private final Clock clock;
    private static final Set<String> INTERNAL = Set.of("/home", "/tasks", "/projects", "/all-data", "/stats", "/financial", "/config", "/support");

    @Transactional(readOnly = true)
    public List<LinkView> links(Long owner) {
        return links.findByUserIdOrderByCreatedAtAscIdAsc(owner, PageRequest.of(0, 20)).stream().map(LinkView::of).toList();
    }
    public LinkView createLink(Long owner, LinkInput input) {
        // WorkCreationService already owns this lock; also protect direct service calls and the limit.
        User user = lockOwner(owner);
        validate(input);
        if (links.countByUserId(owner) >= 20) throw invalid("name", "Você pode salvar até 20 links. Remova um antes de adicionar outro.");
        WorkQuickLink link = new WorkQuickLink();
        link.setUser(user);
        link.setName(input.name().trim());
        link.setUrl(input.url().trim());
        link.setCreatedAt(clock.instant());
        return LinkView.of(links.saveAndFlush(link));
    }
    public LinkView updateLink(Long owner, Long id, long version, LinkInput input) {
        WorkQuickLink link = ownedLink(owner, id);
        checkVersion(link, version);
        validate(input);
        link.setName(input.name().trim());
        link.setUrl(input.url().trim());
        return LinkView.of(links.saveAndFlush(link));
    }
    public void deleteLink(Long owner, Long id, long version) {
        WorkQuickLink link = ownedLink(owner, id);
        checkVersion(link, version);
        links.delete(link);
        links.flush();
    }
    @Transactional(readOnly = true)
    public boolean linkExists(Long owner, Long id) { return links.findByIdAndUserId(id, owner).isPresent(); }
    @Transactional(readOnly = true)
    public List<RecentView> recents(Long owner) { return visits.recent(owner, PageRequest.of(0, 10)); }

    public void visit(Long owner, VisitInput input) {
        if (input.type() == null || input.resourceId() == null || input.resourceId() <= 0)
            throw invalid("resourceId", "Informe uma tarefa ou projeto válido.");
        // Serializes the first visit and repeated opens across tabs without changing domain versions.
        User user = lockOwner(owner);
        boolean task = input.type() == ResourceType.TASK;
        if (task) {
            Task resource = read.task(owner, input.resourceId());
            if (resource.getProjectId() != null && Boolean.TRUE.equals(read.project(owner, resource.getProjectId()).getArchived()))
                throw missing();
        } else if (Boolean.TRUE.equals(read.project(owner, input.resourceId()).getArchived())) {
            throw missing();
        }
        WorkRecentVisit visit = (task ? visits.findByUserIdAndTaskId(owner, input.resourceId()) :
            visits.findByUserIdAndProjectId(owner, input.resourceId())).orElseGet(WorkRecentVisit::new);
        visit.setUser(user);
        if (task) visit.setTaskId(input.resourceId());
        else visit.setProjectId(input.resourceId());
        visit.setVisitedAt(clock.instant());
        visits.saveAndFlush(visit);
    }
    private User lockOwner(Long owner) {
        if (em.createNativeQuery("select id from users where id=:owner for no key update").setParameter("owner", owner).getResultList().isEmpty())
            throw new WorkDomainException("UNAUTHENTICATED", null, "Entre novamente para continuar.");
        return em.getReference(User.class, owner);
    }
    private WorkQuickLink ownedLink(Long owner, Long id) {
        return links.findByIdAndUserId(id, owner).orElseThrow(WorkHomeService::missing);
    }
    private void checkVersion(WorkQuickLink link, long version) {
        if (!Objects.equals(link.getVersion(), version))
            throw new WorkDomainException("VERSION_CONFLICT", "version", "O link mudou. Recarregue antes de salvar.");
    }
    private void validate(LinkInput input) {
        if (input.name() == null || input.name().isBlank() || input.name().trim().length() > 80)
            throw invalid("name", "Informe um nome com até 80 caracteres.");
        if (!validUrl(input.url())) throw invalid("url", "Informe uma página do Oriens ou um endereço HTTPS válido.");
    }
    public static boolean validUrl(String value) {
        if (value == null || value.isBlank() || value.trim().length() > 2048 || value.contains("\\")) return false;
        try {
            URI uri = new URI(value.trim());
            if (uri.getRawAuthority() != null && !"https".equalsIgnoreCase(uri.getScheme())) return false;
            if (uri.isAbsolute()) return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null && uri.getRawUserInfo() == null;
            String path = uri.getPath();
            return uri.getRawAuthority() == null && path != null && path.equals(uri.getRawPath()) &&
                (INTERNAL.contains(path) || path.matches("/tasks/project/[1-9][0-9]*"));
        } catch (java.net.URISyntaxException e) { return false; }
    }
    private static WorkDomainException missing() {
        return new WorkDomainException("NOT_FOUND", null, "Recurso não encontrado.");
    }
    private static WorkDomainException invalid(String field, String message) {
        return new WorkDomainException("INVALID_REQUEST", field, message);
    }
}
