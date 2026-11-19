package com.gustavo.MedicalField.dto;

import com.gustavo.MedicalField.entity.MedicalRecord;

import java.time.Instant;

public record MedicalRecordDto(
        String id,
        String personId,
        String personName,
        String bloodType,
        String allergies,
        String chronicConditions,
        String continuousMedications,
        String notes,
        String createdBy,
        Instant createdAt,
        Instant updatedAt,
        Instant syncedAt )
{
    public static MedicalRecordDto from( MedicalRecord record, String personName )
    {
        return new MedicalRecordDto(
                record.getId(),
                record.getPersonId(),
                personName,
                record.getBloodType(),
                record.getAllergies(),
                record.getChronicConditions(),
                record.getContinuousMedications(),
                record.getNotes(),
                record.getCreatedBy(),
                record.getCreatedAt(),
                record.getUpdatedAt(),
                record.getSyncedAt() );
    }
}
