package com.gustavo.MedicalField.Service;

import com.gustavo.MedicalField.Entitys.Medication;
import com.gustavo.MedicalField.Repository.MedicationRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

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

    public Optional<Medication> findById( String id )
    {
        return medicationRepository.findById( id );
    }
}