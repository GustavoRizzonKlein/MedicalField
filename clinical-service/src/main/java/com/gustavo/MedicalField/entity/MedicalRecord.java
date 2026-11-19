package com.gustavo.MedicalField.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table( name = "medical_record" )
public class MedicalRecord
{
    @Id
    private String id;

    private String personId;
    private String bloodType;
    private String allergies;
    private String chronicConditions;
    private String continuousMedications;
    private String notes;
    private String createdBy;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant syncedAt;

    public String getId()
    {
        return id;
    }

    public void setId( String id )
    {
        this.id = id;
    }

    public String getPersonId()
    {
        return personId;
    }

    public void setPersonId( String personId )
    {
        this.personId = personId;
    }

    public String getBloodType()
    {
        return bloodType;
    }

    public void setBloodType( String bloodType )
    {
        this.bloodType = bloodType;
    }

    public String getAllergies()
    {
        return allergies;
    }

    public void setAllergies( String allergies )
    {
        this.allergies = allergies;
    }

    public String getChronicConditions()
    {
        return chronicConditions;
    }

    public void setChronicConditions( String chronicConditions )
    {
        this.chronicConditions = chronicConditions;
    }

    public String getContinuousMedications()
    {
        return continuousMedications;
    }

    public void setContinuousMedications( String continuousMedications )
    {
        this.continuousMedications = continuousMedications;
    }

    public String getNotes()
    {
        return notes;
    }

    public void setNotes( String notes )
    {
        this.notes = notes;
    }

    public String getCreatedBy()
    {
        return createdBy;
    }

    public void setCreatedBy( String createdBy )
    {
        this.createdBy = createdBy;
    }

    public Instant getCreatedAt()
    {
        return createdAt;
    }

    public void setCreatedAt( Instant createdAt )
    {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt()
    {
        return updatedAt;
    }

    public void setUpdatedAt( Instant updatedAt )
    {
        this.updatedAt = updatedAt;
    }

    public Instant getSyncedAt()
    {
        return syncedAt;
    }

    public void setSyncedAt( Instant syncedAt )
    {
        this.syncedAt = syncedAt;
    }
}
