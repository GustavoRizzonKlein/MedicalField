package com.gustavo.MedicalField.sync.strategy;

import com.gustavo.MedicalField.sync.strategy.ConflictResolutionStrategy.ConflictDecision;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ConflictResolutionStrategyTest
{
    private static final Instant EARLIER = Instant.parse( "2026-11-19T10:00:00Z" );
    private static final Instant LATER = Instant.parse( "2026-11-19T10:05:00Z" );

    private final ConflictResolutionStrategy lastWriteWins = new LastWriteWinsStrategy();
    private final ConflictResolutionStrategy serverWins = new ServerWinsStrategy();

    @Test
    void lastWriteWinsAppliesNewerIncomingVersion()
    {
        assertEquals( ConflictDecision.APPLY_INCOMING, lastWriteWins.resolve( EARLIER, LATER ) );
    }

    @Test
    void lastWriteWinsKeepsNewerServerVersion()
    {
        assertEquals( ConflictDecision.KEEP_SERVER, lastWriteWins.resolve( LATER, EARLIER ) );
    }

    @Test
    void lastWriteWinsKeepsServerOnTie()
    {
        assertEquals( ConflictDecision.KEEP_SERVER, lastWriteWins.resolve( LATER, LATER ) );
    }

    @Test
    void serverWinsNeverAppliesIncomingVersion()
    {
        assertEquals( ConflictDecision.KEEP_SERVER, serverWins.resolve( EARLIER, LATER ) );
    }
}
