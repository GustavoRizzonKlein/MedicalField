package com.gustavo.MedicalField.controller;

import com.gustavo.MedicalField.dto.EncounterDto;
import com.gustavo.MedicalField.dto.MedicalRecordDto;
import com.gustavo.MedicalField.dto.PersonDto;
import com.gustavo.MedicalField.dto.SyncDtos.OperationResult;
import com.gustavo.MedicalField.dto.SyncDtos.OperationType;
import com.gustavo.MedicalField.dto.SyncDtos.SyncOperation;
import com.gustavo.MedicalField.security.AuthenticatedProfessional;
import com.gustavo.MedicalField.service.EncounterService;
import com.gustavo.MedicalField.service.MedicalRecordService;
import com.gustavo.MedicalField.service.PersonService;
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
@RequestMapping( "/persons" )
public class PersonController
{
    private final PersonService personService;
    private final MedicalRecordService medicalRecordService;
    private final EncounterService encounterService;
    private final SyncService syncService;

    public PersonController(
            PersonService personService,
            MedicalRecordService medicalRecordService,
            EncounterService encounterService,
            SyncService syncService )
    {
        this.personService = personService;
        this.medicalRecordService = medicalRecordService;
        this.encounterService = encounterService;
        this.syncService = syncService;
    }

    @GetMapping
    public List<PersonDto> findAll()
    {
        return personService.findAll();
    }

    @GetMapping( "/{id}" )
    public PersonDto findById( @PathVariable String id )
    {
        return personService.findById( id );
    }

    @GetMapping( "/{id}/medical-record" )
    public MedicalRecordDto findMedicalRecord( @PathVariable String id )
    {
        return medicalRecordService.findByPersonId( id );
    }

    @GetMapping( "/{id}/encounters" )
    public List<EncounterDto> findEncounters( @PathVariable String id )
    {
        return encounterService.findByPersonId( id );
    }

    @PostMapping
    public ResponseEntity<OperationResult> create(
            @RequestBody PersonDto person,
            @RequestHeader( value = "Idempotency-Key", required = false ) String idempotencyKey,
            @RequestAttribute( AuthenticatedProfessional.REQUEST_ATTRIBUTE ) AuthenticatedProfessional professional )
    {
        String operationId = idempotencyKey != null ? idempotencyKey : SyncService.newOperationId();
        SyncOperation operation = new SyncOperation( operationId, OperationType.PERSON_UPSERT, person, null, null );
        return WriteResponses.toResponse( syncService.apply( operation, professional ) );
    }
}
