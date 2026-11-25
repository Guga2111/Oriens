package com.oriens.oriens_api.service;

import com.oriens.oriens_api.exception.WorkDomainException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ImageUploadsTest {
    static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D};
    static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10};
    static final byte[] GIF = "GIF89a\u0001\u0000".getBytes(StandardCharsets.US_ASCII);
    static final byte[] WEBP = "RIFF$\u0000\u0000\u0000WEBPVP8 ".getBytes(StandardCharsets.US_ASCII);
    static final byte[] HTML = "<html><script>alert(document.cookie)</script></html>".getBytes(StandardCharsets.UTF_8);
    static final byte[] SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" onload=\"alert(1)\"/>".getBytes(StandardCharsets.UTF_8);

    static MockMultipartFile file(String name, byte[] content) { return new MockMultipartFile("profileImage", name, "image/png", content); }
    static String extension(String name, byte[] content) throws Exception { return ImageUploads.extension(file(name, content), 1024, "profileImage"); }

    @Test void acceptsRasterImagesWhoseContentMatchesTheExtension() throws Exception {
        assertThat(extension("a.png", PNG)).isEqualTo(".png");
        assertThat(extension("a.JPG", JPEG)).isEqualTo(".jpg");
        assertThat(extension("a.jpeg", JPEG)).isEqualTo(".jpeg");
        assertThat(extension("a.gif", GIF)).isEqualTo(".gif");
        assertThat(extension("a.webp", WEBP)).isEqualTo(".webp");
    }

    // Regression: avatars kept any extension and were served publicly, so .html/.svg became stored XSS.
    @Test void rejectsScriptableFormatsDisguisedContentAndMissingExtensions() {
        for (var attempt : new Object[][] {{"evil.html", HTML}, {"evil.svg", SVG}, {"evil.png", HTML}, {"evil.gif", PNG},
                {"evil", PNG}, {"evil.png.html", PNG}, {"tiny.png", new byte[] {(byte) 0x89, 'P'}}})
            assertThatThrownBy(() -> extension((String) attempt[0], (byte[]) attempt[1]))
                .as((String) attempt[0]).isInstanceOf(WorkDomainException.class)
                .hasFieldOrPropertyWithValue("code", "DOMAIN_VIOLATION").hasFieldOrPropertyWithValue("field", "profileImage");
    }

    @Test void rejectsEmptyAndOversizedFiles() {
        assertThatThrownBy(() -> extension("a.png", new byte[0])).hasMessageContaining("MB");
        assertThatThrownBy(() -> ImageUploads.extension(file("a.png", PNG), 4, "profileImage")).hasMessageContaining("MB");
    }

    @Test void onlyAllowlistedFilesAreServable() {
        assertThat(ImageUploads.servable("1_abc.png")).isTrue();
        assertThat(ImageUploads.servable("1_abc.WEBP")).isTrue();
        assertThat(ImageUploads.servable("1_abc.html")).isFalse();
        assertThat(ImageUploads.servable("1_abc.svg")).isFalse();
        assertThat(ImageUploads.servable("1_abc")).isFalse();
        assertThat(ImageUploads.servable("nested/1_abc.png")).isFalse();
    }
}
