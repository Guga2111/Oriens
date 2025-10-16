package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.exception.UserNotFoundException;
import com.oriens.oriens_api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final BCryptPasswordEncoder bCryptPasswordEncoder;
    private final UserRepository userRepository;

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
    public User saveUser(User user) {

        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new IllegalStateException();
        }

        user.setPassword(bCryptPasswordEncoder.encode(user.getPassword()));
        user.setEmail(user.getEmail().toLowerCase());

        return userRepository.save(user);
    }

    @Override
    public User updateUser(Long id) {
        User user = unwrapUser(userRepository.findById(id), id);

        // updating logic here

        return userRepository.save(user);
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

    static User unwrapUser (Optional<User> userOptional, Long id) {
        if (userOptional.isEmpty()) throw new UserNotFoundException(id); //custom exception UserNotFound
        return userOptional.get();
    }
}
