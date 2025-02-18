package org.gait.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.gait.database.entity.Role;
import org.gait.database.entity.UserEntity;
import org.gait.database.repository.RoleRepository;
import org.gait.database.repository.UserRepository;
import org.gait.dto.LoginRequest;
import org.gait.dto.RegisterRequest;
import org.gait.dto.RoleName;
import org.gait.security.JwtUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Authentication", description = "Endpoints for user authentication and registration")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Existing login endpoint.
     */
    @Operation(summary = "User Login", description = "Authenticate user and return a JWT token.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully authenticated, JWT token returned"),
            @ApiResponse(responseCode = "401", description = "Unauthorized, authentication failed"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @PostMapping("/login")
    public ResponseEntity<String> login(@RequestBody LoginRequest loginRequest) {
        // Attempt authentication
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword())
        );
        // If success, generate token
        String token = jwtUtils.generateToken(loginRequest.getEmail());
        log.info("User {} logged in. JWT generated", loginRequest.getEmail());
        return ResponseEntity.ok(token);
    }

    /**
     * New endpoint to register a user with the CLIENT role.
     */
    @Operation(summary = "Register Client", description = "Register a new user with the CLIENT role.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "New CLIENT user registered successfully"),
            @ApiResponse(responseCode = "400", description = "Bad Request: Email already in use or CLIENT role not found"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @PostMapping("/register/client")
    public ResponseEntity<String> registerClient(@RequestBody RegisterRequest request) {
        // 1) Check if user (by email) already exists
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Error: Email is already in use!");
        }

        // 2) Find the 'CLIENT' role from the DB (or create it if it doesn't exist)
        Optional<Role> clientRoleOpt = roleRepository.findByRole(RoleName.CLIENT);
        if (clientRoleOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Error: CLIENT role not found in the database!");
        }
        Role clientRole = clientRoleOpt.get();

        // 3) Build a new UserEntity
        UserEntity newUser = UserEntity.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword())) // Hash password
                .fullname(request.getFullname())
                .age(request.getAge())
                .role(clientRole)
                .build();

        // 4) Save to DB
        userRepository.save(newUser);

        // 5) Return a success message
        return ResponseEntity.ok("New CLIENT user registered successfully!");
    }
}
