package com.gustavo.MedicalField.Controller;

import com.gustavo.MedicalField.Entitys.Medication;
import com.gustavo.MedicalField.Service.MedicationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.Optional;

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
        return (ResponseEntity<Medication>) medicationService.findById( id )
                .map( medication -> ResponseEntity.ok( medication ) )
                .orElse( ResponseEntity.notFound().build() );
    }
}