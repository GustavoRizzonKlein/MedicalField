package com.gustavo.MedicalField.repository;

import com.gustavo.MedicalField.entity.ProcessedOperation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessedOperationRepository
        extends JpaRepository<ProcessedOperation, String>
{
}
