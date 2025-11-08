package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.entity.dto.UserPreferencesDTO;
import com.oriens.oriens_api.entity.enums.UserRole;

import java.util.List;

public interface UserService {

    User getUser (Long id);
    User getUser(String email);

    UserPreferencesDTO getUserPreferences (Long id);

    UserPreferencesDTO updateUserPreferences (Long id, UserPreferencesDTO userPreferencesDTO);

    List<User> getUsers ();
    User saveUser (User user);

    User updateUser (Long id ); //add the info i wanna update

    void updateProfileImageUrl (Long userId, String imageUrl);

    void deleteUser (Long id);

    User updateUserRole (Long userId, UserRole role);
}
