package com.gustavo.MedicalField.service;

import com.gustavo.MedicalField.entity.Medication;
import com.gustavo.MedicalField.repository.MedicationRepository;
import org.springframework.data.domain.Sort;
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
        return medicationRepository.findAll( Sort.by( "name" ) );
    }

    public Optional<Medication> findById( String id )
    {
        return medicationRepository.findById( id );
    }
}
