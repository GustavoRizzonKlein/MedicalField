package com.gustavo.MedicalField.repository;

import com.gustavo.MedicalField.entity.MedicalRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MedicalRecordRepository
        extends JpaRepository<MedicalRecord, String>
{
    Optional<MedicalRecord> findByPersonId( String personId );
}
