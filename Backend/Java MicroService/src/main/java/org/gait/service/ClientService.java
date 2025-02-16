package org.gait.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.apache.jena.query.*;
import org.apache.jena.sparql.exec.http.QueryExecutionHTTP;
import org.apache.jena.sparql.exec.http.QuerySendMode;
import org.gait.database.entity.UserEntity;
import org.gait.database.service.EndpointCallService;
import org.gait.dto.Api;
import org.gait.dto.NLPResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@RequiredArgsConstructor
public class ClientService {

    // Optionally you can use SLF4J logs:
    // private static final Logger LOG = LoggerFactory.getLogger(ClientService.class);

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final BlazegraphCacheService cacheService;
    private final EndpointCallService endpointCallService;

    // NLP and Blazegraph endpoints
    @Value("${nlp.endpoint:http://localhost:5000/parse/with-api-detection}")
    private String nlpEndpoint;

    @Value("${blazegraph.endpoint:http://localhost:9999/blazegraph/namespace/kb/sparql}")
    private String blazegraphEndpoint;

    // GitHub token from environment variable (or fallback empty)
    @Value("${GITHUB_TOKEN:}")
    private String githubToken;

    private static final Logger logger = LoggerFactory.getLogger(ClientService.class);

    /**
     * Load two TTL files at startup (GitHub + Countries) into Blazegraph.
     */
    @PostConstruct
    public void loadGraphQLOntologiesToBlazegraph() {
        loadTtlToBlazegraph("ontology/graphQLOntology_github.ttl");
        loadTtlToBlazegraph("ontology/graphQLOntology_countries.ttl");
    }

    /**
     * Helper that reads a TTL file from src/main/resources/ontology/
     * and POSTs it to Blazegraph's default graph.
     */
    private void loadTtlToBlazegraph(String ttlFileName) {
        try {
            ClassPathResource ttlResource = new ClassPathResource(ttlFileName);
            if (!ttlResource.exists()) {
                logger.error("Ontology file not found: {}", ttlFileName);
                return;
            }

            byte[] ttlBytes = ttlResource.getInputStream().readAllBytes();
            String ttlContent = new String(ttlBytes, StandardCharsets.UTF_8);

            String url = blazegraphEndpoint + "?default";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("text/turtle"));

            HttpEntity<String> entity = new HttpEntity<>(ttlContent, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                logger.info("Loaded {} into Blazegraph successfully.", ttlFileName);
            } else {
                logger.error("Failed to load {}. HTTP status: {}", ttlFileName, response.getStatusCode());
            }
        } catch (Exception e) {
            logger.error("Could not load TTL {}: {}", ttlFileName, e.getMessage());
        }
    }

    /**
     * Main entry point: processes a client prompt and returns the final GraphQL API result.
     * 1) Checks the cache
     * 2) Calls the NLP
     * 3) Processes the NLP response
     */
    public String handleClientPrompt(String prompt, UserEntity user) {
        // 1) Check for a valid cached entry
        try {
            BlazegraphCacheService.CachedEntry cached = cacheService.fetchCacheEntry(prompt);
            if (cached != null) {
                logger.info("Cache hit! Cached GraphQL Result: {}", cached.graphQLResult);
                return cached.graphQLResult;
            }
        } catch (Exception e) {
            logger.error("Cache lookup error: {}", e.getMessage());
        }

        // 2) No cache found: call the NLP endpoint with the prompt
        NLPResponse nlpResponse = callNlpService(prompt);
        endpointCallService.incrementCallCount(user, Api.valueOf(nlpResponse.getApi()));
        logger.info("Received NLP response: {}", nlpResponse);

        // 3) Process the NLP response -> build GraphQL -> call external API -> cache the result
        return processNlpResponse(nlpResponse, prompt);
    }

    /**
     * Calls the external Python NLP endpoint to parse the prompt.
     */
    public NLPResponse callNlpService(String prompt) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("prompt", prompt);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(nlpEndpoint, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                return objectMapper.readValue(response.getBody(), NLPResponse.class);
            } else {
                throw new RuntimeException("Error calling NLP endpoint: " + response.getStatusCode());
            }
        } catch (IOException e) {
            e.printStackTrace();
            throw new RuntimeException("Failed to parse NLP response", e);
        }
    }

    /**
     * Processes the NLP response:
     *  - Retrieves mapping data from the ontology
     *  - Builds the GraphQL query
     *  - Invokes the external GraphQL API
     *  - Caches and returns the final result
     */
    public String processNlpResponse(NLPResponse response, String originalPrompt) {
        try {
            OntologyMapping mapping = fetchOntologyMappings(response);

            String graphQLQuery = buildGraphQLQuery(response, mapping);
            System.out.println("Generated GraphQL query:\n" + graphQLQuery);

            String externalResult = queryExternalGraphQLApi(graphQLQuery, response.getApi());
            logger.info("GraphQL API result:\n{}", externalResult);

            cacheService.saveCacheEntry(originalPrompt, externalResult);
            return externalResult;
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Error processing NLP response", e);
        }
    }

    /**
     * Builds the GraphQL query based on the NLP response + retrieved mappings.
     * Has special logic for GitHub "user" vs "repositories/issues", etc.
     */
    public String buildGraphQLQuery(NLPResponse response, OntologyMapping map) {
        String api = (response.getApi() != null) ? response.getApi().toUpperCase() : "";
        int limit = (response.getLimit() > 0) ? response.getLimit() : 100;
        String safeIdentifier = sanitizeSparqlString(response.getIdentifier());

        List<String> fields = (response.getFields() != null && !response.getFields().isEmpty())
                ? response.getFields()
                : List.of("name");

        if ("GITHUB".equals(api)) {
            // Distinguish "user" as a direct fields query vs "repositories/issues" with pagination
            String userField = map.userField;            // e.g. "user"
            String userIdentifierArg = map.userIdentifierArg; // e.g. "login"
            String targetField = map.targetField;        // e.g. "repositories" or possibly "user"

            if ("user".equalsIgnoreCase(response.getTarget())) {
                // Single-level: user(login: "X") { location, name, ... }
                return buildGitHubUserFieldsQuery(userField, userIdentifierArg, safeIdentifier, fields);
            } else {
                // Multi-level: user(login: "X") { repositories(...) { nodes {...} } }
                return buildGitHubNestedQuery(userField, userIdentifierArg, targetField, limit, fields, response, map, safeIdentifier);
            }

        } else if ("COUNTRIES".equals(api)) {
            // e.g.: query { continent(code: "AF") { name } }
            return buildCountriesQuery(map.targetField, map.userIdentifierArg, safeIdentifier, fields);

        } else {
            logger.error("Unknown API: {}", api);
            return "";
        }
    }

    /**
     * Helper for GitHub single-level user fields query
     */
    private String buildGitHubUserFieldsQuery(String userField,
                                              String userIdentifierArg,
                                              String safeIdentifier,
                                              List<String> fields) {

        StringBuilder sb = new StringBuilder();
        sb.append("query {\n");
        sb.append("  ").append(userField) // => "user"
                .append("(").append(userIdentifierArg) // => "login"
                .append(": \"").append(safeIdentifier).append("\") {\n");

        for (String f : fields) {
            sb.append("    ").append(sanitizeSparqlString(f)).append("\n");
        }
        sb.append("  }\n");
        sb.append("}\n");
        return sb.toString();
    }

    /**
     * Helper for GitHub multi-level queries (repositories, issues, etc.)
     */
    private String buildGitHubNestedQuery(String userField,
                                          String userIdentifierArg,
                                          String targetField,
                                          int limit,
                                          List<String> fields,
                                          NLPResponse response,
                                          OntologyMapping map,
                                          String safeIdentifier) {

        StringBuilder sb = new StringBuilder();
        sb.append("query {\n");
        sb.append("  ").append(userField)
                .append("(").append(userIdentifierArg).append(": \"")
                .append(safeIdentifier).append("\") {\n");

        sb.append("    ").append(targetField).append("(");

        if (response.getConstraints() != null && !response.getConstraints().isEmpty()) {
            sb.append(map.constraintArgumentField) // e.g. orderBy
                    .append(": { field: ")
                    .append(map.constraintOrderingField)
                    .append(", direction: ")
                    .append(map.constraintDirection)
                    .append("}, ");
        }
        sb.append("first: ").append(limit).append(") {\n");
        sb.append("      nodes {\n");
        for (String f : fields) {
            sb.append("        ").append(sanitizeSparqlString(f)).append("\n");
        }
        sb.append("      }\n");
        sb.append("    }\n");
        sb.append("  }\n");
        sb.append("}\n");
        return sb.toString();
    }

    /**
     * Helper for Countries queries (one-level) e.g. "continent(code: "AF") { name }"
     */
    private String buildCountriesQuery(String targetField,
                                       String userIdentifierArg,
                                       String safeIdentifier,
                                       List<String> fields) {

        StringBuilder sb = new StringBuilder();
        sb.append("query {\n");
        sb.append("  ").append(targetField)
                .append("(").append(userIdentifierArg)
                .append(": \"").append(safeIdentifier)
                .append("\") {\n");

        for (String f : fields) {
            sb.append("    ").append(sanitizeSparqlString(f)).append("\n");
        }
        sb.append("  }\n");
        sb.append("}\n");
        return sb.toString();
    }

    /**
     * Executes the external GraphQL API call and returns the response.
     */
    public String queryExternalGraphQLApi(String graphQLQuery, String api) {
        String publicEndpoint;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        if ("github".equalsIgnoreCase(api)) {
            publicEndpoint = "https://api.github.com/graphql";
            // Use your environment-based GitHub token
            if (githubToken == null || githubToken.isBlank()) {
                logger.warn("GITHUB_TOKEN not set or empty!");
            }
            headers.set("Authorization", "Bearer " + githubToken);
        } else if ("countries".equalsIgnoreCase(api)) {
            publicEndpoint = "https://countries.trevorblades.com/";
        } else {
            logger.error("Unknown API: {}", api);
            return "";
        }

        Map<String, String> body = new HashMap<>();
        body.put("query", graphQLQuery);

        HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(publicEndpoint, entity, String.class);

        if (response.getStatusCode().is2xxSuccessful()) {
            return response.getBody();
        } else {
            logger.error("Error querying GraphQL API ({}): {}", api, response.getStatusCode());
            return "";
        }
    }

    /**
     * Builds a SPARQL query to fetch relevant mappings, depending on the API (GitHub vs. Countries).
     */
    private String buildSparqlQuery(NLPResponse response) {
        String api = (response.getApi() != null) ? response.getApi().toUpperCase() : "";
        String targetLabel = (response.getTarget() != null)
                ? sanitizeSparqlString(response.getTarget().toLowerCase())
                : "";

        String constraintLabel = "";
        if (response.getConstraints() != null && !response.getConstraints().isEmpty()) {
            constraintLabel = sanitizeSparqlString(response.getConstraints().get(0).toLowerCase());
        }

        if ("GITHUB".equals(api)) {
            return """
                PREFIX ex: <http://example.org/ontology#>
                PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

                SELECT ?userField ?userIdentifierArg
                       ?targetField
                       ?constraintArgumentField ?constraintOrderingField ?constraintDirection
                WHERE {
                  ?userConcept a rdfs:Class ;
                               rdfs:label "user" ;
                               ex:mapsToField ?userField ;
                               ex:identifierArgument ?userIdentifierArg .

                  ?targetConcept a rdfs:Class ;
                                 rdfs:label "%s" ;
                                 ex:mapsToField ?targetField .

                  OPTIONAL {
                    ?constraintConcept a rdfs:Class ;
                                       rdfs:label "%s" ;
                                       ex:mapsToArgumentField ?constraintArgumentField ;
                                       ex:mapsToOrderingField ?constraintOrderingField ;
                                       ex:defaultDirection ?constraintDirection .
                  }
                }
                """.formatted(targetLabel, constraintLabel);

        } else if ("COUNTRIES".equals(api)) {
            return """
                PREFIX ex: <http://example.org/ontology#>
                PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

                SELECT ?targetField ?targetGraphQLType ?identifierArg
                WHERE {
                  ?targetConcept a rdfs:Class ;
                                 rdfs:label "%s" ;
                                 ex:mapsToGraphQLType ?targetGraphQLType ;
                                 ex:mapsToField ?targetField ;
                                 ex:identifierArgument ?identifierArg .
                }
                """.formatted(targetLabel);
        }

        return null;
    }

    /**
     * Runs the SPARQL query against Blazegraph to retrieve the ontology mappings needed.
     */
    private OntologyMapping fetchOntologyMappings(NLPResponse response) {
        String sparql = buildSparqlQuery(response);
        if (sparql == null) {
            logger.error("No SPARQL query built for API: {}", response.getApi());
            return new OntologyMapping();
        }
        logger.info("SPARQL Query:\n{}", sparql);

        Query query = QueryFactory.create(sparql);
        try (QueryExecution qexec = QueryExecutionHTTP.newBuilder()
                .endpoint(blazegraphEndpoint)
                .query(query)
                .sendMode(QuerySendMode.asPost)
                .build()) {

            ResultSet results = qexec.execSelect();
            OntologyMapping map = new OntologyMapping();
            if (results.hasNext()) {
                QuerySolution sol = results.nextSolution();

                if ("GITHUB".equalsIgnoreCase(response.getApi())) {
                    map.userField = getLiteralString(sol, "userField");
                    map.userIdentifierArg = getLiteralString(sol, "userIdentifierArg");
                    map.targetField = getLiteralString(sol, "targetField");
                    map.constraintArgumentField = getLiteralString(sol, "constraintArgumentField");
                    map.constraintOrderingField = getLiteralString(sol, "constraintOrderingField");
                    map.constraintDirection = getLiteralString(sol, "constraintDirection");

                } else if ("COUNTRIES".equalsIgnoreCase(response.getApi())) {
                    map.targetField       = getLiteralString(sol, "targetField");
                    map.targetGraphQLType = getLiteralString(sol, "targetGraphQLType");
                    map.userIdentifierArg = getLiteralString(sol, "identifierArg");
                }
            }
            return map;
        }
    }

    /**
     * Safely extracts a literal string from a SPARQL query solution.
     */
    private String getLiteralString(QuerySolution sol, String varName) {
        if (!sol.contains(varName)) return null;
        return sol.get(varName).isLiteral() ? sol.getLiteral(varName).getString() : null;
    }

    /**
     * Simple container for the ontology mappings retrieved via SPARQL.
     */
    private static class OntologyMapping {
        // For GitHub
        String userField;             // e.g. "user"
        String userIdentifierArg;     // e.g. "login"

        // For "repositories", "issues", "country", "continent", etc.
        String targetField;           // e.g. "repositories" or "continent"
        String targetGraphQLType;     // e.g. "Continent"

        // For constraints like "most starred"
        String constraintArgumentField;  // e.g. "orderBy"
        String constraintOrderingField;  // e.g. "STARGAZERS"
        String constraintDirection;      // e.g. "DESC"
    }

    /**
     * Sanitizes user-provided strings so they don't break SPARQL or GraphQL queries.
     */
    private String sanitizeSparqlString(String input) {
        if (input == null) return "";
        return input
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("'", "");
    }
}
