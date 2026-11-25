package com.gustavo.MedicalField.controller;

import com.gustavo.MedicalField.dto.MedicationDto;
import com.gustavo.MedicalField.entity.Medication;
import com.gustavo.MedicalField.exception.ForbiddenException;
import com.gustavo.MedicalField.security.AuthenticatedProfessional;
import com.gustavo.MedicalField.service.MedicationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Medication registry. Everyone authenticated can read it; only administrators (Portal) can change it.
 */
@RestController
@RequestMapping( "/medications" )
public class MedicationController
{
    private final MedicationService medicationService;

    public MedicationController( MedicationService medicationService )
    {
        this.medicationService = medicationService;
    }

    @GetMapping
    public List<Medication> findAll()
    {
        return medicationService.findAll();
    }

    @GetMapping( "/{id}" )
    public ResponseEntity<Medication> findById( @PathVariable String id )
    {
        return medicationService.findById( id )
                .map( medication -> ResponseEntity.ok( medication ) )
                .orElse( ResponseEntity.notFound().build() );
    }

    @PostMapping
    public ResponseEntity<Medication> create(
            @RequestBody MedicationDto input,
            @RequestAttribute( AuthenticatedProfessional.REQUEST_ATTRIBUTE ) AuthenticatedProfessional professional )
    {
        requireAdmin( professional );
        return ResponseEntity.status( HttpStatus.CREATED ).body( medicationService.create( input ) );
    }

    @PutMapping( "/{id}" )
    public Medication update(
            @PathVariable String id,
            @RequestBody MedicationDto input,
            @RequestAttribute( AuthenticatedProfessional.REQUEST_ATTRIBUTE ) AuthenticatedProfessional professional )
    {
        requireAdmin( professional );
        return medicationService.update( id, input );
    }

    @DeleteMapping( "/{id}" )
    public Map<String, String> delete(
            @PathVariable String id,
            @RequestAttribute( AuthenticatedProfessional.REQUEST_ATTRIBUTE ) AuthenticatedProfessional professional )
    {
        requireAdmin( professional );
        return Map.of( "outcome", medicationService.delete( id ).name() );
    }

    private static void requireAdmin( AuthenticatedProfessional professional )
    {
        if ( !professional.isAdmin() )
        {
            throw new ForbiddenException( "Administrator role required" );
        }
    }
}
