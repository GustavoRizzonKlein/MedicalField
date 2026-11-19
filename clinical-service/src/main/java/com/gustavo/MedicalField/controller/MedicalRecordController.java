package com.gustavo.MedicalField.controller;

import com.gustavo.MedicalField.dto.MedicalRecordDto;
import com.gustavo.MedicalField.dto.SyncDtos.OperationResult;
import com.gustavo.MedicalField.dto.SyncDtos.OperationType;
import com.gustavo.MedicalField.dto.SyncDtos.SyncOperation;
import com.gustavo.MedicalField.security.AuthenticatedProfessional;
import com.gustavo.MedicalField.service.MedicalRecordService;
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
@RequestMapping( "/medical-records" )
public class MedicalRecordController
{
    private final MedicalRecordService medicalRecordService;
    private final SyncService syncService;

    public MedicalRecordController( MedicalRecordService medicalRecordService, SyncService syncService )
    {
        this.medicalRecordService = medicalRecordService;
        this.syncService = syncService;
    }

    @GetMapping
    public List<MedicalRecordDto> findAll()
    {
        return medicalRecordService.findAll();
    }

    @GetMapping( "/{id}" )
    public MedicalRecordDto findById( @PathVariable String id )
    {
        return medicalRecordService.findById( id );
    }

    @PostMapping
    public ResponseEntity<OperationResult> create(
            @RequestBody MedicalRecordDto medicalRecord,
            @RequestHeader( value = "Idempotency-Key", required = false ) String idempotencyKey,
            @RequestAttribute( AuthenticatedProfessional.REQUEST_ATTRIBUTE ) AuthenticatedProfessional professional )
    {
        String operationId = idempotencyKey != null ? idempotencyKey : SyncService.newOperationId();
        SyncOperation operation = new SyncOperation( operationId, OperationType.MEDICAL_RECORD_UPSERT, null, medicalRecord, null );
        return WriteResponses.toResponse( syncService.apply( operation, professional ) );
    }
}
