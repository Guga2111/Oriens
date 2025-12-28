package com.oriens.oriens_api.events;

import com.oriens.oriens_api.entity.Tag;
import com.oriens.oriens_api.repository.TagRepository;
import lombok.AllArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@AllArgsConstructor
public class UserCreatedListener {

    private final TagRepository tagRepository;

    @EventListener
    @Transactional
    public void handleUserCreated (UserCreatedEvent event) {
        Long userId = event.getUserId();
        createDefaultTags(userId);
    }

    private void createDefaultTags(Long userId) {
        Tag investments = new Tag();
        investments.setUserId(userId);
        investments.setName("Investimentos");
        investments.setColor("#8B5CF6");
        investments.setIsDefault(true);

        Tag salary = new Tag();
        salary.setUserId(userId);
        salary.setName("Salário");
        salary.setColor("#0d8200");
        salary.setAllowNegative(false);
        salary.setIsDefault(true);

        Tag fixedCost = new Tag();
        fixedCost.setUserId(userId);
        fixedCost.setName("Gastos Fixos");
        fixedCost.setColor("#FB923C");
        fixedCost.setIsDefault(true);

        Tag sales = new Tag();
        sales.setUserId(userId);
        sales.setName("Compras");
        sales.setColor("#FB7185");
        sales.setIsDefault(true);

        Tag others = new Tag();
        others.setUserId(userId);
        others.setName("Outros");
        others.setColor("#6B7280");
        others.setIsDefault(true);

        tagRepository.saveAll(List.of(investments, salary, fixedCost, sales, others));
    }
}
