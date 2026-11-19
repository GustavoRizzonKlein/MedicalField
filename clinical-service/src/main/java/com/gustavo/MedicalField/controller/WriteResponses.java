package com.gustavo.MedicalField.controller;

import com.gustavo.MedicalField.dto.SyncDtos.OperationResult;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * Maps a write outcome to the HTTP status of the regular POST routes.
 */
final class WriteResponses
{
    private WriteResponses()
    {
    }

    static ResponseEntity<OperationResult> toResponse( OperationResult result )
    {
        HttpStatus status = switch ( result.outcome() )
        {
            case CREATED -> HttpStatus.CREATED;
            case REJECTED -> HttpStatus.UNPROCESSABLE_CONTENT;
            case UPDATED, KEPT_SERVER_VERSION, DUPLICATE -> HttpStatus.OK;
        };
        return ResponseEntity.status( status ).body( result );
    }
}
