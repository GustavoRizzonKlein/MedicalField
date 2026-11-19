package com.gustavo.MedicalField.logging;

import com.gustavo.MedicalField.security.AuthenticatedProfessional;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.sql.Timestamp;
import java.time.Instant;

/**
 * Access log required by the LGPD section of the spec: date/time, client IP, professional,
 * method, route, status code and processing time of every HTTP request.
 * Runs first, so it also records requests rejected by the authentication filter.
 */
@Component
@Order( 1 )
public class AccessLogFilter extends OncePerRequestFilter
{
    private static final Logger LOGGER = LoggerFactory.getLogger( AccessLogFilter.class );

    private final JdbcTemplate jdbcTemplate;

    public AccessLogFilter( JdbcTemplate jdbcTemplate )
    {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    protected void doFilterInternal( HttpServletRequest request, HttpServletResponse response, FilterChain chain )
            throws ServletException, IOException
    {
        Instant occurredAt = Instant.now();
        long startedAt = System.nanoTime();
        try
        {
            chain.doFilter( request, response );
        }
        finally
        {
            long durationMs = ( System.nanoTime() - startedAt ) / 1_000_000;
            AuthenticatedProfessional professional =
                    (AuthenticatedProfessional) request.getAttribute( AuthenticatedProfessional.REQUEST_ATTRIBUTE );
            String professionalId = professional == null ? null : professional.id();
            String clientIp = clientIp( request );

            LOGGER.info( "access ip={} professional={} {} {} status={} {}ms",
                    clientIp, professionalId, request.getMethod(), request.getRequestURI(), response.getStatus(), durationMs );
            try
            {
                jdbcTemplate.update(
                        "INSERT INTO access_log (occurred_at, client_ip, professional_id, method, route, status_code, duration_ms) "
                                + "VALUES (?, ?, ?, ?, ?, ?, ?)",
                        Timestamp.from( occurredAt ), clientIp, professionalId, request.getMethod(),
                        request.getRequestURI(), response.getStatus(), durationMs );
            }
            catch ( RuntimeException exception )
            {
                LOGGER.error( "Could not store access log entry", exception );
            }
        }
    }

    private String clientIp( HttpServletRequest request )
    {
        String forwardedFor = request.getHeader( "X-Forwarded-For" );
        if ( forwardedFor != null && !forwardedFor.isBlank() )
        {
            return forwardedFor.split( "," )[0].trim();
        }
        return request.getRemoteAddr();
    }
}
