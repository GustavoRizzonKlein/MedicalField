package com.gustavo.MedicalField.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Encounter (atendimento). As input, personId, personName, professional fields, glasgowTotal
 * and syncedAt are ignored: the server derives them.
 */
public record EncounterDto(
        String id,
        String medicalRecordId,
        String personId,
        String personName,
        String professionalId,
        String professionalName,
        Instant occurredAt,
        String location,
        String chiefComplaint,
        Integer systolicBp,
        Integer diastolicBp,
        Integer heartRate,
        Integer respiratoryRate,
        Integer oxygenSaturation,
        BigDecimal temperature,
        Integer bloodGlucose,
        Integer glasgowEye,
        Integer glasgowVerbal,
        Integer glasgowMotor,
        Integer glasgowTotal,
        String manchesterPriority,
        String startCategory,
        String procedures,
        String notes,
        String destination,
        Instant createdAt,
        Instant syncedAt,
        List<EncounterMedicationDto> medications )
{
}
