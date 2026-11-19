package com.gustavo.MedicalField.controller;

import com.gustavo.MedicalField.security.AuthenticatedProfessional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class AccessLogController
{
    private final JdbcTemplate jdbcTemplate;

    public AccessLogController( JdbcTemplate jdbcTemplate )
    {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping( "/access-logs" )
    public ResponseEntity<?> findRecent(
            @RequestParam( defaultValue = "100" ) int limit,
            @RequestAttribute( AuthenticatedProfessional.REQUEST_ATTRIBUTE ) AuthenticatedProfessional professional )
    {
        if ( !professional.isAdmin() )
        {
            return ResponseEntity.status( HttpStatus.FORBIDDEN ).body( Map.of( "error", "Administrator role required" ) );
        }
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT occurred_at AS occurredAt, client_ip AS clientIp, professional_id AS professionalId, method, route, "
                        + "status_code AS statusCode, duration_ms AS durationMs FROM access_log ORDER BY id DESC LIMIT ?",
                Math.max( 1, Math.min( limit, 500 ) ) );
        return ResponseEntity.ok( rows );
    }
}
