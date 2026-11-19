package com.gustavo.MedicalField.repository;

import com.gustavo.MedicalField.entity.Medication;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MedicationRepository
        extends JpaRepository<Medication, String>
{
}
