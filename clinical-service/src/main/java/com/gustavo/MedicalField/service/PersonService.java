package com.gustavo.MedicalField.service;

import com.gustavo.MedicalField.dto.PersonDto;
import com.gustavo.MedicalField.dto.SyncDtos.Outcome;
import com.gustavo.MedicalField.entity.Person;
import com.gustavo.MedicalField.exception.NotFoundException;
import com.gustavo.MedicalField.repository.PersonRepository;
import com.gustavo.MedicalField.security.AuthenticatedProfessional;
import com.gustavo.MedicalField.sync.strategy.ConflictResolutionStrategy;
import com.gustavo.MedicalField.sync.strategy.ConflictResolutionStrategy.ConflictDecision;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class PersonService
{
    private final PersonRepository personRepository;
    private final ConflictResolutionStrategy conflictStrategy;

    public PersonService( PersonRepository personRepository, ConflictResolutionStrategy conflictStrategy )
    {
        this.personRepository = personRepository;
        this.conflictStrategy = conflictStrategy;
    }

    public List<PersonDto> findAll()
    {
        return personRepository.findAll( Sort.by( "fullName" ) ).stream().map( PersonDto::from ).toList();
    }

    public PersonDto findById( String id )
    {
        return personRepository.findById( id )
                .map( PersonDto::from )
                .orElseThrow( () -> new NotFoundException( "Person " + id + " not found" ) );
    }

    /**
     * Creates the person, or updates it when the conflict strategy accepts the incoming version.
     */
    public WriteResult upsert( PersonDto input, AuthenticatedProfessional professional )
    {
        String id = Validation.requireUuid( input.id(), "person.id" );
        String fullName = Validation.requireText( input.fullName(), "person.fullName" );
        Instant now = Instant.now();
        Instant updatedAt = input.updatedAt() != null ? input.updatedAt() : now;

        Optional<Person> existing = personRepository.findById( id );
        if ( existing.isPresent() )
        {
            Person person = existing.get();
            if ( conflictStrategy.resolve( person.getUpdatedAt(), updatedAt ) == ConflictDecision.KEEP_SERVER )
            {
                return new WriteResult( id, Outcome.KEPT_SERVER_VERSION,
                        "Server version kept (" + conflictStrategy.name() + ")" );
            }
            copyFields( input, fullName, person );
            person.setUpdatedAt( updatedAt );
            person.setSyncedAt( now );
            personRepository.save( person );
            return new WriteResult( id, Outcome.UPDATED, null );
        }

        Person person = new Person();
        person.setId( id );
        copyFields( input, fullName, person );
        person.setCreatedBy( professional.id() );
        person.setCreatedAt( input.createdAt() != null ? input.createdAt() : updatedAt );
        person.setUpdatedAt( updatedAt );
        person.setSyncedAt( now );
        personRepository.save( person );
        return new WriteResult( id, Outcome.CREATED, null );
    }

    private void copyFields( PersonDto input, String fullName, Person person )
    {
        person.setFullName( fullName );
        person.setBirthDate( input.birthDate() );
        person.setSex( Validation.blankToNull( input.sex() ) );
        person.setDocumentNumber( Validation.blankToNull( input.documentNumber() ) );
        person.setPhone( Validation.blankToNull( input.phone() ) );
        person.setEmail( Validation.blankToNull( input.email() ) );
    }
}
