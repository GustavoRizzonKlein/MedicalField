package com.gustavo.MedicalField.sync.strategy;

import java.time.Instant;

/**
 * Conservative alternative: once a record is on the server, devices cannot overwrite it.
 */
public class ServerWinsStrategy implements ConflictResolutionStrategy
{
    @Override
    public ConflictDecision resolve( Instant serverUpdatedAt, Instant incomingUpdatedAt )
    {
        return ConflictDecision.KEEP_SERVER;
    }

    @Override
    public String name()
    {
        return "server-wins";
    }
}
