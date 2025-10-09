package com.oriens.oriens_api.controller;

import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.service.FileStorageService;
import com.oriens.oriens_api.service.UserServiceImpl;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@AllArgsConstructor
@RestController
@RequestMapping("/user")
public class UserController {

    private final UserServiceImpl userService;
    private final FileStorageService fileStorageService;

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById (@PathVariable Long id) {
        return new ResponseEntity<>(userService.getUser(id), HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<User> getUserByEmail (@RequestParam String email) {
        return new ResponseEntity<>(userService.getUser(email), HttpStatus.OK);
    }

    @PostMapping("/register")
    public ResponseEntity<User> saveUser (@RequestBody User user) {
        userService.saveUser(user);
        return new ResponseEntity<>(HttpStatus.CREATED);
    }

    @PutMapping("/{id}/avatar")
    public ResponseEntity<?> uploadProfileAvatar (
            @PathVariable Long id,
            @RequestParam("profileImage")MultipartFile file
            ) throws IOException {

        try {
            String fileName = fileStorageService.storeFile(file, id);

            String fileUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/profile-pictures/")
                    .path(fileName)
                    .toUriString();

            userService.updateProfileImageUrl(id, fileUrl);

            Map<String, String> response = new HashMap<>();
            response.put("profileImageUrl", fileUrl);

            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (IOException e) {
            return new ResponseEntity<>("Fail to save image.", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser (@PathVariable Long id) {
        userService.deleteUser(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

}
