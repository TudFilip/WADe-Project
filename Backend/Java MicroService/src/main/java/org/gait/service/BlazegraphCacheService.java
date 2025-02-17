package org.gait.service;

import org.apache.jena.query.*;
import org.apache.jena.sparql.exec.http.QueryExecutionHTTP;
import org.apache.jena.sparql.exec.http.QuerySendMode;
import org.apache.jena.update.UpdateExecutionFactory;
import org.apache.jena.update.UpdateFactory;
import org.apache.jena.update.UpdateProcessor;
import org.apache.jena.update.UpdateRequest;
import org.gait.vocabulary.CacheOntology;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;

 import org.slf4j.Logger;
 import org.slf4j.LoggerFactory;

@Service
public class BlazegraphCacheService {

    private static final Logger LOG = LoggerFactory.getLogger(BlazegraphCacheService.class);

    @Value("${blazegraph.endpoint:http://localhost:9999/blazegraph/namespace/kb/sparql}")
    private String blazegraphEndpoint;

    /**
     * The cache expiration in minutes, read from application.properties or environment var.
     */
    @Value("${cache.expiration.minutes:1}")
    private long cacheExpirationMinutes;

    /**
     * Prefixes for our cache ontology and XSD in SPARQL queries.
     */
    private static final String PREFIXES =
            "PREFIX cache: <" + CacheOntology.NS + "> " +
                    "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> ";

    /**
     * Generates a unique URI for a given prompt.
     */
    public String generatePromptURI(String prompt) {
        return "urn:prompt:" + URLEncoder.encode(prompt, StandardCharsets.UTF_8);
    }

    /**
     * Escapes double quotes and removes newlines from input to avoid breaking queries.
     */
    private String sanitize(String input) {
        if (input == null) return "";
        return input
                .replace("\"", "\\\"")
                .replace("\n", " ")
                .replace("\r", " ");
    }

    /**
     * Saves a cache entry with the user prompt, the final GraphQL result, and the creation timestamp.
     */
    public void saveCacheEntry(String prompt, String graphQLResult) {
        String promptURI = generatePromptURI(prompt);
        String safePrompt = sanitize(prompt);
        String safeGraphQLResult = sanitize(graphQLResult);
        String timestamp = Instant.now().toString();  // ISO-8601 format

        String updateString = PREFIXES +
                "INSERT DATA { " +
                "  <" + promptURI + "> a <" + CacheOntology.CachedEntry + "> ; " +
                "    <" + CacheOntology.originalPrompt + "> \"" + safePrompt + "\" ; " +
                "    <" + CacheOntology.hasGraphQLResult + "> \"" + safeGraphQLResult + "\" ; " +
                "    <" + CacheOntology.createdAt + "> \"" + timestamp + "\"^^xsd:dateTime ." +
                "}";

        UpdateRequest updateRequest = UpdateFactory.create(updateString);
        UpdateProcessor processor =
                UpdateExecutionFactory.createRemoteForm(updateRequest, blazegraphEndpoint);
        processor.execute();

         LOG.debug("Saved cache entry for promptURI={} at time={}", promptURI, timestamp);
    }

    /**
     * Retrieves the cached entry for the given prompt.
     * If the entry is older than the configured expiration (cacheExpirationMinutes),
     * it is deleted and null is returned. Otherwise, we return the cached content.
     */
    public CachedEntry fetchCacheEntry(String prompt) {
        String promptURI = generatePromptURI(prompt);

        String queryString = PREFIXES +
                "SELECT ?graphQLResult ?createdAt WHERE { " +
                "  <" + promptURI + "> a <" + CacheOntology.CachedEntry + "> ; " +
                "    <" + CacheOntology.hasGraphQLResult + "> ?graphQLResult ; " +
                "    <" + CacheOntology.createdAt + "> ?createdAt ." +
                "}";

        Query query = QueryFactory.create(queryString);

        try (QueryExecution qexec = QueryExecutionHTTP.newBuilder()
                .endpoint(blazegraphEndpoint)
                .query(query)
                .sendMode(QuerySendMode.asPost)
                .build()) {

            ResultSet results = qexec.execSelect();
            if (results.hasNext()) {
                QuerySolution sol = results.nextSolution();
                String graphQLResult = sol.getLiteral("graphQLResult").getString();
                String createdAtStr = sol.getLiteral("createdAt").getString();
                Instant createdAt = Instant.parse(createdAtStr);

                // Use the actual configured expiration
                long ageSeconds = Duration.between(createdAt, Instant.now()).toSeconds();
                long expirationSeconds = cacheExpirationMinutes * 60;

                if (ageSeconds >= expirationSeconds) {
                    // Cache is expired, remove it and return null
                    removeCacheEntry(prompt);
                     LOG.debug("Cache expired for prompt={}, ageSeconds={}, expirationSeconds={}", prompt, ageSeconds, expirationSeconds);
                    return null;
                }

                // Still valid
                return new CachedEntry(prompt, graphQLResult, createdAtStr);
            }
        }
        // No results found or something else happened
        return null;
    }

    /**
     * Deletes the cached entry for the given prompt.
     */
    public void removeCacheEntry(String prompt) {
        String promptURI = generatePromptURI(prompt);

        String updateString = PREFIXES +
                "DELETE WHERE { <" + promptURI + "> ?p ?o . }";

        UpdateRequest updateRequest = UpdateFactory.create(updateString);
        UpdateProcessor processor =
                UpdateExecutionFactory.createRemoteForm(updateRequest, blazegraphEndpoint);
        processor.execute();

         LOG.debug("Removed cache entry for promptURI={}", promptURI);
    }

    /**
     * DTO for a cached entry.
     */
    public static class CachedEntry {
        public final String prompt;
        public final String graphQLResult;
        public final String createdAt;

        public CachedEntry(String prompt, String graphQLResult, String createdAt) {
            this.prompt = prompt;
            this.graphQLResult = graphQLResult;
            this.createdAt = createdAt;
        }
    }
}
