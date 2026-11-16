package com.oriens.oriens_api.controller;

import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.entity.dto.UserPreferencesDTO;
import com.oriens.oriens_api.entity.enums.UserRole;
import com.oriens.oriens_api.exception.WorkDomainException;
import com.oriens.oriens_api.security.WorkOwner;
import com.oriens.oriens_api.service.FileStorageService;
import com.oriens.oriens_api.service.UserServiceImpl;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@AllArgsConstructor
@RestController
@RequestMapping("/user")
public class UserController {

    private final UserServiceImpl userService;
    private final FileStorageService fileStorageService;
    private final WorkOwner owner;

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById (Authentication auth, @PathVariable Long id) {
        return new ResponseEntity<>(userService.getUser(owner.matching(auth, id)), HttpStatus.OK);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<User> updatePhoneNumber(Authentication auth, @PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long ownerId = owner.matching(auth, id);
        if (!body.containsKey("phoneNumber")) {
            return ResponseEntity.badRequest().build();
        }
        Object value = body.get("phoneNumber");
        if (value != null && (!(value instanceof String phone) || !phone.matches("\\+[1-9][0-9]{1,14}"))) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(userService.updatePhoneNumber(ownerId, (String) value));
    }

    // Only resolves the caller's own account: looking up other users by e-mail would allow enumeration.
    @GetMapping
    public ResponseEntity<User> getUserByEmail (Authentication auth, @RequestParam String email) {
        User user = userService.getUser(owner.id(auth));
        if (!user.getEmail().equalsIgnoreCase(email.trim())) {
            throw new WorkDomainException("NOT_FOUND", null, "Recurso não encontrado.");
        }
        return new ResponseEntity<>(user, HttpStatus.OK);
    }

    @GetMapping("/{id}/preferences")
    public ResponseEntity<UserPreferencesDTO> getUserPreferences (Authentication auth, @PathVariable Long id) {
        return new ResponseEntity<>(userService.getUserPreferences(owner.matching(auth, id)), HttpStatus.OK);
    }

    @PatchMapping("/{id}/preferences")
    public ResponseEntity<UserPreferencesDTO> updateUserPreferences (Authentication auth, @PathVariable Long id, @RequestBody UserPreferencesDTO userPreferencesDTO) {
        return new ResponseEntity<>(userService.updateUserPreferences(owner.matching(auth, id), userPreferencesDTO), HttpStatus.OK);
    }

    @PostMapping("/register")
    public ResponseEntity<User> saveUser (@RequestBody User user) {
        User registration = new User();
        registration.setName(user.getName());
        registration.setEmail(user.getEmail());
        registration.setPassword(user.getPassword());
        registration.setPhoneNumber(user.getPhoneNumber());
        userService.saveUser(registration);
        return new ResponseEntity<>(HttpStatus.CREATED);
    }

    @PutMapping("/{id}/avatar")
    public ResponseEntity<?> uploadProfileAvatar (
            Authentication auth,
            @PathVariable Long id,
            @RequestParam("profileImage")MultipartFile file
            ) throws IOException {
        Long ownerId = owner.matching(auth, id);

        try {
            String fileName = fileStorageService.storeFile(file, ownerId);

            String fileUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/profile-pictures/")
                    .path(fileName)
                    .toUriString();

            userService.updateProfileImageUrl(ownerId, fileUrl);

            Map<String, String> response = new HashMap<>();
            response.put("profileImageUrl", fileUrl);

            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (IOException e) {
            return new ResponseEntity<>("Fail to save image.", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser (Authentication auth, @PathVariable Long id) {
        userService.deleteUser(owner.matching(auth, id));
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    // Admin endpoints
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/all-users")
    public ResponseEntity<List<User>> getAllUsers () {
        List<User> users = userService.getUsers();
        return new ResponseEntity<>(users, HttpStatus.OK);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/admin/{userId}/role/{role}")
    public ResponseEntity<User> updateUserRole (
            @PathVariable Long userId,
            @PathVariable String role) {
        try {
            UserRole userRole = UserRole.valueOf(role.toUpperCase());
            User updatedUser = userService.updateUserRole(userId, userRole);
            return new ResponseEntity<>(updatedUser, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    // Retired: provisioning an administrator is a maintenance operation.
    @PostMapping("/init-admin")
    public ResponseEntity<?> initFirstAdmin() {
        return ResponseEntity.status(HttpStatus.GONE).build();
    }

}
