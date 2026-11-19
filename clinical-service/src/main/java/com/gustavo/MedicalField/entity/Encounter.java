package com.gustavo.MedicalField.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table( name = "encounter" )
public class Encounter
{
    @Id
    private String id;

    private String medicalRecordId;
    private String professionalId;
    private String professionalName;
    private Instant occurredAt;
    private String location;
    private String chiefComplaint;

    // Vital signs
    private Integer systolicBp;
    private Integer diastolicBp;
    private Integer heartRate;
    private Integer respiratoryRate;
    private Integer oxygenSaturation;
    private BigDecimal temperature;
    private Integer bloodGlucose;

    // Glasgow Coma Scale: eye 1-4, verbal 1-5, motor 1-6 (total 3-15)
    private Integer glasgowEye;
    private Integer glasgowVerbal;
    private Integer glasgowMotor;

    private String manchesterPriority;
    private String startCategory;
    private String procedures;
    private String notes;
    private String destination;
    private Instant createdAt;
    private Instant syncedAt;

    @OneToMany( mappedBy = "encounter", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER )
    private List<EncounterMedication> medications = new ArrayList<>();

    public int getGlasgowTotal()
    {
        return glasgowEye + glasgowVerbal + glasgowMotor;
    }

    public void addMedication( EncounterMedication medication )
    {
        medication.setEncounter( this );
        medications.add( medication );
    }

    public String getId()
    {
        return id;
    }

    public void setId( String id )
    {
        this.id = id;
    }

    public String getMedicalRecordId()
    {
        return medicalRecordId;
    }

    public void setMedicalRecordId( String medicalRecordId )
    {
        this.medicalRecordId = medicalRecordId;
    }

    public String getProfessionalId()
    {
        return professionalId;
    }

    public void setProfessionalId( String professionalId )
    {
        this.professionalId = professionalId;
    }

    public String getProfessionalName()
    {
        return professionalName;
    }

    public void setProfessionalName( String professionalName )
    {
        this.professionalName = professionalName;
    }

    public Instant getOccurredAt()
    {
        return occurredAt;
    }

    public void setOccurredAt( Instant occurredAt )
    {
        this.occurredAt = occurredAt;
    }

    public String getLocation()
    {
        return location;
    }

    public void setLocation( String location )
    {
        this.location = location;
    }

    public String getChiefComplaint()
    {
        return chiefComplaint;
    }

    public void setChiefComplaint( String chiefComplaint )
    {
        this.chiefComplaint = chiefComplaint;
    }

    public Integer getSystolicBp()
    {
        return systolicBp;
    }

    public void setSystolicBp( Integer systolicBp )
    {
        this.systolicBp = systolicBp;
    }

    public Integer getDiastolicBp()
    {
        return diastolicBp;
    }

    public void setDiastolicBp( Integer diastolicBp )
    {
        this.diastolicBp = diastolicBp;
    }

    public Integer getHeartRate()
    {
        return heartRate;
    }

    public void setHeartRate( Integer heartRate )
    {
        this.heartRate = heartRate;
    }

    public Integer getRespiratoryRate()
    {
        return respiratoryRate;
    }

    public void setRespiratoryRate( Integer respiratoryRate )
    {
        this.respiratoryRate = respiratoryRate;
    }

    public Integer getOxygenSaturation()
    {
        return oxygenSaturation;
    }

    public void setOxygenSaturation( Integer oxygenSaturation )
    {
        this.oxygenSaturation = oxygenSaturation;
    }

    public BigDecimal getTemperature()
    {
        return temperature;
    }

    public void setTemperature( BigDecimal temperature )
    {
        this.temperature = temperature;
    }

    public Integer getBloodGlucose()
    {
        return bloodGlucose;
    }

    public void setBloodGlucose( Integer bloodGlucose )
    {
        this.bloodGlucose = bloodGlucose;
    }

    public Integer getGlasgowEye()
    {
        return glasgowEye;
    }

    public void setGlasgowEye( Integer glasgowEye )
    {
        this.glasgowEye = glasgowEye;
    }

    public Integer getGlasgowVerbal()
    {
        return glasgowVerbal;
    }

    public void setGlasgowVerbal( Integer glasgowVerbal )
    {
        this.glasgowVerbal = glasgowVerbal;
    }

    public Integer getGlasgowMotor()
    {
        return glasgowMotor;
    }

    public void setGlasgowMotor( Integer glasgowMotor )
    {
        this.glasgowMotor = glasgowMotor;
    }

    public String getManchesterPriority()
    {
        return manchesterPriority;
    }

    public void setManchesterPriority( String manchesterPriority )
    {
        this.manchesterPriority = manchesterPriority;
    }

    public String getStartCategory()
    {
        return startCategory;
    }

    public void setStartCategory( String startCategory )
    {
        this.startCategory = startCategory;
    }

    public String getProcedures()
    {
        return procedures;
    }

    public void setProcedures( String procedures )
    {
        this.procedures = procedures;
    }

    public String getNotes()
    {
        return notes;
    }

    public void setNotes( String notes )
    {
        this.notes = notes;
    }

    public String getDestination()
    {
        return destination;
    }

    public void setDestination( String destination )
    {
        this.destination = destination;
    }

    public Instant getCreatedAt()
    {
        return createdAt;
    }

    public void setCreatedAt( Instant createdAt )
    {
        this.createdAt = createdAt;
    }

    public Instant getSyncedAt()
    {
        return syncedAt;
    }

    public void setSyncedAt( Instant syncedAt )
    {
        this.syncedAt = syncedAt;
    }

    public List<EncounterMedication> getMedications()
    {
        return medications;
    }
}
