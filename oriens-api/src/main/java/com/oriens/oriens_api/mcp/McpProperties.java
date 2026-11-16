package com.oriens.oriens_api.mcp;

import org.springframework.boot.context.properties.ConfigurationProperties;
import java.net.URI;
import java.util.*;

@ConfigurationProperties("oriens.mcp")
public record McpProperties(boolean enabled, URI issuer, URI frontend, String encryptionPassword,
        String encryptionSalt, List<String> codexRedirects, List<String> claudeRedirects) {
    public McpProperties {
        if (enabled) {
            checkUrl(issuer); checkUrl(frontend);
            if (encryptionPassword == null || encryptionPassword.length() < 32 || encryptionSalt == null
                    || !encryptionSalt.matches("[0-9a-fA-F]{32,}"))
                throw new IllegalArgumentException("MCP requires an external encryption password and hexadecimal salt");
            if (codexRedirects == null || codexRedirects.isEmpty() || claudeRedirects == null || claudeRedirects.isEmpty())
                throw new IllegalArgumentException("MCP requires explicitly registered callback URLs for both clients");
            for (String callback : java.util.stream.Stream.concat(codexRedirects.stream(), claudeRedirects.stream()).toList()) {
                URI uri = URI.create(callback);
                if (!"http".equals(uri.getScheme()) || !("127.0.0.1".equals(uri.getHost()) || "localhost".equals(uri.getHost()))
                        || uri.getRawQuery()!=null || uri.getRawFragment()!=null || uri.getUserInfo()!=null
                        || uri.getPath()==null || !uri.getPath().startsWith("/"))
                    throw new IllegalArgumentException("MCP callbacks must have explicit loopback hosts and paths");
            }
        }
    }
    private static void checkUrl(URI uri) {
        if (uri == null || uri.getHost()==null || uri.getUserInfo()!=null || uri.getRawQuery()!=null || uri.getRawFragment()!=null
                || !(uri.getPath().isEmpty() || uri.getPath().equals("/"))
                || !("https".equals(uri.getScheme()) || ("http".equals(uri.getScheme()) && "127.0.0.1".equals(uri.getHost()))))
            throw new IllegalArgumentException("MCP issuer/frontend must be trusted HTTPS origins (127.0.0.1 HTTP for isolated tests)");
    }
    public String resource() { return issuer.toString().replaceAll("/$", "") + "/mcp"; }
    public String base() { return issuer.toString().replaceAll("/$", ""); }
    @Override public String toString() { return "McpProperties[enabled=" + enabled + "]"; }
}
