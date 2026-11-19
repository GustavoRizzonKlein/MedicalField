package com.gustavo.MedicalField.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * Remembers every sync operation already applied, which makes resending a batch safe (idempotency).
 */
@Entity
@Table( name = "processed_operation" )
public class ProcessedOperation
{
    @Id
    private String operationId;

    private String entityType;
    private String entityId;
    private String outcome;
    private Instant processedAt;

    public String getOperationId()
    {
        return operationId;
    }

    public void setOperationId( String operationId )
    {
        this.operationId = operationId;
    }

    public String getEntityType()
    {
        return entityType;
    }

    public void setEntityType( String entityType )
    {
        this.entityType = entityType;
    }

    public String getEntityId()
    {
        return entityId;
    }

    public void setEntityId( String entityId )
    {
        this.entityId = entityId;
    }

    public String getOutcome()
    {
        return outcome;
    }

    public void setOutcome( String outcome )
    {
        this.outcome = outcome;
    }

    public Instant getProcessedAt()
    {
        return processedAt;
    }

    public void setProcessedAt( Instant processedAt )
    {
        this.processedAt = processedAt;
    }
}
