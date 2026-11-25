package com.oriens.oriens_api.security;

import com.oriens.oriens_api.service.ImageUploads;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;
import java.io.IOException;
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

        registry.addResourceHandler("/profile-pictures/**")
                .addResourceLocations(profileResourceLocation)
                .resourceChain(false).addResolver(new ImagesOnly());

        registry.addResourceHandler("/projects-pictures/**")
                .addResourceLocations(projectResourceLocation)
                .resourceChain(false).addResolver(new ImagesOnly());
    }

    /** Uploads stored before the image allowlist (e.g. .html, .svg) answer 404 instead of being served. */
    private static final class ImagesOnly extends PathResourceResolver {
        @Override
        protected Resource getResource(String resourcePath, Resource location) throws IOException {
            return ImageUploads.servable(resourcePath) ? super.getResource(resourcePath, location) : null;
        }
    }

    private String formatPathToResourceLocation(String pathString) {
        Path path = Paths.get(pathString).toAbsolutePath();
        return "file:" + path.toString().replace("\\", "/") + "/";
    }
}