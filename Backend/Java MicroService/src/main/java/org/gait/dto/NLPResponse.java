package org.gait.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@ToString
@AllArgsConstructor
@NoArgsConstructor
public class NLPResponse {
    private String action;
    private String target;
    private String identifier;
    private String subEntity;
    private int limit;
    private List<String> constraints;
    private List<String> fields;
    private String api; // e.g., "github" or "countries"
}
