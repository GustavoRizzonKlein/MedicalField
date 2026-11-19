package com.gustavo.MedicalField.repository;

import com.gustavo.MedicalField.entity.Encounter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EncounterRepository
        extends JpaRepository<Encounter, String>
{
    List<Encounter> findByMedicalRecordIdOrderByOccurredAtDesc( String medicalRecordId );

    List<Encounter> findAllByOrderByOccurredAtDesc();
}
