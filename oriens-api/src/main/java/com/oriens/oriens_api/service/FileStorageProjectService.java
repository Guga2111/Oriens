package com.oriens.oriens_api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageProjectService {

    private final Path fileStorageLocation;

    public FileStorageProjectService (@Value("${file.upload-project-dir}") String uploadDir) throws IOException {
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(this.fileStorageLocation);
    }

    public void discard(String filename) throws IOException {
        Path file = fileStorageLocation.resolve(filename).normalize();
        if (!file.getParent().equals(fileStorageLocation)) throw new IOException("Invalid path");
        Files.deleteIfExists(file);
    }

    public String storeFile (MultipartFile file, Long userId) throws IOException {
        if (file.isEmpty() || file.getSize() > 5 * 1024 * 1024)
            throw new com.oriens.oriens_api.exception.WorkDomainException("DOMAIN_VIOLATION", "projectImage", "Envie uma imagem de até 5 MB.");
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename() == null ? "" : file.getOriginalFilename());

        String fileExtension = "";

        try {
            fileExtension = originalFileName.substring(originalFileName.lastIndexOf("."));
        } catch (Exception e) {

        }

        fileExtension = fileExtension.toLowerCase(java.util.Locale.ROOT);
        if (!java.util.Set.of(".jpg", ".jpeg", ".png", ".gif", ".webp").contains(fileExtension))
            throw new com.oriens.oriens_api.exception.WorkDomainException("DOMAIN_VIOLATION", "projectImage", "Use JPG, PNG, GIF ou WebP.");
        String fileName = userId + "_" + UUID.randomUUID().toString() + fileExtension;

        Path targetLocation = this.fileStorageLocation.resolve(fileName);
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

        return fileName;
    }
}
