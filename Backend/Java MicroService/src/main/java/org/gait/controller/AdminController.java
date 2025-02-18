package org.gait.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.gait.database.service.EndpointCallService;
import org.gait.dto.EndpointCall;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Endpoints for administrative operations")
public class AdminController {

    private final EndpointCallService endpointCallService;

    @Operation(summary = "Get Call Stats", description = "Returns a list of endpoint call statistics.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved call statistics"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @GetMapping("/call-stats")
    public List<EndpointCall> getCallStats() {
        return endpointCallService.getCallStats();
    }
}
