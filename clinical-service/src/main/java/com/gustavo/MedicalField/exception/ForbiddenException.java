package com.gustavo.MedicalField.exception;

public class ForbiddenException extends RuntimeException
{
    public ForbiddenException( String message )
    {
        super( message );
    }
}
