package com.gustavo.MedicalField.dto;

import java.math.BigDecimal;

/**
 * Body of POST and PUT /medications. "active" is optional and defaults to true.
 */
public record MedicationDto( String name, String unit, BigDecimal maximumDose, Boolean active )
{
}
