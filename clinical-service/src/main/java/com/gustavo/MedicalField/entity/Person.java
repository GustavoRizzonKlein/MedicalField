package com.gustavo.MedicalField.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table( name = "person" )
public class Person
{
    @Id
    private String id;

    private String fullName;
    private LocalDate birthDate;
    private String sex;
    private String documentNumber;
    private String phone;
    private String email;
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

    public String getFullName()
    {
        return fullName;
    }

    public void setFullName( String fullName )
    {
        this.fullName = fullName;
    }

    public LocalDate getBirthDate()
    {
        return birthDate;
    }

    public void setBirthDate( LocalDate birthDate )
    {
        this.birthDate = birthDate;
    }

    public String getSex()
    {
        return sex;
    }

    public void setSex( String sex )
    {
        this.sex = sex;
    }

    public String getDocumentNumber()
    {
        return documentNumber;
    }

    public void setDocumentNumber( String documentNumber )
    {
        this.documentNumber = documentNumber;
    }

    public String getPhone()
    {
        return phone;
    }

    public void setPhone( String phone )
    {
        this.phone = phone;
    }

    public String getEmail()
    {
        return email;
    }

    public void setEmail( String email )
    {
        this.email = email;
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
