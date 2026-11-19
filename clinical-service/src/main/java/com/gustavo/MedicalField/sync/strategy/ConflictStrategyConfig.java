package com.gustavo.MedicalField.sync.strategy;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ConflictStrategyConfig
{
    @Bean
    public ConflictResolutionStrategy conflictResolutionStrategy(
            @Value( "${medicalfield.sync.conflict-strategy}" ) String strategyName )
    {
        return switch ( strategyName )
        {
            case "last-write-wins" -> new LastWriteWinsStrategy();
            case "server-wins" -> new ServerWinsStrategy();
            default -> throw new IllegalArgumentException( "Unknown conflict strategy: " + strategyName );
        };
    }
}
