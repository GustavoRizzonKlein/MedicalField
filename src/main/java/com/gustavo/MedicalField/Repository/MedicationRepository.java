package com.gustavo.MedicalField.Repository;

import com.gustavo.MedicalField.Entitys.Medication;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MedicationRepository
        extends JpaRepository<Medication, String>
{
}