package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.entity.dto.UserPreferencesDTO;
import com.oriens.oriens_api.entity.embeddable.UserPreferences;
import com.oriens.oriens_api.entity.enums.UserRole;
import com.oriens.oriens_api.events.UserCreatedEvent;
import com.oriens.oriens_api.exception.UserNotFoundException;
import com.oriens.oriens_api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final BCryptPasswordEncoder bCryptPasswordEncoder;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public User getUser(Long id) {
        return unwrapUser(userRepository.findById(id), id);
    }

    @Override
    public User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException(email));
    }

    @Override
    public List<User> getUsers() {
        return (List<User>) userRepository.findAll();
    }

    @Override
    public UserPreferencesDTO getUserPreferences(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException(id));

        UserPreferences userPreferences = user.getUserPreferences();
        if (userPreferences == null) {
            userPreferences = new UserPreferences(true, true, "light");
        }

        return UserPreferencesDTO.builder()
                .notifications(userPreferences.getNotifications())
                .sound(userPreferences.getSound())
                .theme(userPreferences.getTheme())
                .build();
    }

    @Override
    public User saveUser(User user) {

        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new IllegalStateException("This email already exists!");
        }

        user.setPassword(bCryptPasswordEncoder.encode(user.getPassword()));
        user.setEmail(user.getEmail().toLowerCase());

        User saved = userRepository.save(user);

        eventPublisher.publishEvent(new UserCreatedEvent(this, saved.getId()));

        return saved;
    }

    @Override
    public User updateUser(Long id) {
        User user = unwrapUser(userRepository.findById(id), id);

        // updating logic here

        return userRepository.save(user);
    }

    @Override
    public UserPreferencesDTO updateUserPreferences(Long id, UserPreferencesDTO userPreferencesDTO) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException(id));

        UserPreferences userPreferences = user.getUserPreferences();
        if (userPreferences == null) {
            userPreferences = new UserPreferences();
        }

        String theme = userPreferencesDTO.getTheme();
        if (theme != null && (theme.equals("light") || theme.equals("dark"))) {
            userPreferences.setTheme(theme);
        }

        if (userPreferencesDTO.getNotifications() != null) {
            userPreferences.setNotifications(userPreferencesDTO.getNotifications());
        }

        if (userPreferencesDTO.getSound() != null) {
            userPreferences.setSound(userPreferencesDTO.getSound());
        }

        user.setUserPreferences(userPreferences);
        userRepository.save(user);

        return UserPreferencesDTO.builder()
                .notifications(userPreferences.getNotifications())
                .sound(userPreferences.getSound())
                .theme(userPreferences.getTheme())
                .build();
    }

    @Override
    public void updateProfileImageUrl(Long userId, String imageUrl) {
        User user = unwrapUser(userRepository.findById(userId), userId);
        user.setProfileImageUrl(imageUrl);
        userRepository.save(user);
    }

    @Override
    public void deleteUser(Long id) {
        User user = unwrapUser(userRepository.findById(id), id);
        userRepository.delete(user);
    }

    @Override
    public User updateUserRole(Long userId, UserRole role) {
        User user = unwrapUser(userRepository.findById(userId), userId);
        user.setRole(role);
        return userRepository.save(user);
    }

    static User unwrapUser (Optional<User> userOptional, Long id) {
        if (userOptional.isEmpty()) throw new UserNotFoundException(id);
        return userOptional.get();
    }
}
