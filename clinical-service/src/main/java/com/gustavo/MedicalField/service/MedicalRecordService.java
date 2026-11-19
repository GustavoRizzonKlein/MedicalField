package com.gustavo.MedicalField.service;

import com.gustavo.MedicalField.dto.MedicalRecordDto;
import com.gustavo.MedicalField.dto.SyncDtos.Outcome;
import com.gustavo.MedicalField.entity.MedicalRecord;
import com.gustavo.MedicalField.entity.Person;
import com.gustavo.MedicalField.exception.BusinessRuleException;
import com.gustavo.MedicalField.exception.NotFoundException;
import com.gustavo.MedicalField.repository.MedicalRecordRepository;
import com.gustavo.MedicalField.repository.PersonRepository;
import com.gustavo.MedicalField.security.AuthenticatedProfessional;
import com.gustavo.MedicalField.sync.strategy.ConflictResolutionStrategy;
import com.gustavo.MedicalField.sync.strategy.ConflictResolutionStrategy.ConflictDecision;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class MedicalRecordService
{
    private final MedicalRecordRepository medicalRecordRepository;
    private final PersonRepository personRepository;
    private final ConflictResolutionStrategy conflictStrategy;

    public MedicalRecordService(
            MedicalRecordRepository medicalRecordRepository,
            PersonRepository personRepository,
            ConflictResolutionStrategy conflictStrategy )
    {
        this.medicalRecordRepository = medicalRecordRepository;
        this.personRepository = personRepository;
        this.conflictStrategy = conflictStrategy;
    }

    public List<MedicalRecordDto> findAll()
    {
        Map<String, String> personNames = personRepository.findAll().stream()
                .collect( Collectors.toMap( Person::getId, Person::getFullName ) );
        return medicalRecordRepository.findAll().stream()
                .map( record -> MedicalRecordDto.from( record, personNames.get( record.getPersonId() ) ) )
                .sorted( Comparator.comparing( MedicalRecordDto::personName, Comparator.nullsLast( String::compareToIgnoreCase ) ) )
                .toList();
    }

    public MedicalRecordDto findById( String id )
    {
        MedicalRecord record = medicalRecordRepository.findById( id )
                .orElseThrow( () -> new NotFoundException( "Medical record " + id + " not found" ) );
        return toDto( record );
    }

    public MedicalRecordDto findByPersonId( String personId )
    {
        MedicalRecord record = medicalRecordRepository.findByPersonId( personId )
                .orElseThrow( () -> new NotFoundException( "Person " + personId + " has no medical record" ) );
        return toDto( record );
    }

    public WriteResult upsert( MedicalRecordDto input, AuthenticatedProfessional professional )
    {
        String id = Validation.requireUuid( input.id(), "medicalRecord.id" );
        String personId = Validation.requireUuid( input.personId(), "medicalRecord.personId" );
        if ( !personRepository.existsById( personId ) )
        {
            throw new BusinessRuleException( "Person " + personId + " does not exist; sync the person first" );
        }

        Optional<MedicalRecord> recordOfPerson = medicalRecordRepository.findByPersonId( personId );
        if ( recordOfPerson.isPresent() && !recordOfPerson.get().getId().equals( id ) )
        {
            throw new BusinessRuleException( "Person " + personId + " already has medical record " + recordOfPerson.get().getId() );
        }

        Instant now = Instant.now();
        Instant updatedAt = input.updatedAt() != null ? input.updatedAt() : now;

        Optional<MedicalRecord> existing = medicalRecordRepository.findById( id );
        if ( existing.isPresent() )
        {
            MedicalRecord record = existing.get();
            if ( conflictStrategy.resolve( record.getUpdatedAt(), updatedAt ) == ConflictDecision.KEEP_SERVER )
            {
                return new WriteResult( id, Outcome.KEPT_SERVER_VERSION,
                        "Server version kept (" + conflictStrategy.name() + ")" );
            }
            copyFields( input, record );
            record.setUpdatedAt( updatedAt );
            record.setSyncedAt( now );
            medicalRecordRepository.save( record );
            return new WriteResult( id, Outcome.UPDATED, null );
        }

        MedicalRecord record = new MedicalRecord();
        record.setId( id );
        record.setPersonId( personId );
        copyFields( input, record );
        record.setCreatedBy( professional.id() );
        record.setCreatedAt( input.createdAt() != null ? input.createdAt() : updatedAt );
        record.setUpdatedAt( updatedAt );
        record.setSyncedAt( now );
        medicalRecordRepository.save( record );
        return new WriteResult( id, Outcome.CREATED, null );
    }

    private MedicalRecordDto toDto( MedicalRecord record )
    {
        String personName = personRepository.findById( record.getPersonId() ).map( Person::getFullName ).orElse( null );
        return MedicalRecordDto.from( record, personName );
    }

    private void copyFields( MedicalRecordDto input, MedicalRecord record )
    {
        record.setBloodType( Validation.blankToNull( input.bloodType() ) );
        record.setAllergies( Validation.blankToNull( input.allergies() ) );
        record.setChronicConditions( Validation.blankToNull( input.chronicConditions() ) );
        record.setContinuousMedications( Validation.blankToNull( input.continuousMedications() ) );
        record.setNotes( Validation.blankToNull( input.notes() ) );
    }
}
