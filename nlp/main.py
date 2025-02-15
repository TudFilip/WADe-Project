import spacy

nlp = spacy.load("en_core_web_sm")
text = "Show repositories owned by Microsoft with more than 1 stars."

doc = nlp(text)
entities = [(ent.text, ent.label_) for ent in doc.ents]

print("Extracted Entities:", entities)