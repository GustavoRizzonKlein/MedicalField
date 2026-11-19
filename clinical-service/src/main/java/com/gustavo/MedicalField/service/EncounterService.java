package com.gustavo.MedicalField.service;

import com.gustavo.MedicalField.dto.EncounterDto;
import com.gustavo.MedicalField.dto.EncounterMedicationDto;
import com.gustavo.MedicalField.dto.SyncDtos.Outcome;
import com.gustavo.MedicalField.entity.Encounter;
import com.gustavo.MedicalField.entity.EncounterMedication;
import com.gustavo.MedicalField.entity.MedicalRecord;
import com.gustavo.MedicalField.entity.Medication;
import com.gustavo.MedicalField.entity.Person;
import com.gustavo.MedicalField.exception.BusinessRuleException;
import com.gustavo.MedicalField.exception.NotFoundException;
import com.gustavo.MedicalField.repository.EncounterRepository;
import com.gustavo.MedicalField.repository.MedicalRecordRepository;
import com.gustavo.MedicalField.repository.MedicationRepository;
import com.gustavo.MedicalField.repository.PersonRepository;
import com.gustavo.MedicalField.security.AuthenticatedProfessional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class EncounterService
{
    static final Set<String> MANCHESTER_PRIORITIES = Set.of( "RED", "ORANGE", "YELLOW", "GREEN", "BLUE" );
    static final Set<String> START_CATEGORIES = Set.of( "RED", "YELLOW", "GREEN", "BLACK" );

    private final EncounterRepository encounterRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final PersonRepository personRepository;
    private final MedicationRepository medicationRepository;

    public EncounterService(
            EncounterRepository encounterRepository,
            MedicalRecordRepository medicalRecordRepository,
            PersonRepository personRepository,
            MedicationRepository medicationRepository )
    {
        this.encounterRepository = encounterRepository;
        this.medicalRecordRepository = medicalRecordRepository;
        this.personRepository = personRepository;
        this.medicationRepository = medicationRepository;
    }

    public List<EncounterDto> findAll()
    {
        return toDtos( encounterRepository.findAllByOrderByOccurredAtDesc() );
    }

    public EncounterDto findById( String id )
    {
        Encounter encounter = encounterRepository.findById( id )
                .orElseThrow( () -> new NotFoundException( "Encounter " + id + " not found" ) );
        return toDtos( List.of( encounter ) ).getFirst();
    }

    /** All encounters of a person (GET /atendimento/{id} in the spec). */
    public List<EncounterDto> findByPersonId( String personId )
    {
        if ( !personRepository.existsById( personId ) )
        {
            throw new NotFoundException( "Person " + personId + " not found" );
        }
        return medicalRecordRepository.findByPersonId( personId )
                .map( record -> toDtos( encounterRepository.findByMedicalRecordIdOrderByOccurredAtDesc( record.getId() ) ) )
                .orElse( List.of() );
    }

    /**
     * Encounters are append-only: an encounter that already exists is reported as a duplicate,
     * never overwritten. The professional always comes from the token, not from the body.
     */
    public WriteResult create( EncounterDto input, AuthenticatedProfessional professional )
    {
        String id = Validation.requireUuid( input.id(), "encounter.id" );
        if ( encounterRepository.existsById( id ) )
        {
            return new WriteResult( id, Outcome.DUPLICATE, "Encounter already registered" );
        }

        String medicalRecordId = Validation.requireUuid( input.medicalRecordId(), "encounter.medicalRecordId" );
        if ( !medicalRecordRepository.existsById( medicalRecordId ) )
        {
            throw new BusinessRuleException( "Medical record " + medicalRecordId + " does not exist; sync it first" );
        }
        validateClinicalData( input );

        Instant now = Instant.now();
        Encounter encounter = new Encounter();
        encounter.setId( id );
        encounter.setMedicalRecordId( medicalRecordId );
        encounter.setProfessionalId( professional.id() );
        encounter.setProfessionalName( professional.name() );
        encounter.setOccurredAt( input.occurredAt() );
        encounter.setLocation( Validation.blankToNull( input.location() ) );
        encounter.setChiefComplaint( input.chiefComplaint().trim() );
        encounter.setSystolicBp( input.systolicBp() );
        encounter.setDiastolicBp( input.diastolicBp() );
        encounter.setHeartRate( input.heartRate() );
        encounter.setRespiratoryRate( input.respiratoryRate() );
        encounter.setOxygenSaturation( input.oxygenSaturation() );
        encounter.setTemperature( input.temperature() );
        encounter.setBloodGlucose( input.bloodGlucose() );
        encounter.setGlasgowEye( input.glasgowEye() );
        encounter.setGlasgowVerbal( input.glasgowVerbal() );
        encounter.setGlasgowMotor( input.glasgowMotor() );
        encounter.setManchesterPriority( input.manchesterPriority() );
        encounter.setStartCategory( Validation.blankToNull( input.startCategory() ) );
        encounter.setProcedures( Validation.blankToNull( input.procedures() ) );
        encounter.setNotes( Validation.blankToNull( input.notes() ) );
        encounter.setDestination( Validation.blankToNull( input.destination() ) );
        encounter.setCreatedAt( input.createdAt() != null ? input.createdAt() : input.occurredAt() );
        encounter.setSyncedAt( now );

        for ( EncounterMedicationDto item : medicationsOf( input ) )
        {
            EncounterMedication medication = new EncounterMedication();
            medication.setId( item.id() != null ? Validation.requireUuid( item.id(), "medication.id" ) : UUID.randomUUID().toString() );
            medication.setMedicationId( item.medicationId() );
            medication.setDose( item.dose() );
            medication.setRoute( Validation.blankToNull( item.route() ) );
            medication.setAdministeredAt( item.administeredAt() != null ? item.administeredAt() : input.occurredAt() );
            encounter.addMedication( medication );
        }

        encounterRepository.save( encounter );
        return new WriteResult( id, Outcome.CREATED, null );
    }

    /**
     * Clinical safety rules. The client applies the same rules offline; the server checks
     * again because it cannot trust that every caller did.
     */
    private void validateClinicalData( EncounterDto input )
    {
        Validation.requireNonNull( input.occurredAt(), "encounter.occurredAt" );
        Validation.requireText( input.chiefComplaint(), "encounter.chiefComplaint" );
        Validation.requireRange( input.glasgowEye(), 1, 4, "encounter.glasgowEye" );
        Validation.requireRange( input.glasgowVerbal(), 1, 5, "encounter.glasgowVerbal" );
        Validation.requireRange( input.glasgowMotor(), 1, 6, "encounter.glasgowMotor" );
        Validation.requireOneOf( input.manchesterPriority(), MANCHESTER_PRIORITIES, "encounter.manchesterPriority" );
        if ( Validation.blankToNull( input.startCategory() ) != null )
        {
            Validation.requireOneOf( input.startCategory(), START_CATEGORIES, "encounter.startCategory" );
        }
        Validation.optionalRange( input.oxygenSaturation(), 0, 100, "encounter.oxygenSaturation" );
        Validation.optionalRange( input.heartRate(), 0, 300, "encounter.heartRate" );
        Validation.optionalRange( input.respiratoryRate(), 0, 100, "encounter.respiratoryRate" );
        Validation.optionalRange( input.systolicBp(), 0, 300, "encounter.systolicBp" );
        Validation.optionalRange( input.diastolicBp(), 0, 200, "encounter.diastolicBp" );

        for ( EncounterMedicationDto item : medicationsOf( input ) )
        {
            Validation.requireUuid( item.medicationId(), "medication.medicationId" );
            Medication medication = medicationRepository.findById( item.medicationId() )
                    .orElseThrow( () -> new BusinessRuleException( "Medication " + item.medicationId() + " does not exist" ) );
            if ( item.dose() == null || item.dose().compareTo( BigDecimal.ZERO ) <= 0 )
            {
                throw new BusinessRuleException( "Dose of " + medication.getName() + " must be greater than zero" );
            }
            if ( item.dose().compareTo( medication.getMaximumDose() ) > 0 )
            {
                throw new BusinessRuleException( "Dose of " + medication.getName() + " (" + item.dose() + " "
                        + medication.getUnit() + ") exceeds the maximum of " + medication.getMaximumDose() + " "
                        + medication.getUnit() );
            }
        }
    }

    private List<EncounterMedicationDto> medicationsOf( EncounterDto input )
    {
        return input.medications() == null ? List.of() : input.medications();
    }

    private List<EncounterDto> toDtos( List<Encounter> encounters )
    {
        Map<String, MedicalRecord> records = medicalRecordRepository.findAll().stream()
                .collect( Collectors.toMap( MedicalRecord::getId, Function.identity() ) );
        Map<String, Person> persons = personRepository.findAll().stream()
                .collect( Collectors.toMap( Person::getId, Function.identity() ) );
        Map<String, Medication> medications = medicationRepository.findAll().stream()
                .collect( Collectors.toMap( Medication::getId, Function.identity() ) );

        return encounters.stream().map( encounter ->
        {
            MedicalRecord record = records.get( encounter.getMedicalRecordId() );
            Person person = record == null ? null : persons.get( record.getPersonId() );
            List<EncounterMedicationDto> items = encounter.getMedications().stream().map( item ->
            {
                Medication medication = medications.get( item.getMedicationId() );
                return new EncounterMedicationDto(
                        item.getId(),
                        item.getMedicationId(),
                        medication == null ? null : medication.getName(),
                        item.getDose(),
                        medication == null ? null : medication.getUnit(),
                        item.getRoute(),
                        item.getAdministeredAt() );
            } ).toList();

            return new EncounterDto(
                    encounter.getId(),
                    encounter.getMedicalRecordId(),
                    person == null ? null : person.getId(),
                    person == null ? null : person.getFullName(),
                    encounter.getProfessionalId(),
                    encounter.getProfessionalName(),
                    encounter.getOccurredAt(),
                    encounter.getLocation(),
                    encounter.getChiefComplaint(),
                    encounter.getSystolicBp(),
                    encounter.getDiastolicBp(),
                    encounter.getHeartRate(),
                    encounter.getRespiratoryRate(),
                    encounter.getOxygenSaturation(),
                    encounter.getTemperature(),
                    encounter.getBloodGlucose(),
                    encounter.getGlasgowEye(),
                    encounter.getGlasgowVerbal(),
                    encounter.getGlasgowMotor(),
                    encounter.getGlasgowTotal(),
                    encounter.getManchesterPriority(),
                    encounter.getStartCategory(),
                    encounter.getProcedures(),
                    encounter.getNotes(),
                    encounter.getDestination(),
                    encounter.getCreatedAt(),
                    encounter.getSyncedAt(),
                    items );
        } ).toList();
    }
}
