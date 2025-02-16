package org.gait.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.apache.jena.query.*;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelFactory;
import org.gait.database.entity.UserEntity;
import org.gait.database.service.EndpointCallService;
import org.gait.dto.Api;
import org.gait.dto.NLPResponse;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ClientService {

    private final RestTemplate restTemplate;
    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final BlazegraphCacheService cacheService;
    private final EndpointCallService endpointCallService;

    // NLP endpoint is configured via application.properties/docke-compose.
    @org.springframework.beans.factory.annotation.Value("${nlp.endpoint:http://localhost:5000/parse/with-api-detection}")
    private String nlpEndpoint;

    /**
     * Processes a client prompt and returns the final GraphQL API result.
     * Checks the cache first, then calls the NLP endpoint and processes the response if needed.
     */
    public String handleClientPrompt(String prompt, UserEntity user) {
        // Check for a valid cached entry.
        try {
            BlazegraphCacheService.CachedEntry cached = cacheService.fetchCacheEntry(prompt);
            if (cached != null) {
                System.out.println("Cache hit! Cached GraphQL Result: " + cached.graphQLResult);
                return cached.graphQLResult;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // No cache found: call the NLP endpoint with the prompt.
        NLPResponse nlpResponse = callNlpService(prompt);
        endpointCallService.incrementCallCount(user, Api.valueOf(nlpResponse.getApi()));
        System.out.println("Received NLP response: " + nlpResponse);

        // Process the NLP response, build the query, call external GraphQL API, and cache the result.
        return processNlpResponse(nlpResponse, prompt);
    }

    /**
     * Calls the external Python NLP endpoint to parse the prompt.
     * Returns an NLPResponse object.
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
     * - Loads the appropriate ontology.
     * - Retrieves mapping data from the ontology.
     * - Dynamically retrieves constraint mapping from the ontology if provided.
     * - Builds the GraphQL query.
     * - Invokes the external GraphQL API.
     * - Caches and returns the final GraphQL result.
     */
    public String processNlpResponse(NLPResponse response, String originalPrompt) {
        try {
            String target = response.getTarget();
            String subEntity = response.getSubEntity();
            List<String> constraints = response.getConstraints();
            String constraint = (constraints != null && !constraints.isEmpty()) ? constraints.get(0) : null;

            // Select the ontology file based on the API.
            String ontologyFile;
            if ("github".equalsIgnoreCase(response.getApi())) {
                ontologyFile = "classpath:ontology/graphQLOntology_github.ttl";
            } else if ("countries".equalsIgnoreCase(response.getApi())) {
                ontologyFile = "classpath:ontology/graphQLOntology_countries.ttl";
            } else {
                System.err.println("Unknown API: " + response.getApi());
                return "";
            }

            // Load the ontology.
            Resource ontologyResource = resourceLoader.getResource(ontologyFile);
            Model model = ModelFactory.createDefaultModel();
            try (InputStream in = ontologyResource.getInputStream()) {
                model.read(in, null, "TTL");
            } catch (IOException e) {
                System.err.println("Error loading ontology: " + e.getMessage());
                return "";
            }

            // Retrieve target mapping.
            String targetSparql = "PREFIX ex: <http://example.org/ontology#> " +
                    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
                    "SELECT ?targetField ?identifierArgument WHERE { " +
                    "  ?targetConcept rdfs:label \"" + target + "\" ; " +
                    "                 ex:mapsToField ?targetField ; " +
                    "                 ex:identifierArgument ?identifierArgument . " +
                    "}";
            String targetField = "";
            String identifierArgument = "";
            Query targetQuery = QueryFactory.create(targetSparql);
            try (QueryExecution qexec = QueryExecutionFactory.create(targetQuery, model)) {
                ResultSet results = qexec.execSelect();
                if (results.hasNext()) {
                    QuerySolution sol = results.nextSolution();
                    targetField = sol.getLiteral("targetField").getString();
                    identifierArgument = sol.getLiteral("identifierArgument").getString();
                }
            }

            // Retrieve sub-entity mapping.
            String subEntitySparql = "PREFIX ex: <http://example.org/ontology#> " +
                    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
                    "SELECT ?subEntityField ?graphqlType WHERE { " +
                    "  ?concept rdfs:label \"" + subEntity + "\" ; " +
                    "           ex:mapsToGraphQLType ?graphqlType ; " +
                    "           ex:mapsToField ?subEntityField . " +
                    "}";
            String subEntityField = "";
            Query subEntityQuery = QueryFactory.create(subEntitySparql);
            try (QueryExecution qexec = QueryExecutionFactory.create(subEntityQuery, model)) {
                ResultSet results = qexec.execSelect();
                if (results.hasNext()) {
                    QuerySolution sol = results.nextSolution();
                    subEntityField = sol.getLiteral("subEntityField").getString();
                }
            }

            // Dynamically retrieve constraint mapping from the ontology (if provided).
            String argumentField = "";
            String orderingField = "";
            String defaultDirection = "";
            if (constraint != null && !constraint.trim().isEmpty()) {
                String constraintSparql = "PREFIX ex: <http://example.org/ontology#> " +
                        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
                        "SELECT ?argumentField ?orderingField ?defaultDirection WHERE { " +
                        "  ?constraintConcept rdfs:label \"" + constraint + "\" ; " +
                        "                      ex:mapsToArgumentField ?argumentField ; " +
                        "                      ex:mapsToOrderingField ?orderingField ; " +
                        "                      ex:defaultDirection ?defaultDirection . " +
                        "}";
                Query constraintQuery = QueryFactory.create(constraintSparql);
                try (QueryExecution qexec = QueryExecutionFactory.create(constraintQuery, model)) {
                    ResultSet results = qexec.execSelect();
                    if (results.hasNext()) {
                        QuerySolution sol = results.nextSolution();
                        argumentField = sol.getLiteral("argumentField").getString();
                        orderingField = sol.getLiteral("orderingField").getString();
                        defaultDirection = sol.getLiteral("defaultDirection").getString();
                    }
                }
            }

            // Build the GraphQL query using all retrieved values.
            String graphQLQuery = buildGraphQLQuery(response, targetField, identifierArgument,
                    subEntityField, argumentField, orderingField, defaultDirection);
            System.out.println("Generated GraphQL Query:");
            System.out.println(graphQLQuery);

            // Call the external GraphQL API.
            String graphQLResult = queryExternalGraphQLApi(graphQLQuery, response.getApi());
            System.out.println("GraphQL API response:");
            System.out.println(graphQLResult);

            // Cache the final result (store only the prompt and GraphQL result).
            cacheService.saveCacheEntry(originalPrompt, graphQLResult);

            return graphQLResult;
        } catch (Exception ex) {
            System.err.println("Processing error: " + ex.getMessage());
            return "";
        }
    }

    /**
     * Builds a GraphQL query based on the NLP response and retrieved mappings.
     * If a limit is not provided, defaults to 100.
     */
    public String buildGraphQLQuery(NLPResponse response,
                                    String targetField,
                                    String identifierArgument,
                                    String subEntityField,
                                    String argumentField,
                                    String orderingField,
                                    String defaultDirection) {
        if ("GITHUB".equalsIgnoreCase(response.getApi())) {
            if ("repositories".equalsIgnoreCase(response.getTarget()) &&
                    response.getIdentifier() != null && !response.getIdentifier().trim().isEmpty()) {
                targetField = "user";
                identifierArgument = "login";
                if (subEntityField == null || subEntityField.trim().isEmpty()) {
                    subEntityField = "repositories";
                }
            } else {
                if (targetField == null || targetField.trim().isEmpty()) {
                    targetField = response.getTarget();
                }
                if (subEntityField == null || subEntityField.trim().isEmpty()) {
                    subEntityField = response.getSubEntity();
                }
            }
        } else {
            if (targetField == null || targetField.trim().isEmpty()) {
                targetField = response.getTarget();
            }
            if (subEntityField == null || subEntityField.trim().isEmpty()) {
                subEntityField = response.getSubEntity();
            }
        }

        StringBuilder sb = new StringBuilder();
        sb.append("query {\n");
        if (response.getIdentifier() != null && !response.getIdentifier().trim().isEmpty()) {
            sb.append("  ").append(targetField)
                    .append("(").append(identifierArgument)
                    .append(": \"").append(response.getIdentifier()).append("\") {\n");
        } else {
            sb.append("  ").append(targetField).append(" {\n");
        }

        // For non-countries APIs (e.g., GitHub), include pagination.
        Integer limit = response.getLimit();
        if (limit == null || limit <= 0) {
            limit = 100;
        }
        sb.append("    ").append(subEntityField)
                .append("(first: ").append(limit);
        if (argumentField != null && !argumentField.trim().isEmpty() &&
                orderingField != null && !orderingField.trim().isEmpty() &&
                defaultDirection != null && !defaultDirection.trim().isEmpty()) {
            sb.append(", ").append(argumentField)
                    .append(": { field: ").append(orderingField)
                    .append(", direction: ").append(defaultDirection).append(" }");
        }
        sb.append(") {\n");
        sb.append("      nodes {\n");
        List<String> fields = response.getFields();
        if (fields == null || fields.isEmpty()) {
            sb.append("        id\n");
        } else {
            for (String field : fields) {
                sb.append("        ").append(field).append("\n");
            }
        }
        sb.append("      }\n");
        sb.append("    }\n");
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
            headers.set("Authorization", "Bearer token");
        } else if ("countries".equalsIgnoreCase(api)) {
            publicEndpoint = "https://countries.trevorblades.com/";
        } else {
            System.err.println("Unknown API: " + api);
            return "";
        }
        Map<String, String> body = new HashMap<>();
        body.put("query", graphQLQuery);
        HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(publicEndpoint, entity, String.class);
        if (response.getStatusCode().is2xxSuccessful()) {
            return response.getBody();
        } else {
            System.err.println("Error querying GraphQL API (" + api + "): " + response.getStatusCode());
            return "";
        }
    }
}
