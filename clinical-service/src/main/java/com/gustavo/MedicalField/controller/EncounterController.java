package com.gustavo.MedicalField.controller;

import com.gustavo.MedicalField.dto.EncounterDto;
import com.gustavo.MedicalField.dto.SyncDtos.OperationResult;
import com.gustavo.MedicalField.dto.SyncDtos.OperationType;
import com.gustavo.MedicalField.dto.SyncDtos.SyncOperation;
import com.gustavo.MedicalField.security.AuthenticatedProfessional;
import com.gustavo.MedicalField.service.EncounterService;
import com.gustavo.MedicalField.sync.SyncService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping( "/encounters" )
public class EncounterController
{
    private final EncounterService encounterService;
    private final SyncService syncService;

    public EncounterController( EncounterService encounterService, SyncService syncService )
    {
        this.encounterService = encounterService;
        this.syncService = syncService;
    }

    @GetMapping
    public List<EncounterDto> findAll()
    {
        return encounterService.findAll();
    }

    @GetMapping( "/{id}" )
    public EncounterDto findById( @PathVariable String id )
    {
        return encounterService.findById( id );
    }

    @PostMapping
    public ResponseEntity<OperationResult> create(
            @RequestBody EncounterDto encounter,
            @RequestHeader( value = "Idempotency-Key", required = false ) String idempotencyKey,
            @RequestAttribute( AuthenticatedProfessional.REQUEST_ATTRIBUTE ) AuthenticatedProfessional professional )
    {
        String operationId = idempotencyKey != null ? idempotencyKey : SyncService.newOperationId();
        SyncOperation operation = new SyncOperation( operationId, OperationType.ENCOUNTER_CREATE, null, null, encounter );
        return WriteResponses.toResponse( syncService.apply( operation, professional ) );
    }
}
