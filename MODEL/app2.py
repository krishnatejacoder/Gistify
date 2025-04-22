#import necessary libraries
from flask import Flask, request, jsonify 
from flask_cors import CORS
import os, uuid, logging, re 
import torch
from transformers import T5Tokenizer, T5ForConditionalGeneration
import chromadb
from chromadb.config import Settings 
from PyPDF2 import PdfReader
from werkzeug.utils import secure_filename
from chromadb import PersistentClient
from nltk.tokenize import sent_tokenize  # Import for sentence tokenization
import nltk

# Function to ensure NLTK resources are available
def ensure_nltk_resources():
    try:
        # Specify download directory
        nltk_data_dir = os.path.join(os.path.expanduser('~'), 'nltk_data')
        os.makedirs(nltk_data_dir, exist_ok=True)
        
        # Download punkt to the specified directory
        nltk.download('punkt', download_dir=nltk_data_dir, quiet=False)
        
        # Verify the download
        from nltk.data import find
        find('tokenizers/punkt')
        print("NLTK punkt resource loaded successfully")
    except Exception as e:
        print(f"Failed to download NLTK resources: {str(e)}")
        raise

# Call this function to ensure punkt is available before using it
ensure_nltk_resources()

# Initialize Flask app and CORS
app = Flask(__name__)
CORS(app)

#flask app initialization
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)# Create uploads directory if it doesn't exist
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB max

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize ChromaDB client and collection
chroma_client = PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="research_papers")

# Initialize T5 tokenizer and model
tokenizer = T5Tokenizer.from_pretrained("google/flan-t5-base", legacy=False)
model = T5ForConditionalGeneration.from_pretrained("google/flan-t5-base", device_map="auto")

# Helper function to clean text by removing URLs and normalizing whitespace
def clean_text(text):
    text = re.sub(r"http\S+|www\S+|https\S+", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

# Helper function to extract text from PDF files
def get_text_from_pdf(path):
    try:
        reader = PdfReader(path)
        text = "\n".join([page.extract_text() or "" for page in reader.pages])
        return text.strip() if text else "Error: No text extracted."
    except Exception as e:
        return f"Error extracting text: {str(e)}"

# Update the prompts to reflect the new requirements
advantages_prompt = """List exactly 2 key advantages of the document. Focus on the positive aspects of the content. Format as bullet points:
- First advantage (max 20 words)
- Second advantage (max 20 words)
Focus only on the main benefits."""

disadvantages_prompt = """List exactly 2 key disadvantages of the document. Focus on the negative aspects or limitations of the content. Format as bullet points:
- First disadvantage (max 20 words)
- Second disadvantage (max 20 words)
Focus only on the main limitations."""

# Helper function to generate text using the T5 model
def generate(text, task):
    try:
        logger.info(f"Generating text for task: {task}")
        input_text = f"{task}:\n\nBase your response on this text:\n{text[:2000]}"
        logger.info(f"Input text: {input_text[:500]}")  # Log the first 500 characters of the input text

        # Move inputs to model's device
        device = next(model.parameters()).device
        inputs = tokenizer(input_text, return_tensors="pt", truncation=True, max_length=512).to(device)

        # Set target lengths based on the task
        if "summary" in task.lower():
            target_length = 325
        elif "advantages" in task.lower() or "disadvantages" in task.lower():
            target_length = 100
        else:
            target_length = 200

        # Generate text - Fixed parameters for do_sample and temperature
        output = model.generate(
            input_ids=inputs.input_ids,
            attention_mask=inputs.attention_mask,
            max_length=target_length + 5,
            min_length=target_length - 5,
            num_beams=2,
            no_repeat_ngram_size=3,
            do_sample=False,  
            early_stopping=True,
            length_penalty=1.0
        )

        generated_text = tokenizer.decode(output[0], skip_special_tokens=True)
        logger.info(f"Generated text: {generated_text[:500]}")  # Log the first 500 characters of the generated text
        return generated_text
    except Exception as e:
        logger.error(f"Error in generate function: {str(e)}")
        raise

# Function to extract advantages and disadvantages from text
def extract_advantages_disadvantages(text):
    if not text:
        logger.error("No text provided to extract advantages and disadvantages")
        return [], [], "No text to extract from"

    logger.info("Tokenizing text into sentences...")
    
    try:
        sentences = sent_tokenize(text)
        logger.info(f"Number of sentences: {len(sentences)}")

        advantages = []
        disadvantages = []

        # Expanded keywords for better detection
        advantage_keywords = [
            'advantage', 'benefit', 'pro', 'strength', 'positive', 'improve', 
            'enhance', 'better', 'effective', 'efficient', 'useful', 'helpful',
            'valuable', 'gain', 'improvement', 'success'
        ]
        
        disadvantage_keywords = [
            'disadvantage', 'limitation', 'con', 'weakness', 'negative', 'drawback',
            'challenge', 'problem', 'issue', 'difficulty', 'concern', 'risk',
            'downside', 'obstacle', 'barrier', 'pitfall', 'shortcoming'
        ]
        
        for sentence in sentences:
            sentence_lower = sentence.lower()
            # Check for advantage keywords
            if any(keyword in sentence_lower for keyword in advantage_keywords):
                if sentence not in advantages:  # Avoid duplicates
                    advantages.append(sentence)
            # Check for disadvantage keywords
            elif any(keyword in sentence_lower for keyword in disadvantage_keywords):
                if sentence not in disadvantages:  # Avoid duplicates
                    disadvantages.append(sentence)

        logger.info(f"Extracted advantages: {advantages}")
        logger.info(f"Extracted disadvantages: {disadvantages}")

        # Get the most relevant advantages and disadvantages (up to 5 each)
        return advantages[:5], disadvantages[:5], None
    
    except Exception as e:
        logger.error(f"Error in sentence tokenization: {str(e)}")
        # Fallback method if tokenization fails
        logger.info("Using fallback method to extract advantages/disadvantages")
        
        # Attempt to generate advantages and disadvantages using the T5 model as fallback
        try:
            advantages_text = generate(text, advantages_prompt)
            disadvantages_text = generate(text, disadvantages_prompt)
            
            # Convert generated text to list format
            advantages = [adv.strip() for adv in advantages_text.split('\n') if adv.strip()]
            disadvantages = [dis.strip() for dis in disadvantages_text.split('\n') if dis.strip()]
            
            return advantages[:5], disadvantages[:5], None
        except Exception as inner_e:
            logger.error(f"Fallback method also failed: {str(inner_e)}")
            return [], [], f"Failed to extract: {str(e)}"

#Home Endpoint to check API status
@app.route('/')
def home():
    return jsonify({"status": "active", "model": "FLAN-T5", "endpoints": ["/upload", "/summarize-concise","/summarize-analytical","/summarize-comprehensive","/ask"]})

#Upload Endpoint to upload PDF files
@app.route("/upload", methods=["POST"])
def upload_file():
    file = request.files.get("file")
    if not file or file.filename == "":
        return jsonify({"error": "No valid file uploaded"}), 400

    # Secure the filename to prevent path traversal attacks
    filename = secure_filename(file.filename)
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)

    # Extract text from the PDF
    text = get_text_from_pdf(file_path)
    if "Error" in text:
        return jsonify({"error": text}), 500

    #Generate a UUID(Universally Unique Identifier) for the document and store the document text in ChromaDB with metadata
    doc_id = str(uuid.uuid4())
    collection.add(ids=[doc_id], documents=[text], metadatas=[{"source": filename}])

    # Return document ID and a preview of the extracted text
    return jsonify({
        "message": "File uploaded",
        "sample": text[:250],
        "source": filename,
        "doc_id": doc_id
    })

#Summarize Endpoint to generate concise summaries for uploaded documents
@app.route("/summarize-concise", methods=["POST"])
def summarize_concise():
    data = request.get_json()
    doc_id = data.get("doc_id")
    if not doc_id:
        logger.error("doc_id is missing in the request")
        return jsonify({"error": "doc_id is required"}), 400

    # Retrieve document from ChromaDB using its ID
    try:
        logger.info(f"Retrieving document with doc_id: {doc_id}")
        result = collection.get(ids=[doc_id])
        if not result['documents']:
            logger.error(f"Document with doc_id {doc_id} not found in ChromaDB")
            return jsonify({"error": "Document not found"}), 404
    except Exception as e:
        logger.error(f"Error retrieving document from ChromaDB: {str(e)}")
        return jsonify({"error": "Failed to retrieve document"}), 500

    full_text = result['documents'][0]
    if not full_text:
        logger.error(f"Document with doc_id {doc_id} has empty text")
        return jsonify({"error": "Document text is empty"}), 400

    # Generate summary
    try:
        logger.info("Generating summary...")
        summary = generate(full_text, "Create a concise summary in exactly 250 words. Focus only on the main points and key facts. Remove all unnecessary details, examples, and explanations. Use short, direct sentences and avoid subjective analysis.")
        logger.info(f"Generated summary: {summary[:100]}")  # Log the first 100 characters of the summary
    except Exception as e:
        logger.error(f"Error generating summary: {str(e)}")
        return jsonify({"error": "Failed to generate summary"}), 500

    # Extract advantages and disadvantages
    try:
        logger.info("Extracting advantages and disadvantages...")
        advantages, disadvantages, error = extract_advantages_disadvantages(full_text)
        if error:
            logger.error(f"Error extracting advantages and disadvantages: {error}")
            return jsonify({"error": error}), 500
        logger.info(f"Advantages: {advantages}")
        logger.info(f"Disadvantages: {disadvantages}")
    except Exception as e:
        logger.error(f"Error extracting advantages and disadvantages: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500

    # Return all three generated texts and the source filename
    return jsonify({
        "summary": summary,
        "advantages": advantages,
        "disadvantages": disadvantages,
        "source": result['metadatas'][0].get("source", "Unknown")
    })

#Summarize Endpoint to generate analytical summaries for uploaded documents
@app.route("/summarize-analytical", methods=["POST"])
def summarize_analytical():
    data = request.get_json()
    doc_id = data.get("doc_id")
    if not doc_id:
        return jsonify({"error": "doc_id is required"}), 400

    # Retrieve document from ChromaDB using its ID
    try:
        result = collection.get(ids=[doc_id])
        if not result['documents']:
            logger.error("Document not found in ChromaDB")
            return jsonify({"error": "Document not found"}), 404
    except Exception as e:
        logger.error(f"Error retrieving document from ChromaDB: {str(e)}")
        return jsonify({"error": "Failed to retrieve document"}), 500

    full_text = result['documents'][0]
    if not full_text:
        logger.error("Document text is empty")
        return jsonify({"error": "Document text is empty"}), 400

    # Generate summary
    try:
        summary = generate(full_text, "Provide an analytical summary in exactly 250 words. Examine underlying patterns, causes and effects. Evaluate the significance of key elements and include critical assessment of strengths and weaknesses. Focus on interpretation rather than just information.")
    except Exception as e:
        logger.error(f"Error generating summary: {str(e)}")
        return jsonify({"error": "Failed to generate summary"}), 500

    # Extract advantages and disadvantages
    try:
        advantages, disadvantages, error = extract_advantages_disadvantages(full_text)
        if error:
            logger.error(f"Error extracting advantages and disadvantages: {error}")
            return jsonify({"error": error}), 500
    except Exception as e:
        logger.error(f"Error extracting advantages and disadvantages: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500

    # Return all three generated texts and the source filename
    return jsonify({
        "summary": summary,
        "advantages": advantages,
        "disadvantages": disadvantages,
        "source": result['metadatas'][0].get("source", "Unknown")
    })

#Summarize Endpoint to generate comprehensive summaries for uploaded documents
@app.route("/summarize-comprehensive", methods=["POST"])
def summarize_comprehensive():
    data = request.get_json()
    doc_id = data.get("doc_id")
    if not doc_id:
        return jsonify({"error": "doc_id is required"}), 400

    # Retrieve document from ChromaDB using its ID
    result = collection.get(ids=[doc_id])
    if not result['documents']:
        return jsonify({"error": "Document not found"}), 404

    full_text = result['documents'][0]
    if not full_text:
        return jsonify({"error": "Document text is empty"}), 400

    # Generate summary
    summary = generate(full_text, "Develop a comprehensive summary in exactly 250 words. Cover all major aspects of the content including background context, methodology, findings, implications, and limitations. Ensure balanced coverage of different perspectives and include supporting details.")
    
    # Extract advantages and disadvantages
    try:
        advantages, disadvantages, error = extract_advantages_disadvantages(full_text)
        if error:
            return jsonify({"error": error}), 500
    except Exception as e:
        logger.error(f"Error extracting advantages and disadvantages: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500

    # Return all three generated texts and the source filename
    return jsonify({
        "summary": summary,
        "advantages": advantages,
        "disadvantages": disadvantages,
        "source": result['metadatas'][0].get("source", "Unknown")
    })

#Ask Endpoint to to ask questions about uploaded documents
@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json()
    question = data.get("question")
    doc_id = data.get("doc_id")
    if not question or not doc_id:
        return jsonify({"error": "Both question and doc_id are required"}), 400

    # Retrieve document from ChromaDB using its ID
    result = collection.get(ids=[doc_id])
    if not result['documents']:
        return jsonify({"error": "Document not found"}), 404

    context = result['documents'][0]
    prompt = f"Answer the question:\nQuestion: {question}\nContext: {context[:2000]}"
    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=1024)
    
    # Generate answer with compatible parameters
    output = model.generate(
        inputs.input_ids, 
        max_length=150, 
        num_beams=2, 
        temperature=0.7,
        do_sample=True,  # Set to True to use temperature
        early_stopping=True
    )

    
    answer = tokenizer.decode(output[0], skip_special_tokens=True)

    # Return the generated answer and metadata
    return jsonify({
        "answer": answer,
        "context_used": len(context),
        "source": result['metadatas'][0].get("source", "Unknown")
    })

#Main Block
if __name__ == "__main__":
    # Run on all network interfaces (0.0.0.0) on port 5000
    app.run(host="0.0.0.0", port=5000)