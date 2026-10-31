package com.gustavo.MedicalField.Entitys;

public class Medication
{
    private int id;
    private String name;
    private String unit;
    private String maximumDose;

    public int getId()
    {
        return id;
    }

    public void setId( int id )
    {
        this.id = id;
    }

    public String getMaximumDose()
    {
        return maximumDose;
    }

    public void setMaximumDose( String maximumDose )
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
