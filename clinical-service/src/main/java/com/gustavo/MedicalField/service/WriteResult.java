package com.gustavo.MedicalField.service;

import com.gustavo.MedicalField.dto.SyncDtos.Outcome;

/**
 * What a write did: created, updated, kept the server version or ignored a duplicate.
 */
public record WriteResult( String entityId, Outcome outcome, String message )
{
}
