package com.gustavo.MedicalField;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger UI at /swagger-ui.html. Every route needs the JWT from the identity service
 * (POST /auth/login on port 8081): paste it in the "Authorize" button.
 */
@Configuration
public class OpenApiConfig
{
    @Bean
    public OpenAPI clinicalOpenApi()
    {
        return new OpenAPI()
                .info( new Info()
                        .title( "MedicalField Clinical Service" )
                        .description( "Persons, medical records, encounters, medications and offline sync." )
                        .version( "1.0" ) )
                .components( new Components().addSecuritySchemes( "bearer",
                        new SecurityScheme().type( SecurityScheme.Type.HTTP ).scheme( "bearer" ).bearerFormat( "JWT" ) ) )
                .addSecurityItem( new SecurityRequirement().addList( "bearer" ) );
    }
}
