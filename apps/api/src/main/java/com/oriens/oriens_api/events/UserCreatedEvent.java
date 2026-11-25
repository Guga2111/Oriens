package com.oriens.oriens_api.events;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class UserCreatedEvent extends ApplicationEvent {

    private final Long userId;

    public UserCreatedEvent (Object source, Long userId) {
        super(source);
        this.userId = userId;
    }
}
