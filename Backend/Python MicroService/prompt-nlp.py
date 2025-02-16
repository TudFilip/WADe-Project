import json
import os

import openai
from flask import Flask, request, jsonify
from openai import OpenAI

client = OpenAI()

openai.api_key = os.environ.get("OPENAI_API_KEY")

app = Flask(__name__)


@app.route('/parse/with-known-api', methods=['POST'])
def parse_prompt_with_known_api():
    data = request.get_json()
    user_prompt = data.get("prompt")
    desired_api = data.get("api")

    if not user_prompt:
        return jsonify({"error": "Missing 'prompt' in request"}), 400

    if not desired_api:
        return jsonify({"error": "Missing 'api' in request"}), 400

    # Define the system instruction
    system_message = (
        "You are an NLP parser. When given a natural language prompt for querying an API, "
        "extract the following keys into valid JSON with no additional text:\n\n"
        "JSON FORMAT: \"\"\"\n"
        "{\n"
        "  \"action\": \"QUERY\",\n"
        "  \"target\": \"user\",\n"
        "  \"identifier\": \"<identifier>\",\n"
        "  \"subEntity\": \"<subEntity>\",\n"
        "  \"limit\": <limit>,\n"
        "  \"constraints\": [\"<constraint1>\", ...],\n"
        "  \"fields\": [\"<field1>\", ...],\n"
        "  \"api\": \"<api>\"\n"
        "}\n"
        "\"\"\"\n\n"
        "Make sure the output is valid JSON. The JSON will be used to create a SPARQL query over and RDF file. "
        f"The RDF file contains the structure of a public GrapQL API. The desired API by the user from {desired_api}. "
        "Each key of that JSON should be related to the desired api."
    )

    # Combine with the user prompt in the conversation
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": f"Extract the JSON structure from this prompt: '{user_prompt}'"}
    ]

    try:
        # Call OpenAI's Chat API (using gpt-4 or gpt-3.5-turbo, as available)
        response = client.chat.completions.create(
            model="gpt-4o-2024-08-06",
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0
        )
    except Exception as e:
        return jsonify({"error": "OpenAI API call failed", "details": str(e)}), 500

    answer = response.choices[0].message.content.strip()

    try:
        json_response = json.loads(answer)
    except Exception as e:
        return jsonify({
            "error": "Failed to parse JSON from OpenAI response",
            "details": str(e),
            "raw_response": answer
        }), 500

    # Return the parsed JSON
    return jsonify(json_response)


def load_ontology(file_path):
    try:
        with open(file_path, 'r') as f:
            return f.read()
    except Exception as e:
        return f"Error loading ontology: {str(e)}"


@app.route('/parse/with-api-detection', methods=['POST'])
def parse_prompt_with_api_detection():
    data = request.get_json()
    user_prompt = data.get("prompt")

    if not user_prompt:
        return jsonify({"error": "Missing 'prompt' in request"}), 400

    # Load the ontology from a file (adjust the path as needed).
    github_ontology = load_ontology("./graphQLOntology_github.ttl")
    countries_ontology = load_ontology("./graphQLOntology_countries.ttl")

    system_message_api_detection = (
        "You are a helper for my NLP parser. The parser is given a natural language prompt to query a public "
        "GraphQL API. Your job is to detect which API the user is referring to. The prompt will be in English or Romanian. "
        "Search for keywords or sequences of words that might be useful to you. Currently, we support only a list of 3 public "
        "GraphQL APIs:\n\n"
        "THE LIST:\n"
        "GITHUB PUBLIC GRAPHQL API\n"
        "COUNTRIES PUBLIC GRAPHQL API\n"
        "SPACEX PUBLIC GRAPHQL API\n\n"
        "The response should be a valid JSON with no additional text:\n\n"
        "JSON FORMAT: \"\"\"\n"
        "{\n"
        "   \"api\": \"<detected api>\"\n"
        "}\n"
        "\"\"\"\n\n"
        "The 'api' property should be a capitalized string based on the detected API. For example, if related to "
        "GITHUB PUBLIC GRAPHQL API, output 'GITHUB'.\n\n"
        "Again, make sure the output is just a valid JSON."
    )

    messages_for_api_detection = [
        {"role": "system", "content": system_message_api_detection},
        {"role": "user", "content": f"Detect the API from this user prompt: '{user_prompt}'"}
    ]

    try:
        detected_api_response = client.chat.completions.create(
            model="gpt-4o-2024-11-20",
            messages=messages_for_api_detection,
            response_format={"type": "json_object"},
            temperature=0,
        )
    except Exception as e:
        return jsonify({"error": "OpenAI API call failed", "details": str(e)}), 500

    detected_api_json = detected_api_response.choices[0].message.content.strip()

    try:
        detected_data = json.loads(detected_api_json)
        detected_api = detected_data['api']
    except json.JSONDecodeError as e:
        return jsonify({"error": "Invalid OpenAI detected api JSON", "details": str(e)}), 500

    system_message = (
        "You are an NLP parser. When given a natural language prompt for querying an API, "
        "extract the following keys into valid JSON with no additional text:\n\n"
        "JSON FORMAT: \"\"\"\n"
        "{\n"
        "  \"action\": \"QUERY\",\n"
        "  \"target\": \"<target>\",\n"
        "  \"identifier\": \"<identifier>\",\n"
        "  \"subEntity\": \"<subEntity>\",\n"
        "  \"limit\": <limit>,\n"
        "  \"constraints\": [\"<constraint1>\", ...],\n"
        "  \"fields\": [\"<field1>\", ...],\n"
        "  \"api\": \"<api>\"\n"
        "}\n"
        "\"\"\"\n\n"
        "Make sure the output is valid JSON. The JSON will be used to create a SPARQL query over an RDF file. "
        f"The desired API by the user is {detected_api}. Each key should relate to that API. If no limit is specified, select all.\n"
        "Below is the GitHub ontology and Countries ontology that defines API structure mappings. Use it as context to improve your detection:\n\n"
        f"{github_ontology}"
        f"{countries_ontology}"

    )

    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": f"Extract the JSON structure from this prompt: '{user_prompt}'"}
    ]

    try:
        nlp_response = client.chat.completions.create(
            model="gpt-4o-2024-11-20",
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0
        )
    except Exception as e:
        return jsonify({"error": "OpenAI API call failed", "details": str(e)}), 500

    nlp_answer_json = nlp_response.choices[0].message.content.strip()
    try:
        json_response = json.loads(nlp_answer_json)
    except Exception as e:
        return jsonify({
            "error": "Failed to parse JSON from OpenAI response",
            "details": str(e),
            "raw_response": nlp_answer_json
        }), 500

    return jsonify(json_response)


if __name__ == '__main__':
    app.run(debug=True)
