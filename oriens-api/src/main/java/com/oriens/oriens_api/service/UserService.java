package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.User;

import java.util.List;

public interface UserService {

    User getUser (Long id);
    User getUser(String email);

    List<User> getUsers ();
    User saveUser (User user);

    User updateUser (Long id ); //add the info i wanna update

    void deleteUser (Long id);
}
