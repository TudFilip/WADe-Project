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

@Service
@RequiredArgsConstructor
public class ClientService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final BlazegraphCacheService cacheService;
    private final EndpointCallService endpointCallService;

    @Value("${nlp.endpoint:http://localhost:5000/parse/with-api-detection}")
    private String nlpEndpoint;

    @Value("${blazegraph.endpoint:http://localhost:9999/blazegraph/namespace/kb/sparql}")
    private String blazegraphEndpoint;

    /**
     * Load two TTL files at startup (GitHub + Countries) into Blazegraph.
     */
    @PostConstruct
    public void loadGraphQLOntologiesToBlazegraph() {
        loadTtlToBlazegraph("ontology/graphQLOntology_github.ttl");
        loadTtlToBlazegraph("ontology/graphQLOntology_countries.ttl");
    }

    private void loadTtlToBlazegraph(String ttlFileName) {
        try {
            ClassPathResource ttlResource = new ClassPathResource(ttlFileName);
            if (!ttlResource.exists()) {
                System.err.println("Ontology file not found: " + ttlFileName);
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
                System.out.println("Loaded " + ttlFileName + " into Blazegraph successfully.");
            } else {
                System.err.println("Failed to load " + ttlFileName + ". HTTP status: " + response.getStatusCode());
            }
        } catch (Exception e) {
            e.printStackTrace();
            System.err.println("Could not load TTL " + ttlFileName + ": " + e.getMessage());
        }
    }

    public String handleClientPrompt(String prompt, UserEntity user) {
        try {
            BlazegraphCacheService.CachedEntry cached = cacheService.fetchCacheEntry(prompt);
            if (cached != null) {
                System.out.println("Cache hit! Cached GraphQL Result: " + cached.graphQLResult);
                return cached.graphQLResult;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        NLPResponse nlpResponse = callNlpService(prompt);
        endpointCallService.incrementCallCount(user, Api.valueOf(nlpResponse.getApi()));
        System.out.println("Received NLP response: " + nlpResponse);

        return processNlpResponse(nlpResponse, prompt);
    }

    public NLPResponse callNlpService(String prompt) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("prompt", prompt);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            ResponseEntity<String> response =
                    restTemplate.postForEntity(nlpEndpoint, entity, String.class);

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

    public String processNlpResponse(NLPResponse response, String originalPrompt) {
        try {
            OntologyMapping mapping = fetchOntologyMappings(response);

            String graphQLQuery = buildGraphQLQuery(response, mapping);
            System.out.println("Generated GraphQL query:\n" + graphQLQuery);

            String externalResult = queryExternalGraphQLApi(graphQLQuery, response.getApi());
            System.out.println("GraphQL API result:\n" + externalResult);

            cacheService.saveCacheEntry(originalPrompt, externalResult);
            return externalResult;
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Error processing NLP response", e);
        }
    }

    public String buildGraphQLQuery(NLPResponse response, OntologyMapping map) {
        String api = (response.getApi() != null) ? response.getApi().toUpperCase() : "";
        int limit = (response.getLimit() > 0) ? response.getLimit() : 100;
        String safeIdentifier = sanitizeSparqlString(response.getIdentifier());

        List<String> fields = (response.getFields() != null && !response.getFields().isEmpty())
                ? response.getFields()
                : List.of("name");

        if ("GITHUB".equals(api)) {
            String userField = map.userField;          // "user"
            String userIdentifierArg = map.userIdentifierArg; // "login"
            String targetField = map.targetField;      // might also be "user" or "repositories", etc.

            // If the target is "user", skip the second call and query fields directly.
            if ("user".equalsIgnoreCase(response.getTarget())) {
                // We want: user(login: "TudFilip") { location, name, etc. }
                // No "first: ..." or "nodes" in this scenario.

                StringBuilder sb = new StringBuilder();
                sb.append("query {\n");
                sb.append("  ").append(userField)             // => "user"
                        .append("(").append(userIdentifierArg)      // => "login"
                        .append(": \"").append(safeIdentifier).append("\") {\n");

                // Direct fields
                for (String f : fields) {
                    sb.append("    ").append(sanitizeSparqlString(f)).append("\n");
                }
                sb.append("  }\n");
                sb.append("}\n");
                return sb.toString();
            }
            else {
                // The existing repositories/issues approach
                StringBuilder sb = new StringBuilder();
                sb.append("query {\n");
                sb.append("  ").append(userField)
                        .append("(").append(userIdentifierArg).append(": \"")
                        .append(safeIdentifier).append("\") {\n");

                sb.append("    ").append(targetField).append("(");

                if (response.getConstraints() != null && !response.getConstraints().isEmpty()) {
                    sb.append(map.constraintArgumentField)
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
        } else if ("COUNTRIES".equals(api)) {
            // e.g. query { continent(code: "AF") { name } }
            StringBuilder sb = new StringBuilder();
            sb.append("query {\n");
            sb.append("  ").append(map.targetField)
                    .append("(").append(map.userIdentifierArg)
                    .append(": \"").append(safeIdentifier)
                    .append("\") {\n");

            for (String f : fields) {
                sb.append("    ").append(sanitizeSparqlString(f)).append("\n");
            }
            sb.append("  }\n");
            sb.append("}\n");
            return sb.toString();

        } else {
            System.err.println("Unknown API: " + api);
            return "";
        }
    }

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

    private OntologyMapping fetchOntologyMappings(NLPResponse response) {
        String sparql = buildSparqlQuery(response);
        if (sparql == null) {
            System.err.println("No SPARQL query built for API: " + response.getApi());
            return new OntologyMapping();
        }
        System.out.println("SPARQL Query:\n" + sparql);

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

    private String getLiteralString(QuerySolution sol, String varName) {
        if (!sol.contains(varName)) return null;
        return sol.get(varName).isLiteral() ? sol.getLiteral(varName).getString() : null;
    }

    private static class OntologyMapping {
        String userField;
        String userIdentifierArg;
        String targetField;
        String targetGraphQLType;
        String constraintArgumentField;
        String constraintOrderingField;
        String constraintDirection;
    }

    private String sanitizeSparqlString(String input) {
        if (input == null) return "";
        return input
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("'", "");
    }
}