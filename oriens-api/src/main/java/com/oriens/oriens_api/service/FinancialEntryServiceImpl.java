package com.oriens.oriens_api.service;

import tools.jackson.core.JacksonException;
import com.oriens.oriens_api.entity.FinancialEntry;
import com.oriens.oriens_api.entity.Tag;
import com.oriens.oriens_api.entity.dto.financial.EntryDTO;
import com.oriens.oriens_api.entity.dto.financial.FinancialCommands.*;
import com.oriens.oriens_api.mapper.FinancialMapper;
import com.oriens.oriens_api.repository.FinancialEntryRepository;
import com.oriens.oriens_api.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FinancialEntryServiceImpl implements FinancialEntryService {

    private final FinancialEntryRepository financialEntryRepository;
    private final TagRepository tagRepository;
    private final FinancialMapper financialMapper;
    private final java.time.Clock clock;

    private final WorkCreationService receipts;
    private final tools.jackson.databind.ObjectMapper json;
    private final jakarta.validation.Validator validator;
    private final jakarta.persistence.EntityManager em;

    /** All REST/MCP writers share this boundary. Owner lock precedes the entry lock.
     * Scheduler holds coverage -> origins, and never asks for an owner/connection lock. */
    @Override
    @Transactional(timeout=10)
    public WorkCreationService.Completed write(Long owner, String namespace, String key,
            com.oriens.oriens_api.entity.dto.financial.FinancialCommands.Command command) {
        if (command == null) throw fail("INVALID_REQUEST",null,"Informe a operação.");
        Long id = command instanceof Replace c ? c.entryId() : command instanceof Update c ? c.entryId() : command instanceof Delete c ? c.entryId() : null;
        Long version = command instanceof Replace c ? c.expectedVersion() : command instanceof Update c ? c.expectedVersion() : command instanceof Delete c ? c.expectedVersion() : null;
        if (!(command instanceof Create)) {
            if (version == null) throw fail("PRECONDITION_REQUIRED","expectedVersion","Informe a versão lida do lançamento.");
            if (id == null || id <= 0 || version < 0) throw fail("INVALID_REQUEST",null,"ID ou versão inválida.");
        }
        if (command instanceof Update c && (c.patch()==null || c.patch().values().isEmpty()))
            throw fail("INVALID_REQUEST",null,"Informe ao menos um campo para alterar.");
        String action=command instanceof Create ? "create" : command instanceof Delete ? "delete" : "update";
        return receipts.execute(owner,namespace+":"+action,key,command,command instanceof Create ? 201 : 200,()-> {
            FinancialEntry entry=null;
            if (!(command instanceof Create)) {
                entry=financialEntryRepository.lockOwned(id,owner).orElseThrow(()->fail("NOT_FOUND",null,"Lançamento não encontrado."));
                if (entry.getVersion()!=version) throw fail("VERSION_CONFLICT","expectedVersion","O lançamento mudou. Recarregue antes de salvar.");
            }
            if (command instanceof Delete) {
                if (financialEntryRepository.hasOccurrences(id))
                    throw fail("DOMAIN_VIOLATION",null,"Esta recorrência possui ocorrências. Encerre pela data final para preservar os lançamentos.");
                financialEntryRepository.delete(entry);
                financialEntryRepository.flush();
                return new WorkCreationService.Created(java.util.Map.of("deleted",true,"id",id),version,id);
            }
            Input input;
            if (command instanceof Create c) input=c.input();
            else if (command instanceof Replace c) input=c.input();
            else {
                var c=(Update)command;
                var state=json.valueToTree(input(financialMapper.toDTO(entry)));
                c.patch().values().forEach((name,value)->((tools.jackson.databind.node.ObjectNode)state).set(name,value));
                try { input=json.treeToValue(state,Input.class); }
                catch(JacksonException|IllegalArgumentException e) { throw fail("INVALID_REQUEST",null,"Campos financeiros inválidos."); }
            }
            validate(input);
            Tag tag=tagRepository.findByUserIdAndId(owner,input.tagId()).orElseThrow(()->fail("NOT_FOUND","tagId","Categoria não encontrada."));
            if (!tag.getAllowNegative() && input.amount().signum()<0)
                throw fail("DOMAIN_VIOLATION","amount","A categoria não permite despesas.");
            EntryDTO dto=dto(input);
            if (entry==null) {
                entry=financialMapper.toEntity(dto,owner,tag);
                entry.setRecurrenceStartedOn(today());
            } else {
                if (entry.getParentEntryId()!=null)
                    throw fail("DOMAIN_VIOLATION",null,"Não é possível editar uma ocorrência automática. Edite a recorrência original.");
                if (financialEntryRepository.hasOccurrences(id)
                        && (!entry.getEntryDate().equals(input.entryDate()) || entry.getRecurrencePattern()!=input.recurrencePattern() || !input.isRecurring()))
                    throw fail("DOMAIN_VIOLATION",null,"Esta recorrência já possui ocorrências. Preserve início e frequência; use a data final para encerrá-la.");
                if (!Boolean.TRUE.equals(entry.getIsRecurring()) && input.isRecurring()) entry.setRecurrenceStartedOn(today());
                financialMapper.updateEntity(entry,dto,tag);
                // Every accepted update consumes the version, including a semantic no-op.
                entry.setUpdatedAt(java.time.LocalDateTime.ofInstant(clock.instant(),com.oriens.oriens_api.configuration.ProductClockConfiguration.ZONE));
            }
            entry=financialEntryRepository.saveAndFlush(entry);
            if (version!=null && entry.getVersion()==version) em.lock(entry,jakarta.persistence.LockModeType.PESSIMISTIC_FORCE_INCREMENT);
            return new WorkCreationService.Created(financialMapper.toDTO(entry),entry.getVersion(),entry.getId());
        },receipt -> {
            if (!(command instanceof Delete) && !financialEntryRepository.existsByIdAndUserId(receipt.getResourceId(),owner))
                throw fail("RESOURCE_GONE",null,"O lançamento foi excluído. Consulte os dados antes de tentar novamente.");
        });
    }
    private LocalDate today() { return LocalDate.now(clock.withZone(com.oriens.oriens_api.configuration.ProductClockConfiguration.ZONE)); }
    private void validate(Input input) {
        if(input==null) throw fail("INVALID_REQUEST",null,"Informe os dados do lançamento.");
        var errors=validator.validate(input);
        if(!errors.isEmpty()) {
            var error=errors.iterator().next();throw fail("INVALID_REQUEST",error.getPropertyPath().toString(),error.getMessage());
        }
        if (input.entryDate().getYear()<1 || input.entryDate().getYear()>9999 || input.recurrenceEndDate()!=null && (input.recurrenceEndDate().getYear()<1 || input.recurrenceEndDate().getYear()>9999))
            throw fail("INVALID_REQUEST","entryDate","Use uma data entre 0001 e 9999.");
        if (input.isRecurring() && input.recurrencePattern()==null)
            throw fail("DOMAIN_VIOLATION","recurrencePattern","Escolha a frequência da recorrência.");
        if (input.isRecurring() && input.recurrenceEndDate()!=null && input.recurrenceEndDate().isBefore(input.entryDate()))
            throw fail("DOMAIN_VIOLATION","recurrenceEndDate","A data final não pode anteceder o início.");
    }
    public static Input input(EntryDTO dto) { return new Input(dto.getAmount(),dto.getEntryDate(),dto.getDescription(),dto.getTagId(),dto.getIsRecurring(),dto.getRecurrencePattern(),dto.getRecurrenceEndDate()); }
    private EntryDTO dto(Input input) {
        EntryDTO dto=new EntryDTO();dto.setAmount(input.amount());dto.setEntryDate(input.entryDate());dto.setDescription(input.description());dto.setTagId(input.tagId());
        dto.setIsRecurring(input.isRecurring());dto.setRecurrencePattern(input.recurrencePattern());dto.setRecurrenceEndDate(input.recurrenceEndDate());return dto;
    }
    private static com.oriens.oriens_api.exception.WorkDomainException fail(String code,String field,String message) {
        return new com.oriens.oriens_api.exception.WorkDomainException(code,field,message);
    }

    public Page<EntryDTO> filtered(Long owner,LocalDate start,LocalDate end,Long tagId,String search,Pageable page) {
        if(tagId!=null) tagRepository.findByUserIdAndId(owner,tagId).orElseThrow(()->fail("NOT_FOUND","tagId","Categoria não encontrada."));
        return financialEntryRepository.filtered(owner,start,end,tagId,search==null||search.isBlank()?null:search.strip(),page).map(financialMapper::toDTO);
    }

    @Override
    public EntryDTO getEntry(Long id, Long userId) {
        FinancialEntry financialEntry = financialEntryRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> fail("NOT_FOUND",null,"Lançamento não encontrado."));

        return financialMapper.toDTO(financialEntry);
    }

    @Override
    public Page<EntryDTO> getEntries(Long userId, Pageable pageable) {
        Page<FinancialEntry> entryPage = financialEntryRepository.findByUserId(userId, pageable);

        return entryPage.map(financialMapper::toDTO);
    }

    @Override
    public Page<EntryDTO> getEntriesByPeriod(Long userId, LocalDate startDate, LocalDate endDate, Pageable pageable) {
        Page<FinancialEntry> entryPage = financialEntryRepository.findByUserIdAndEntryDateBetween(userId, startDate, endDate, pageable);

        return entryPage.map(financialMapper::toDTO);
    }

    @Override
    public Page<EntryDTO> getEntriesByTag(Long userId, Long tagId, Pageable pageable) {
        Tag tag = tagRepository.findByUserIdAndId(userId, tagId)
                .orElseThrow(() -> fail("NOT_FOUND","tagId","Categoria não encontrada."));

        Page<FinancialEntry> entryPage = financialEntryRepository.findByUserIdAndTag(userId, tag, pageable);

        return entryPage.map(financialMapper::toDTO);
    }

    @Override
    public Page<EntryDTO> searchEntriesByDescription(Long userId, String description, Pageable pageable) {
        Page<FinancialEntry> entryPage = financialEntryRepository.findByUserIdAndDescriptionContainingIgnoreCase(userId, description, pageable);

        return entryPage.map(financialMapper::toDTO);
    }

    @Override
    public long countUserEntries(Long userId) {
        return financialEntryRepository.countByUserId(userId);
    }

    @Override
    public List<EntryDTO> getRecurringEntries(Long userId) {
        List<FinancialEntry> entries = financialEntryRepository
                .findByUserIdAndIsRecurringTrueAndParentEntryIdIsNull(userId);
        return entries.stream()
                .map(financialMapper::toDTO)
                .collect(Collectors.toList());
    }

}
