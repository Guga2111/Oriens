package com.oriens.oriens_api.service;

import com.oriens.oriens_api.exception.WorkDomainException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;

/**
 * Policy for user images served publicly from disk: raster formats only, verified by content
 * signature. SVG and HTML are never accepted or served, so an upload cannot become stored XSS.
 */
public final class ImageUploads {
    public static final Set<String> EXTENSIONS = Set.of(".jpg", ".jpeg", ".png", ".gif", ".webp");
    private static final String TYPES = "Use uma imagem JPG, PNG, GIF ou WebP.";

    private ImageUploads() {}

    /** Validates the upload and returns its lower-case extension, including the dot. */
    public static String extension(MultipartFile file, long maxBytes, String field) throws IOException {
        if (file == null || file.isEmpty() || file.getSize() > maxBytes)
            throw new WorkDomainException("DOMAIN_VIOLATION", field, "Envie uma imagem de até " + maxBytes / (1024 * 1024) + " MB.");
        String extension = extensionOf(file.getOriginalFilename());
        if (!EXTENSIONS.contains(extension)) throw new WorkDomainException("DOMAIN_VIOLATION", field, TYPES);
        byte[] head;
        try (InputStream in = file.getInputStream()) { head = in.readNBytes(12); }
        if (!matches(extension, head)) throw new WorkDomainException("DOMAIN_VIOLATION", field, TYPES);
        return extension;
    }

    /** Whether a stored file may be served; older uploads with any other extension stay hidden. */
    public static boolean servable(String path) {
        return path != null && !path.contains("/") && EXTENSIONS.contains(extensionOf(path));
    }

    private static String extensionOf(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return dot < 0 ? "" : filename.substring(dot).toLowerCase(Locale.ROOT);
    }

    static boolean matches(String extension, byte[] head) {
        return switch (extension) {
            case ".jpg", ".jpeg" -> startsWith(head, 0, 0xFF, 0xD8, 0xFF);
            case ".png" -> startsWith(head, 0, 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A);
            case ".gif" -> ascii(head, 0, "GIF87a") || ascii(head, 0, "GIF89a");
            case ".webp" -> ascii(head, 0, "RIFF") && ascii(head, 8, "WEBP");
            default -> false;
        };
    }

    private static boolean startsWith(byte[] head, int offset, int... signature) {
        if (head.length < offset + signature.length) return false;
        for (int i = 0; i < signature.length; i++) if ((head[offset + i] & 0xFF) != signature[i]) return false;
        return true;
    }

    private static boolean ascii(byte[] head, int offset, String signature) {
        byte[] expected = signature.getBytes(StandardCharsets.US_ASCII);
        return head.length >= offset + expected.length
            && Arrays.equals(head, offset, offset + expected.length, expected, 0, expected.length);
    }
}
