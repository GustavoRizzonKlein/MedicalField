package com.gustavo.MedicalField.dto;

import com.gustavo.MedicalField.entity.Person;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Used both as input (from the client) and output. createdBy and syncedAt are always set by the server.
 */
public record PersonDto(
        String id,
        String fullName,
        LocalDate birthDate,
        String sex,
        String documentNumber,
        String phone,
        String email,
        String createdBy,
        Instant createdAt,
        Instant updatedAt,
        Instant syncedAt )
{
    public static PersonDto from( Person person )
    {
        return new PersonDto(
                person.getId(),
                person.getFullName(),
                person.getBirthDate(),
                person.getSex(),
                person.getDocumentNumber(),
                person.getPhone(),
                person.getEmail(),
                person.getCreatedBy(),
                person.getCreatedAt(),
                person.getUpdatedAt(),
                person.getSyncedAt() );
    }
}
