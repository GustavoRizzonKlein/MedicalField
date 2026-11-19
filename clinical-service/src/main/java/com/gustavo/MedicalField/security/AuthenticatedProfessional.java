package com.gustavo.MedicalField.security;

/**
 * The professional identified by the JWT. Stored as a request attribute by JwtAuthenticationFilter.
 */
public record AuthenticatedProfessional(
        String id,
        String name,
        String registryType,
        String registryNumber,
        String role )
{
    public static final String REQUEST_ATTRIBUTE = "professional";

    public boolean isAdmin()
    {
        return "ADMIN".equals( role );
    }
}
