package com.gustavo.MedicalField.sync.strategy;

import java.time.Instant;

/**
 * The version saved most recently by a professional wins (the example given in the spec).
 * Ties keep the server version, so a resent identical record changes nothing.
 */
public class LastWriteWinsStrategy implements ConflictResolutionStrategy
{
    @Override
    public ConflictDecision resolve( Instant serverUpdatedAt, Instant incomingUpdatedAt )
    {
        if ( incomingUpdatedAt == null )
        {
            return ConflictDecision.KEEP_SERVER;
        }
        if ( serverUpdatedAt == null || incomingUpdatedAt.isAfter( serverUpdatedAt ) )
        {
            return ConflictDecision.APPLY_INCOMING;
        }
        return ConflictDecision.KEEP_SERVER;
    }

    @Override
    public String name()
    {
        return "last-write-wins";
    }
}
