package com.gustavo.MedicalField.Entitys;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table( name = "medication" )
public class Medication
{
    @Id
    private String id;

    private String name;
    private String unit;
    private BigDecimal  maximumDose;

    public String getId()
    {
        return id;
    }

    public void setId( String id )
    {
        this.id = id;
    }

    public BigDecimal getMaximumDose()
    {
        return maximumDose;
    }

    public void setMaximumDose( BigDecimal  maximumDose )
    {
        this.maximumDose = maximumDose;
    }

    public String getName()
    {
        return name;
    }

    public void setName( String name )
    {
        this.name = name;
    }

    public String getUnit()
    {
        return unit;
    }

    public void setUnit( String unit )
    {
        this.unit = unit;
    }
}
