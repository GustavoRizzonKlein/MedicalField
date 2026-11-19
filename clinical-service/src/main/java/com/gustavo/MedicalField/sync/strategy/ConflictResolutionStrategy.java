package com.gustavo.MedicalField.sync.strategy;

import java.time.Instant;

/**
 * Strategy Pattern: decides what happens when a record that already exists on the server
 * arrives again from a device with different data. The sync code depends only on this
 * interface; the concrete rule is chosen by configuration (medicalfield.sync.conflict-strategy).
 */
public interface ConflictResolutionStrategy
{
    ConflictDecision resolve( Instant serverUpdatedAt, Instant incomingUpdatedAt );

    String name();

    enum ConflictDecision
    {
        APPLY_INCOMING,
        KEEP_SERVER
    }
}
