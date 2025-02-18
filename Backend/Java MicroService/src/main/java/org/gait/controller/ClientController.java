package org.gait.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.gait.database.entity.UserEntity;
import org.gait.database.service.UserService;
import org.gait.service.ClientService;
import org.gait.service.UserHistoryService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/client")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Client", description = "Endpoints for client operations")
public class ClientController {

    private final ClientService clientService;
    private final UserService userService;
    private final UserHistoryService userHistoryService;

    @Operation(summary = "Process Client Request",
            description = "Process a client prompt and return the GraphQL API result. Also records the user's history.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully processed the request and returned GraphQL result"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @PostMapping("/use-api")
    public String processClientRequest(@RequestBody String prompt, Authentication authentication) {
        UserEntity user = userService.getUserEntity(authentication);
        log.info("Client user={} with prompt='{}'", user.getEmail(), prompt);

        // Process the prompt and obtain the GraphQL response.
        String graphQLResponse = clientService.handleClientPrompt(prompt, user);

        // Increment the call count.
        userHistoryService.saveUserHistory(String.valueOf(user.getId()), prompt, graphQLResponse);

        // Return the GraphQL result to the caller.
        return graphQLResponse;
    }

    @Operation(summary = "Get User History", description = "Retrieve the history of API usage for the authenticated client.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved user history"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @GetMapping("")
    public List<UserHistoryService.UserHistoryEntry> getUserHistory(Authentication authentication) {
        UserEntity user = userService.getUserEntity(authentication);
        return userHistoryService.getHistoryForUser(user.getId().toString());
    }
}
