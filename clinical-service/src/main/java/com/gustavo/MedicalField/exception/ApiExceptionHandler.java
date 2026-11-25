package com.gustavo.MedicalField.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * Turns exceptions into JSON errors, so every service answers errors in the same format: {"error": "..."}.
 */
@RestControllerAdvice
public class ApiExceptionHandler
{
    @ExceptionHandler( NotFoundException.class )
    public ResponseEntity<Map<String, String>> handleNotFound( NotFoundException exception )
    {
        return error( HttpStatus.NOT_FOUND, exception.getMessage() );
    }

    @ExceptionHandler( ForbiddenException.class )
    public ResponseEntity<Map<String, String>> handleForbidden( ForbiddenException exception )
    {
        return error( HttpStatus.FORBIDDEN, exception.getMessage() );
    }

    @ExceptionHandler( BusinessRuleException.class )
    public ResponseEntity<Map<String, String>> handleBusinessRule( BusinessRuleException exception )
    {
        return error( HttpStatus.UNPROCESSABLE_CONTENT, exception.getMessage() );
    }

    @ExceptionHandler( HttpMessageNotReadableException.class )
    public ResponseEntity<Map<String, String>> handleUnreadable( HttpMessageNotReadableException exception )
    {
        return error( HttpStatus.BAD_REQUEST, "Invalid JSON body" );
    }

    private ResponseEntity<Map<String, String>> error( HttpStatus status, String message )
    {
        return ResponseEntity.status( status ).body( Map.of( "error", message ) );
    }
}
