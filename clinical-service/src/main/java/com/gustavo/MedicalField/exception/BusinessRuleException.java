package com.gustavo.MedicalField.exception;

/**
 * A request that is well formed but breaks a rule: a missing required field, a dose above
 * the maximum allowed, a Glasgow score out of range. Answered with HTTP 422.
 */
public class BusinessRuleException extends RuntimeException
{
    public BusinessRuleException( String message )
    {
        super( message );
    }
}
