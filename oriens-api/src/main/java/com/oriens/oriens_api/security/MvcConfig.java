package com.oriens.oriens_api.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class MvcConfig implements WebMvcConfigurer {

    @Value("${file.upload-dir}")
    private String profileUploadDir;

    @Value("${file.upload-project-dir}")
    private String projectUploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {

        String profileResourceLocation = formatPathToResourceLocation(profileUploadDir);
        String projectResourceLocation = formatPathToResourceLocation(projectUploadDir);

        System.out.println("Mapping /profile-pictures/** to -> " + profileResourceLocation);
        System.out.println("Mapping /projects-pictures/** to -> " + projectResourceLocation);

        registry.addResourceHandler("/profile-pictures/**")
                .addResourceLocations(profileResourceLocation);

        registry.addResourceHandler("/projects-pictures/**")
                .addResourceLocations(projectResourceLocation);
    }

    private String formatPathToResourceLocation(String pathString) {
        Path path = Paths.get(pathString).toAbsolutePath();
        return "file:" + path.toString().replace("\\", "/") + "/";
    }
}