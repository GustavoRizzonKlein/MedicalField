package com.gustavo.MedicalField.controller;

import com.gustavo.MedicalField.entity.Medication;
import com.gustavo.MedicalField.service.MedicationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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
}
