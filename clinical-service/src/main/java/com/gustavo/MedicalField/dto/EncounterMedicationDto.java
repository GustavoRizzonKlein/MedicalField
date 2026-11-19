package com.gustavo.MedicalField.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record EncounterMedicationDto(
        String id,
        String medicationId,
        String medicationName,
        BigDecimal dose,
        String unit,
        String route,
        Instant administeredAt )
{
}
