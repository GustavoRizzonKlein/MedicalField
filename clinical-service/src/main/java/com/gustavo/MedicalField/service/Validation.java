package com.gustavo.MedicalField.service;

import com.gustavo.MedicalField.exception.BusinessRuleException;

import java.util.Set;
import java.util.UUID;

final class Validation
{
    private Validation()
    {
    }

    static String requireText( String value, String field )
    {
        if ( value == null || value.isBlank() )
        {
            throw new BusinessRuleException( field + " is required" );
        }
        return value.trim();
    }

    static String requireUuid( String value, String field )
    {
        requireText( value, field );
        try
        {
            return UUID.fromString( value.trim() ).toString();
        }
        catch ( IllegalArgumentException exception )
        {
            throw new BusinessRuleException( field + " must be a UUID" );
        }
    }

    static Object requireNonNull( Object value, String field )
    {
        if ( value == null )
        {
            throw new BusinessRuleException( field + " is required" );
        }
        return value;
    }

    static void requireRange( Integer value, int min, int max, String field )
    {
        if ( value == null || value < min || value > max )
        {
            throw new BusinessRuleException( field + " must be between " + min + " and " + max );
        }
    }

    static void optionalRange( Integer value, int min, int max, String field )
    {
        if ( value != null )
        {
            requireRange( value, min, max, field );
        }
    }

    static void requireOneOf( String value, Set<String> allowed, String field )
    {
        if ( value == null || !allowed.contains( value ) )
        {
            throw new BusinessRuleException( field + " must be one of " + allowed );
        }
    }

    static String blankToNull( String value )
    {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
