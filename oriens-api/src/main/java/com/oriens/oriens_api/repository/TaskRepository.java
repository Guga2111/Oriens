package com.oriens.oriens_api.repository;

import com.oriens.oriens_api.entity.Task;
import org.springframework.data.repository.CrudRepository;

public interface TaskRepository extends CrudRepository<Task, Long> {
}
