package com.gustavo.MedicalField.service;

import com.gustavo.MedicalField.dto.MedicationDto;
import com.gustavo.MedicalField.entity.Medication;
import com.gustavo.MedicalField.exception.BusinessRuleException;
import com.gustavo.MedicalField.exception.NotFoundException;
import com.gustavo.MedicalField.repository.MedicationRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class MedicationService
{
    /**
     * What DELETE did: removed the row, or only deactivated it because encounters use it.
     */
    public enum DeleteOutcome
    {
        DELETED, DEACTIVATED
    }

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

    @Transactional
    public Medication create( MedicationDto input )
    {
        Medication medication = new Medication();
        medication.setId( UUID.randomUUID().toString() );
        apply( medication, input );
        if ( medicationRepository.existsByNameIgnoreCase( medication.getName() ) )
        {
            throw new BusinessRuleException( "A medication named " + medication.getName() + " already exists" );
        }
        return medicationRepository.save( medication );
    }

    @Transactional
    public Medication update( String id, MedicationDto input )
    {
        Medication medication = medicationRepository.findById( id )
                .orElseThrow( () -> new NotFoundException( "Medication not found: " + id ) );
        apply( medication, input );
        if ( medicationRepository.existsByNameIgnoreCaseAndIdNot( medication.getName(), id ) )
        {
            throw new BusinessRuleException( "A medication named " + medication.getName() + " already exists" );
        }
        return medicationRepository.save( medication );
    }

    /**
     * Removes the medication. When an encounter already references it, the row is kept and only deactivated,
     * so the encounter history and its care report still show the medication name (soft delete).
     */
    @Transactional
    public DeleteOutcome delete( String id )
    {
        Medication medication = medicationRepository.findById( id )
                .orElseThrow( () -> new NotFoundException( "Medication not found: " + id ) );
        if ( medicationRepository.isUsedInEncounters( id ) )
        {
            medication.setActive( false );
            medicationRepository.save( medication );
            return DeleteOutcome.DEACTIVATED;
        }
        medicationRepository.delete( medication );
        return DeleteOutcome.DELETED;
    }

    private void apply( Medication medication, MedicationDto input )
    {
        if ( input == null )
        {
            throw new BusinessRuleException( "Body is required" );
        }
        medication.setName( Validation.requireText( input.name(), "name" ) );
        medication.setUnit( Validation.requireText( input.unit(), "unit" ) );
        Validation.requireNonNull( input.maximumDose(), "maximumDose" );
        if ( input.maximumDose().compareTo( BigDecimal.ZERO ) <= 0 )
        {
            throw new BusinessRuleException( "maximumDose must be greater than zero" );
        }
        medication.setMaximumDose( input.maximumDose() );
        medication.setActive( input.active() == null || input.active() );
    }
}
