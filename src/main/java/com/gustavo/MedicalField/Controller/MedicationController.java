package com.gustavo.MedicalField.Controller;

import com.gustavo.MedicalField.Entitys.Medication;
import com.gustavo.MedicalField.Service.MedicationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping( "/medications" )
public class MedicationController
{
    private final MedicationService medicationService;

    public MedicationController( MedicationService medicationService )
    {
        this.medicationService = medicationService;
    }

    @GetMapping
    public List<Medication> findAll()
    {
        return medicationService.findAll();
    }
}