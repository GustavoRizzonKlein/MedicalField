package com.gustavo.MedicalField.Service;

import com.gustavo.MedicalField.Entitys.Medication;
import com.gustavo.MedicalField.Repository.MedicationRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class MedicationService
{
    private final MedicationRepository medicationRepository;

    public MedicationService( MedicationRepository medicationRepository )
    {
        this.medicationRepository = medicationRepository;
    }

    public List<Medication> findAll()
    {
        return medicationRepository.findAll();
    }
}