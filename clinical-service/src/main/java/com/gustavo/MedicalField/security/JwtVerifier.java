package com.gustavo.MedicalField.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;

/**
 * Verifies RS256 tokens issued by the identity service using only its public key.
 * Written with the JDK's own crypto so the whole check is visible in one place.
 */
@Component
public class JwtVerifier
{
    private final Path publicKeyPath;
    private final String expectedIssuer;
    private final ObjectMapper objectMapper;
    private volatile PublicKey publicKey;

    public JwtVerifier(
            @Value( "${medicalfield.jwt.public-key-path}" ) String publicKeyPath,
            @Value( "${medicalfield.jwt.issuer}" ) String expectedIssuer,
            ObjectMapper objectMapper )
    {
        this.publicKeyPath = Path.of( publicKeyPath );
        this.expectedIssuer = expectedIssuer;
        this.objectMapper = objectMapper;
    }

    public AuthenticatedProfessional verify( String token )
    {
        String[] parts = token.split( "\\." );
        if ( parts.length != 3 )
        {
            throw new InvalidTokenException( "Malformed token" );
        }

        JsonNode header = decodeJson( parts[0] );
        if ( !"RS256".equals( header.path( "alg" ).asString() ) )
        {
            throw new InvalidTokenException( "Unsupported algorithm" );
        }

        if ( !signatureMatches( parts[0] + "." + parts[1], parts[2] ) )
        {
            throw new InvalidTokenException( "Invalid signature" );
        }

        JsonNode claims = decodeJson( parts[1] );
        if ( claims.path( "exp" ).asLong( 0 ) < Instant.now().getEpochSecond() )
        {
            throw new InvalidTokenException( "Token expired" );
        }
        if ( !expectedIssuer.equals( claims.path( "iss" ).asString() ) )
        {
            throw new InvalidTokenException( "Unexpected issuer" );
        }

        return new AuthenticatedProfessional(
                claims.path( "sub" ).asString(),
                claims.path( "name" ).asString(),
                claims.path( "registryType" ).asString(),
                claims.path( "registryNumber" ).asString(),
                claims.path( "role" ).asString() );
    }

    private boolean signatureMatches( String signedContent, String encodedSignature )
    {
        try
        {
            Signature signature = Signature.getInstance( "SHA256withRSA" );
            signature.initVerify( publicKey() );
            signature.update( signedContent.getBytes( StandardCharsets.US_ASCII ) );
            return signature.verify( Base64.getUrlDecoder().decode( encodedSignature ) );
        }
        catch ( GeneralSecurityException | IllegalArgumentException exception )
        {
            return false;
        }
    }

    private JsonNode decodeJson( String part )
    {
        try
        {
            return objectMapper.readTree( Base64.getUrlDecoder().decode( part ) );
        }
        catch ( RuntimeException exception )
        {
            throw new InvalidTokenException( "Malformed token" );
        }
    }

    /** Loaded on first use, so this service can start before the identity service creates the key. */
    private PublicKey publicKey() throws GeneralSecurityException
    {
        if ( publicKey == null )
        {
            try
            {
                String pem = Files.readString( publicKeyPath )
                        .replace( "-----BEGIN PUBLIC KEY-----", "" )
                        .replace( "-----END PUBLIC KEY-----", "" )
                        .replaceAll( "\\s", "" );
                byte[] der = Base64.getDecoder().decode( pem );
                publicKey = KeyFactory.getInstance( "RSA" ).generatePublic( new X509EncodedKeySpec( der ) );
            }
            catch ( java.io.IOException exception )
            {
                throw new InvalidTokenException( "Public key not found at " + publicKeyPath.toAbsolutePath() );
            }
        }
        return publicKey;
    }

    public static class InvalidTokenException extends RuntimeException
    {
        public InvalidTokenException( String message )
        {
            super( message );
        }
    }
}
