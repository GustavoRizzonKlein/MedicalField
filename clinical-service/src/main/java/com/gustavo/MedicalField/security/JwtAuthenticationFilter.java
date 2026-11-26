package com.gustavo.MedicalField.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Second link of the filter chain (after AccessLogFilter): every route of this service
 * requires a valid token. Login lives in the identity service, so the only public routes here
 * are the Swagger UI and its OpenAPI document.
 */
@Component
@Order( 2 )
public class JwtAuthenticationFilter extends OncePerRequestFilter
{
    private final JwtVerifier jwtVerifier;

    public JwtAuthenticationFilter( JwtVerifier jwtVerifier )
    {
        this.jwtVerifier = jwtVerifier;
    }

    @Override
    protected boolean shouldNotFilter( HttpServletRequest request )
    {
        String path = request.getRequestURI();
        return path.startsWith( "/swagger-ui" ) || path.startsWith( "/v3/api-docs" );
    }

    @Override
    protected void doFilterInternal( HttpServletRequest request, HttpServletResponse response, FilterChain chain )
            throws ServletException, IOException
    {
        String header = request.getHeader( "Authorization" );
        if ( header == null || !header.startsWith( "Bearer " ) )
        {
            reject( response, "Missing Bearer token" );
            return;
        }

        try
        {
            AuthenticatedProfessional professional = jwtVerifier.verify( header.substring( 7 ) );
            request.setAttribute( AuthenticatedProfessional.REQUEST_ATTRIBUTE, professional );
        }
        catch ( JwtVerifier.InvalidTokenException exception )
        {
            reject( response, exception.getMessage() );
            return;
        }

        chain.doFilter( request, response );
    }

    private void reject( HttpServletResponse response, String message ) throws IOException
    {
        response.setStatus( HttpServletResponse.SC_UNAUTHORIZED );
        response.setContentType( "application/json" );
        response.getWriter().write( "{\"error\":\"" + message.replace( "\"", "'" ) + "\"}" );
    }
}
