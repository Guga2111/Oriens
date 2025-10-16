package com.oriens.oriens_api.repository;

import com.oriens.oriens_api.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class UserRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private UserRepository userRepository;

    // =================================================================
    // Tests for findByEmail()
    // =================================================================

    @Test
    void whenFindByEmail_withExistingEmail_thenShouldReturnUser() {
        User user = new User();
        user.setEmail("test.user@example.com");
        user.setPassword("password123");
        user.setName("Test User");

        entityManager.persistAndFlush(user);

        Optional<User> foundUserOptional = userRepository.findByEmail("test.user@example.com");

        assertThat(foundUserOptional).isPresent(); // Check that the Optional contains a value
        assertThat(foundUserOptional.get().getEmail()).isEqualTo("test.user@example.com");
    }

    @Test
    void whenFindByEmail_withNonExistingEmail_thenShouldReturnEmptyOptional() {
        User anotherUser = new User();
        anotherUser.setEmail("another@example.com");
        anotherUser.setPassword("password");
        anotherUser.setName("Another User");
        entityManager.persistAndFlush(anotherUser);

        Optional<User> foundUserOptional = userRepository.findByEmail("non.existent@example.com");

        assertThat(foundUserOptional).isEmpty();
    }
}