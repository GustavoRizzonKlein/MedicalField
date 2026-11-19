package com.gustavo.MedicalField.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table( name = "encounter_medication" )
public class EncounterMedication
{
    @Id
    private String id;

    @ManyToOne
    @JoinColumn( name = "encounter_id" )
    private Encounter encounter;

    private String medicationId;
    private BigDecimal dose;
    private String route;
    private Instant administeredAt;

    public String getId()
    {
        return id;
    }

    public void setId( String id )
    {
        this.id = id;
    }

    public Encounter getEncounter()
    {
        return encounter;
    }

    public void setEncounter( Encounter encounter )
    {
        this.encounter = encounter;
    }

    public String getMedicationId()
    {
        return medicationId;
    }

    public void setMedicationId( String medicationId )
    {
        this.medicationId = medicationId;
    }

    public BigDecimal getDose()
    {
        return dose;
    }

    public void setDose( BigDecimal dose )
    {
        this.dose = dose;
    }

    public String getRoute()
    {
        return route;
    }

    public void setRoute( String route )
    {
        this.route = route;
    }

    public Instant getAdministeredAt()
    {
        return administeredAt;
    }

    public void setAdministeredAt( Instant administeredAt )
    {
        this.administeredAt = administeredAt;
    }
}
