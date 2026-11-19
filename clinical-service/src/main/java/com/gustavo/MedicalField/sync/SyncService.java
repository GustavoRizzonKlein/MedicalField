package com.gustavo.MedicalField.sync;

import com.gustavo.MedicalField.dto.SyncDtos.OperationResult;
import com.gustavo.MedicalField.dto.SyncDtos.Outcome;
import com.gustavo.MedicalField.dto.SyncDtos.SyncOperation;
import com.gustavo.MedicalField.dto.SyncDtos.SyncPullResponse;
import com.gustavo.MedicalField.dto.SyncDtos.SyncPushRequest;
import com.gustavo.MedicalField.dto.SyncDtos.SyncPushResponse;
import com.gustavo.MedicalField.entity.ProcessedOperation;
import com.gustavo.MedicalField.exception.BusinessRuleException;
import com.gustavo.MedicalField.repository.ProcessedOperationRepository;
import com.gustavo.MedicalField.security.AuthenticatedProfessional;
import com.gustavo.MedicalField.service.EncounterService;
import com.gustavo.MedicalField.service.MedicalRecordService;
import com.gustavo.MedicalField.service.MedicationService;
import com.gustavo.MedicalField.service.PersonService;
import com.gustavo.MedicalField.service.WriteResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Receives the client's Outbox (push) and sends the server state back (pull).
 * Each operation runs in its own transaction: one rejected operation does not undo the others.
 */
@Service
public class SyncService
{
    private static final Logger LOGGER = LoggerFactory.getLogger( SyncService.class );

    private final PersonService personService;
    private final MedicalRecordService medicalRecordService;
    private final EncounterService encounterService;
    private final MedicationService medicationService;
    private final ProcessedOperationRepository processedOperationRepository;
    private final TransactionTemplate transactionTemplate;

    public SyncService(
            PersonService personService,
            MedicalRecordService medicalRecordService,
            EncounterService encounterService,
            MedicationService medicationService,
            ProcessedOperationRepository processedOperationRepository,
            TransactionTemplate transactionTemplate )
    {
        this.personService = personService;
        this.medicalRecordService = medicalRecordService;
        this.encounterService = encounterService;
        this.medicationService = medicationService;
        this.processedOperationRepository = processedOperationRepository;
        this.transactionTemplate = transactionTemplate;
    }

    public SyncPullResponse pull()
    {
        return new SyncPullResponse(
                Instant.now(),
                medicationService.findAll(),
                personService.findAll(),
                medicalRecordService.findAll(),
                encounterService.findAll() );
    }

    /** Operations are applied in the order sent, so a person arrives before its medical record. */
    public SyncPushResponse push( SyncPushRequest request, AuthenticatedProfessional professional )
    {
        List<OperationResult> results = new ArrayList<>();
        if ( request.operations() != null )
        {
            for ( SyncOperation operation : request.operations() )
            {
                results.add( apply( operation, professional ) );
            }
        }
        LOGGER.info( "sync push device={} professional={} operations={}",
                request.deviceId(), professional.id(), results.size() );
        return new SyncPushResponse( Instant.now(), results );
    }

    /** Used by the regular POST routes too, with the Idempotency-Key header as operation id. */
    public OperationResult apply( SyncOperation operation, AuthenticatedProfessional professional )
    {
        String operationId = operation.operationId();
        if ( operationId == null || operationId.isBlank() || operation.type() == null )
        {
            return new OperationResult( operationId, operation.type(), null, Outcome.REJECTED,
                    "operationId and type are required" );
        }

        // Idempotency: an operation already applied is answered again without touching the data.
        var previous = processedOperationRepository.findById( operationId );
        if ( previous.isPresent() )
        {
            return new OperationResult( operationId, operation.type(), previous.get().getEntityId(), Outcome.DUPLICATE,
                    "Operation already processed with outcome " + previous.get().getOutcome() );
        }

        try
        {
            WriteResult result = transactionTemplate.execute( status ->
            {
                WriteResult written = switch ( operation.type() )
                {
                    case PERSON_UPSERT -> personService.upsert( require( operation.person(), "person" ), professional );
                    case MEDICAL_RECORD_UPSERT -> medicalRecordService.upsert( require( operation.medicalRecord(), "medicalRecord" ), professional );
                    case ENCOUNTER_CREATE -> encounterService.create( require( operation.encounter(), "encounter" ), professional );
                };
                ProcessedOperation processed = new ProcessedOperation();
                processed.setOperationId( operationId );
                processed.setEntityType( operation.type().name() );
                processed.setEntityId( written.entityId() );
                processed.setOutcome( written.outcome().name() );
                processed.setProcessedAt( Instant.now() );
                processedOperationRepository.save( processed );
                return written;
            } );
            return new OperationResult( operationId, operation.type(), result.entityId(), result.outcome(), result.message() );
        }
        catch ( BusinessRuleException exception )
        {
            return new OperationResult( operationId, operation.type(), null, Outcome.REJECTED, exception.getMessage() );
        }
        catch ( DataIntegrityViolationException exception )
        {
            LOGGER.warn( "sync operation {} violated a constraint", operationId, exception );
            return new OperationResult( operationId, operation.type(), null, Outcome.REJECTED,
                    "Data conflicts with a record already stored" );
        }
    }

    public static String newOperationId()
    {
        return UUID.randomUUID().toString();
    }

    private static <T> T require( T payload, String field )
    {
        if ( payload == null )
        {
            throw new BusinessRuleException( field + " payload is required for this operation type" );
        }
        return payload;
    }
}
