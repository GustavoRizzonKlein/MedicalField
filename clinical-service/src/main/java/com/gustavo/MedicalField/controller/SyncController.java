package com.gustavo.MedicalField.controller;

import com.gustavo.MedicalField.dto.SyncDtos.SyncPullResponse;
import com.gustavo.MedicalField.dto.SyncDtos.SyncPushRequest;
import com.gustavo.MedicalField.dto.SyncDtos.SyncPushResponse;
import com.gustavo.MedicalField.security.AuthenticatedProfessional;
import com.gustavo.MedicalField.sync.SyncService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping( "/sync" )
public class SyncController
{
    private final SyncService syncService;

    public SyncController( SyncService syncService )
    {
        this.syncService = syncService;
    }

    /** Client receives the server state (steps 6 and 11 of the test script). */
    @GetMapping( "/pull" )
    public SyncPullResponse pull()
    {
        return syncService.pull();
    }

    /** Client sends its Outbox (step 14 of the test script). */
    @PostMapping( "/push" )
    public SyncPushResponse push(
            @RequestBody SyncPushRequest request,
            @RequestAttribute( AuthenticatedProfessional.REQUEST_ATTRIBUTE ) AuthenticatedProfessional professional )
    {
        return syncService.push( request, professional );
    }
}
