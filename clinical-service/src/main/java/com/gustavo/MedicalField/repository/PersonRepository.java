package com.gustavo.MedicalField.repository;

import com.gustavo.MedicalField.entity.Person;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PersonRepository
        extends JpaRepository<Person, String>
{
}
