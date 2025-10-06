package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.User;
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
        return unwrapUser(userRepository.findById(id));
    }

    @Override
    public User getUser(String email) {
        return unwrapUser(userRepository.findByEmail(email));
    }

    @Override
    public List<User> getUsers() {
        return (List<User>) userRepository.findAll();
    }

    @Override
    public User saveUser(User user) {

        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new IllegalStateException(); // custom exception
        }

        user.setPassword(bCryptPasswordEncoder.encode(user.getPassword()));
        user.setEmail(user.getEmail().toLowerCase());

        return userRepository.save(user);
    }

    @Override
    public User updateUser(Long id) {
        User user = unwrapUser(userRepository.findById(id));

        // updating logic here

        return userRepository.save(user);
    }

    @Override
    public void deleteUser(Long id) {
        User user = unwrapUser(userRepository.findById(id));
        userRepository.delete(user);
    }

    static User unwrapUser (Optional<User> userOptional) {
        if (userOptional.isEmpty()) throw new RuntimeException(); //custom exception UserNotFound
        return userOptional.get();
    }
}
