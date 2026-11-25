package com.gustavo.MedicalField.repository;

import com.gustavo.MedicalField.entity.Medication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MedicationRepository
        extends JpaRepository<Medication, String>
{
    boolean existsByNameIgnoreCase( String name );

    boolean existsByNameIgnoreCaseAndIdNot( String name, String id );

    @Query( "select count(em) > 0 from EncounterMedication em where em.medicationId = :medicationId" )
    boolean isUsedInEncounters( @Param( "medicationId" ) String medicationId );
}
