package org.gait.controller;

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
public class ClientController {

    private final ClientService clientService;
    private final UserService userService;
    private final UserHistoryService userHistoryService;

    // POST endpoint: process a client prompt and return the GraphQL API result.
    @PostMapping("/use-api")
    public String processClientRequest(@RequestBody String prompt, Authentication authentication) {
        UserEntity user = userService.getUserEntity(authentication);
        log.info("Client user={} with prompt='{}'",
                user.getEmail(), prompt);

        // Process the prompt and obtain the GraphQL response.
        String graphQLResponse = clientService.handleClientPrompt(prompt, user);

        // Increment the call count.
        userHistoryService.saveUserHistory(String.valueOf(user.getId()), prompt, graphQLResponse);

        // Return the GraphQL result to the caller.
        return graphQLResponse;
    }

    @GetMapping("")
    public List<UserHistoryService.UserHistoryEntry> getUserHistory(Authentication authentication) {
        UserEntity user = userService.getUserEntity(authentication);
        return userHistoryService.getHistoryForUser(user.getId().toString());
    }
}
