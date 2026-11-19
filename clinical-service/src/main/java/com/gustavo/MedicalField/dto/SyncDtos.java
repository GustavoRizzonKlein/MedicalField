package com.gustavo.MedicalField.dto;

import com.gustavo.MedicalField.entity.Medication;

import java.time.Instant;
import java.util.List;

/**
 * Request and response bodies of /sync. Kept together because they only make sense as a set.
 */
public final class SyncDtos
{
    private SyncDtos()
    {
    }

    /** Operation types the client can queue in its Outbox. */
    public enum OperationType
    {
        PERSON_UPSERT,
        MEDICAL_RECORD_UPSERT,
        ENCOUNTER_CREATE
    }

    public enum Outcome
    {
        CREATED,
        UPDATED,
        KEPT_SERVER_VERSION,
        DUPLICATE,
        REJECTED
    }

    /** One Outbox entry. Exactly one of person, medicalRecord or encounter is filled, matching the type. */
    public record SyncOperation(
            String operationId,
            OperationType type,
            PersonDto person,
            MedicalRecordDto medicalRecord,
            EncounterDto encounter )
    {
    }

    public record SyncPushRequest( String deviceId, List<SyncOperation> operations )
    {
    }

    public record OperationResult(
            String operationId,
            OperationType type,
            String entityId,
            Outcome outcome,
            String message )
    {
    }

    public record SyncPushResponse( Instant serverTime, List<OperationResult> results )
    {
    }

    public record SyncPullResponse(
            Instant serverTime,
            List<Medication> medications,
            List<PersonDto> persons,
            List<MedicalRecordDto> medicalRecords,
            List<EncounterDto> encounters )
    {
    }
}
