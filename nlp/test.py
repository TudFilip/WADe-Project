import spacy
from gql import Client, gql
from gql.transport.requests import RequestsHTTPTransport
from owlready2 import get_ontology

# Load the ontology
ontology = get_ontology("github_ontology.ttl").load(format="turtle")

# Load spaCy NLP model
nlp = spacy.load("en_core_web_sm")


# Step 1: Extract entities and intent from user input
def process_user_prompt(prompt):
    doc = nlp(prompt)
    entities = []
    for ent in doc.ents:
        entities.append((ent.text, ent.label_))
    return entities


# def map_to_ontology(entities):
#     mapped_entities = []
#     for cls in ontology.classes():
#         for entity, label in entities:
#             if entity.lower() in cls.name.lower():
#                 mapped_entities.append((entity, cls.name))
#     return mapped_entities


def map_to_ontology(entities):
    mapped_entities = []

    for entity, label in entities:
        if entity.lower() == "microsoft":
            mapped_entities.append((entity, "User"))  # Assume Microsoft is a user/organization
        elif "more than" in entity.lower():
            mapped_entities.append((entity, "stars"))  # Map to stars filter

    print("✅ Final Mapped Entities (Hardcoded Fix):", mapped_entities)  # Debug output
    return mapped_entities


def generate_graphql_query(mapped_entities):
    base_query = """
        query {{
          search(query: "{filters}", type: REPOSITORY, first: 10) {{
            edges {{
              node {{
                ... on Repository {{
                  name
                  description
                  stargazerCount
                }}
              }}
            }}
          }}
        }}
    """

    filters = []
    for entity, cls in mapped_entities:
        if cls == "Repository":
            filters.append(f"user:{entity}")
        elif cls == "User":
            filters.append(f"user:{entity}")
        elif cls == "stars":
            filters.append(f"stars:>{entity}")

    filters_str = " ".join(filters)

    # Debug: Print the generated query before executing it
    final_query = base_query.format(filters=filters_str)
    print("Generated GraphQL Query:\n", final_query)

    return gql(final_query)


# Main Function
def main():
    user_prompt = "Show repositories owned by Microsoft with more than 1 stars."

    extracted_entities = process_user_prompt(user_prompt)
    print(f"Extracted Entities: {extracted_entities}")  # Debug output

    mapped_entities = map_to_ontology(extracted_entities)
    print(f"Mapped Entities: {mapped_entities}")  # Debug output

    if not mapped_entities:
        print("No entities mapped! Check entity extraction and ontology.")
        return  # Stop execution if there are no entities

    graphql_query = generate_graphql_query(mapped_entities)
    print("Final GraphQL Query:\n", graphql_query)  # Debug query

    # Token GitHub
    TOKEN = "GITHUB_TOKEN"

    transport = RequestsHTTPTransport(
        url="https://api.github.com/graphql",
        headers={"Authorization": f"Bearer {TOKEN}"}
    )

    client = Client(transport=transport, fetch_schema_from_transport=True)

    try:
        response = client.execute(graphql_query)
        print("GraphQL Response:", response)
    except Exception as e:
        print("GraphQL Error:", e)


# Run the main function
if __name__ == "__main__":
    main()
