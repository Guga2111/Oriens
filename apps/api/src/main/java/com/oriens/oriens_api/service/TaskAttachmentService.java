package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.TaskAttachment;
import com.oriens.oriens_api.exception.WorkDomainException;
import com.oriens.oriens_api.repository.TaskAttachmentRepository;
import com.oriens.oriens_api.repository.TaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HashSet;
import java.util.Map;
import java.util.UUID;

@Service
public class TaskAttachmentService {
    private static final Logger LOG = LoggerFactory.getLogger(TaskAttachmentService.class);
    private static final long MIB = 1024L * 1024;
    private static final long OWNER_LIMIT = 256 * MIB;
    private static final int TASK_LIMIT = 32;
    private static final Duration LINK_LIFETIME = Duration.ofMinutes(5);
    private static final Duration UNUSED_LIFETIME = Duration.ofDays(1);
    private static final Map<String, String> IMAGE_TYPES = Map.of(
        ".jpg", "image/jpeg", ".png", "image/png", ".gif", "image/gif", ".webp", "image/webp");

    private final TaskRepository tasks;
    private final TaskLabelService labels;
    private final TaskAttachmentRepository attachments;
    private final TransactionTemplate transaction;
    private final Clock clock;
    private final Path directory;
    private final SecretKeySpec signingKey;

    public TaskAttachmentService(TaskRepository tasks, TaskLabelService labels, TaskAttachmentRepository attachments,
            PlatformTransactionManager manager, Clock clock, @Value("${file.upload-task-dir}") String directory,
            @Value("${JWT_SECRET}") String secret) {
        this.tasks = tasks;
        this.labels = labels;
        this.attachments = attachments;
        transaction = new TransactionTemplate(manager);
        this.clock = clock;
        this.directory = Path.of(directory).toAbsolutePath().normalize();
        signingKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    public record Upload(UUID id, String kind, String contentType) {}
    public record DownloadLink(UUID id, String contentType, Instant expiresAt, String url) {}
    public record Download(FileSystemResource resource, String contentType) {}

    public Upload upload(Long owner, Long taskId, String kind, long contentLength, InputStream body) {
        UUID id = UUID.randomUUID();
        // Commit the reservation first so a process restart can clean a partial file.
        transaction.executeWithoutResult(status -> {
            labels.lockOwner(owner);
            requireTask(owner, taskId);
            long fileLimit = switch (kind) {
                case "image" -> 2 * MIB;
                case "video" -> 20 * MIB;
                default -> throw invalid("Selecione imagem ou vídeo.");
            };
            if (contentLength == 0 || contentLength > fileLimit) throw invalid(sizeMessage(kind));
            long reservation = contentLength < 0 ? fileLimit : contentLength;
            if (attachments.countByTaskIdAndUserId(taskId, owner) >= TASK_LIMIT
                    || attachments.bytesForOwner(owner) + reservation > OWNER_LIMIT)
                throw invalid("Você atingiu o limite de anexos. Remova arquivos e tente novamente após a limpeza.");
            attachments.save(new TaskAttachment(id, taskId, owner, kind, reservation, clock.instant()));
        });

        try {
            return transaction.execute(status -> {
                TaskAttachment item = attachments.lockOwned(id, taskId, owner).orElseThrow(TaskAttachmentService::missing);
                requireTask(owner, taskId);
                return saveFile(item, body);
            });
        } catch (RuntimeException e) {
            // A crash or failed cleanup leaves the reservation for the scheduled job.
            try { transaction.executeWithoutResult(status -> cleanFailedUpload(owner, taskId, id)); }
            catch (RuntimeException cleanupFailure) { e.addSuppressed(cleanupFailure); }
            throw e;
        }
    }

    private Upload saveFile(TaskAttachment item, InputStream body) {
        try {
            byte[] head = body.readNBytes((int) Math.min(item.getBytes() + 1, 256));
            String type = mediaType(item.getKind(), head);
            if (head.length > item.getBytes()) throw invalid(sizeMessage(item.getKind()));
            Files.createDirectories(directory);
            Path staging = staging(item.getId());
            long bytes;
            try (OutputStream output = Files.newOutputStream(staging, StandardOpenOption.CREATE_NEW)) {
                output.write(head);
                bytes = copyBounded(body, output, head.length, item.getBytes(), item.getKind());
            }
            Files.move(staging, path(item.getId()), StandardCopyOption.ATOMIC_MOVE);
            item.completeUpload(type, bytes);
            return new Upload(item.getId(), item.getKind(), type);
        } catch (IOException e) {
            LOG.warn("Could not persist task attachment {}", item.getId(), e);
            throw new WorkDomainException("TEMPORARILY_UNAVAILABLE", "file", "Não foi possível guardar o arquivo. Tente novamente.");
        }
    }

    private static long copyBounded(InputStream input, OutputStream output, long bytes, long limit, String kind)
            throws IOException {
        byte[] buffer = new byte[8192];
        for (int read; (read = input.read(buffer)) != -1;) {
            bytes += read;
            if (bytes > limit) throw invalid(sizeMessage(kind));
            output.write(buffer, 0, read);
        }
        return bytes;
    }

    private static String mediaType(String kind, byte[] head) {
        if ("image".equals(kind)) {
            return IMAGE_TYPES.entrySet().stream().filter(entry -> ImageUploads.matches(entry.getKey(), head))
                .map(Map.Entry::getValue).findFirst().orElseThrow(() -> invalid("Use uma imagem JPG, PNG, GIF ou WebP."));
        }
        if (head.length >= 16 && ascii(head, 4, "ftyp") && (ascii(head, 8, "isom") || ascii(head, 8, "iso2")
                || ascii(head, 8, "mp41") || ascii(head, 8, "mp42") || ascii(head, 8, "avc1")
                || ascii(head, 8, "M4V ") || ascii(head, 8, "iso5") || ascii(head, 8, "iso6"))) return "video/mp4";
        if (head.length >= 12 && (head[0] & 255) == 0x1A && (head[1] & 255) == 0x45
                && (head[2] & 255) == 0xDF && (head[3] & 255) == 0xA3) {
            for (int i = 4; i + 7 <= head.length; i++) {
                if ((head[i] & 255) == 0x42 && (head[i + 1] & 255) == 0x82
                        && (head[i + 2] & 255) == 0x84 && ascii(head, i + 3, "webm")) return "video/webm";
            }
        }
        throw invalid("Use um vídeo MP4 ou WebM compatível.");
    }

    private static boolean ascii(byte[] bytes, int offset, String expected) {
        if (offset + expected.length() > bytes.length) return false;
        for (int i = 0; i < expected.length(); i++) if (bytes[offset + i] != expected.charAt(i)) return false;
        return true;
    }

    /** Called inside the versioned task write, after the task is locked. */
    @Transactional
    public void reconcile(Long owner, Long taskId, Map<UUID, String> referenced) {
        if (taskId == null) {
            if (!referenced.isEmpty()) throw missing();
            return;
        }
        var missing = new HashSet<>(referenced.keySet());
        Instant now = clock.instant();
        for (TaskAttachment item : attachments.lockForTask(taskId, owner)) {
            String kind = referenced.get(item.getId());
            if (kind == null) {
                item.unreference(now);
            } else {
                if (!kind.equals(item.getKind()) || item.getContentType() == null || !fileExists(item.getId())) throw missing();
                missing.remove(item.getId());
                item.reference();
            }
        }
        if (!missing.isEmpty()) throw missing();
    }

    @Transactional(readOnly = true)
    public DownloadLink issue(Long owner, Long taskId, UUID id, boolean referencedOnly) {
        TaskAttachment item = resolve(owner, taskId, id);
        if (referencedOnly && item.getUnusedSince() != null) throw missing();
        long expires = clock.instant().plus(LINK_LIFETIME).getEpochSecond();
        String signature = Base64.getUrlEncoder().withoutPadding().encodeToString(sign(owner, taskId, id, expires));
        String url = "/task/attachments/content/" + taskId + "/" + id + "?owner=" + owner + "&expires=" + expires + "&signature=" + signature;
        return new DownloadLink(id, item.getContentType(), Instant.ofEpochSecond(expires), url);
    }

    @Transactional(readOnly = true)
    public Download download(Long owner, Long taskId, UUID id, Long expires, String signature) {
        if (owner == null || expires == null || expires <= clock.instant().getEpochSecond()
                || signature == null || signature.length() != 43) throw missing();
        byte[] supplied;
        try { supplied = Base64.getUrlDecoder().decode(signature); }
        catch (IllegalArgumentException e) { throw missing(); }
        if (!MessageDigest.isEqual(supplied, sign(owner, taskId, id, expires))) throw missing();
        TaskAttachment item = resolve(owner, taskId, id);
        return new Download(new FileSystemResource(path(id)), item.getContentType());
    }

    private TaskAttachment resolve(Long owner, Long taskId, UUID id) {
        requireTask(owner, taskId);
        return attachments.findByIdAndTaskIdAndUserId(id, taskId, owner)
            .filter(item -> item.getContentType() != null && fileExists(id)).orElseThrow(TaskAttachmentService::missing);
    }

    private void requireTask(Long owner, Long taskId) {
        if (tasks.findByIdAndUserId(taskId, owner).isEmpty()) throw missing();
    }

    private byte[] sign(Long owner, Long taskId, UUID id, long expires) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(signingKey);
            String payload = "oriens:task-attachment:v1:" + owner + ":" + taskId + ":" + id + ":" + expires;
            return mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Cannot sign task attachment", e);
        }
    }

    @Scheduled(fixedDelay = 300_000)
    public void cleanup() {
        Instant cutoff = clock.instant().minus(UNUSED_LIFETIME);
        for (var candidate : attachments.expired(cutoff, PageRequest.of(0, 50))) {
            transaction.executeWithoutResult(status -> attachments.lockOwned(candidate.id(), candidate.taskId(), candidate.userId())
                .filter(item -> item.getUnusedSince() != null && item.getUnusedSince().isBefore(cutoff)
                    || tasks.findByIdAndUserId(item.getTaskId(), item.getUserId()).isEmpty())
                .ifPresent(this::removeFile));
        }
    }

    private void cleanFailedUpload(Long owner, Long taskId, UUID id) {
        attachments.lockOwned(id, taskId, owner).filter(item -> item.getContentType() == null).ifPresent(this::removeFile);
    }

    private void removeFile(TaskAttachment item) {
        try {
            Files.deleteIfExists(staging(item.getId()));
            Files.deleteIfExists(path(item.getId()));
            attachments.delete(item);
        } catch (IOException e) {
            LOG.warn("Could not clean task attachment {}", item.getId(), e);
        }
    }

    private Path path(UUID id) { return directory.resolve(id.toString()); }
    private Path staging(UUID id) { return directory.resolve(id + ".part"); }

    private boolean fileExists(UUID id) {
        return Files.isRegularFile(path(id), LinkOption.NOFOLLOW_LINKS);
    }

    private static String sizeMessage(String kind) {
        return kind.equals("image") ? "Envie uma imagem de até 2 MiB." : "Envie um vídeo de até 20 MiB.";
    }

    private static WorkDomainException invalid(String message) {
        return new WorkDomainException("DOMAIN_VIOLATION", "file", message);
    }

    private static WorkDomainException missing() {
        return new WorkDomainException("NOT_FOUND", null, "Anexo não encontrado.");
    }
}
