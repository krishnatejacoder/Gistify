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
from nltk.tokenize import sent_tokenize
import nltk
from pymongo import MongoClient
from datetime import datetime
import cloudinary
import cloudinary.uploader
import cloudinary.api
import requests
from io import BytesIO
from dotenv import load_dotenv
import cloudinary.utils

def ensure_nltk_resources():
    try:
        nltk_data_dir = os.path.join(os.path.expanduser('~'), 'nltk_data')
        os.makedirs(nltk_data_dir, exist_ok=True)
        nltk.download('punkt', download_dir=nltk_data_dir, quiet=False)
        from nltk.data import find
        find('tokenizers/punkt')
        print("NLTK punkt resource loaded successfully")
    except Exception as e:
        print(f"Failed to download NLTK resources: {str(e)}")
        raise

app = Flask(__name__)
CORS(app)

ensure_nltk_resources()

load_dotenv()
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", "dpimerw8h"),
    api_key=os.getenv("CLOUDINARY_API_KEY", "495726973616313"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", "cPM0j222fiNUVb1rHXuugZ2AZ-A")
)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/gistifyDB")
mongo_client = MongoClient(MONGO_URI)
db = mongo_client["gistifyDB"]
summaries_collection = db["Summary"]

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB max

chroma_client = PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="research_papers")

tokenizer = T5Tokenizer.from_pretrained("google/flan-t5-base", legacy=False)
model = T5ForConditionalGeneration.from_pretrained("google/flan-t5-base", device_map="auto")

def clean_text(text):
    text = re.sub(r"http\S+|www\S+|https\S+", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def get_text_from_pdf(path):
    try:
        reader = PdfReader(path)
        text = "\n".join([page.extract_text() or "" for page in reader.pages])
        return text.strip() if text else "Error: No text extracted."
    except Exception as e:
        return f"Error extracting text: {str(e)}"

def get_text_from_pdf_from_url(url):
    try:
        response = requests.get(url,stream=True)
        response.raise_for_status()
        pdf_stream = BytesIO(response.content)
        reader = PdfReader(pdf_stream)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text
    except Exception as e:
        logger.error(f"Failed to extract text from PDF URL: {e}")
        return ""

def generate(text, task):
    try:
        logger.info(f"Generating text for task: {task}")
        input_text = f"{task}:\n\nBase your response on this text:\n{text[:2000]}"
        logger.info(f"Input text: {input_text[:500]}")  # Log the first 500 characters of the input text

        # Move inputs to model's device
        device = next(model.parameters()).device
        inputs = tokenizer(input_text, return_tensors="pt", truncation=True, max_length=1024).to(device)

        # Set target lengths based on the task
        if "summary" in task.lower():
            target_length = 400
        elif "advantages" in task.lower() or "disadvantages" in task.lower():
            target_length = 150
        else:
            target_length = 300

        # Generate text - Fixed parameters for do_sample and temperature
        output = model.generate(
            input_ids=inputs.input_ids,
            attention_mask=inputs.attention_mask,
            max_length=target_length + 5,
            min_length=target_length - 5,
            num_beams=4,
            temperature=0.7,
            no_repeat_ngram_size=3,
            do_sample=True,  # Changed to True to be compatible with temperature
            early_stopping=False,
            length_penalty=1.0
        )

        generated_text = tokenizer.decode(output[0], skip_special_tokens=True)
        logger.info(f"Generated text: {generated_text[:500]}")  # Log the first 500 characters of the generated text
        return generated_text
    except Exception as e:
        logger.error(f"Error in generate function: {str(e)}")
        raise

advantages_prompt = """List exactly 2 key advantages of the document. Focus on the positive aspects of the content. Format as bullet points:
- First advantage (max 20 words)
- Second advantage (max 20 words)
Focus only on the main benefits."""

disadvantages_prompt = """List exactly 2 key disadvantages of the document. Focus on the negative aspects or limitations of the content. Format as bullet points:
- First disadvantage (max 20 words)
- Second disadvantage (max 20 words)
Focus only on the main limitations."""

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

def get_relevant_context(question, context, max_sentences=5):
    try:
        if not context or not isinstance(context, str) or len(context.strip()) == 0:
            logger.error("Context is empty or invalid.")
            return ""
        sentences = sent_tokenize(context)
        logger.info(f"Tokenized {len(sentences)} sentences from the context.")
        if not sentences:
            logger.error("No sentences found in context.")
            return context[:500]  # fallback to first 500 chars
        question_words = set(question.lower().split())
        relevant_sentences = [
            s for s in sentences if any(word in s.lower() for word in question_words)
        ]
        logger.info(f"Found {len(relevant_sentences)} relevant sentences.")
        if not relevant_sentences:
            logger.warning("No relevant sentences found; using the first few sentences as context.")
            relevant_sentences = sentences[:max_sentences]
        return " ".join(relevant_sentences[:max_sentences])
    except Exception as e:
        logger.error(f"Error in get_relevant_context: {str(e)}")
        return context[:500]  # fallback to first 500 chars

def clean_and_extend_answer(ans, question, source):
    ans = re.sub(r"[^\\w\\s.,;:!?()\\[\\]\"'-]", "", ans)
    ans = ans.strip()
    sentences = re.split(r'(?<=[.!?]) +', ans)
    if len(sentences) < 2:
        sentences.append("This answer is based on the provided document context.")
    if any(word in question.lower() for word in ["citation", "reference", "cite"]):
        sentences.append(f"Source: {source}")
    sentences = [s for s in sentences if len(s.split()) > 2]
    return " ".join(sentences)


@app.route('/')
def home():
    return jsonify({"status": "active", "model": "FLAN-T5", "endpoints": ["/upload","/generate_signed_url", "/summarize","/ask"]})

@app.route("/generate_signed_url", methods=["GET"])
def generate_signed_url():
    public_id = request.args.get("public_id")
    if not public_id:
        return jsonify({"error": "public_id is required"}), 400

    try:
        signed_url = cloudinary.utils.cloudinary_url(public_id, sign_url=True)[0]
        return jsonify({"signed_url": signed_url})
    except Exception as e:
        logger.error(f"Error generating signed URL: {e}")
        return jsonify({"error": "An error occurred while generating signed URL"}), 500

@app.route("/upload", methods=["POST"])
def upload_file():
    file = request.files.get("file")
    if not file or file.filename == "":
        logger.warning("No file provided in upload request")
        return jsonify({"error": "No valid file uploaded"}), 400

    try:
        filename = secure_filename(file.filename)
        response = cloudinary.uploader.upload(
            file,
            public_id=filename,
            folder="Gistify",
            resource_type="raw",  # Or "document" - try "raw" first for PDFs
            format="pdf",          # Explicitly set the format
            access_mode="public",
        )
        cloudinary_url = response.get("secure_url")
        if not cloudinary_url:
            logger.error("Failed to retrieve Cloudinary URL")
            return jsonify({"error": "Failed to upload file to Cloudinary"}), 500

        text = get_text_from_pdf_from_url(cloudinary_url)
        if "Error" in text:
            return jsonify({"error": text}), 500

        doc_id = str(uuid.uuid4())
        collection.add(
            ids=[doc_id],
            documents=[text],
            metadatas=[{"source": filename, "cloudinary_url": cloudinary_url}]
        )

        return jsonify({
            "message": "File uploaded to Cloudinary",
            "sample": text[:250],
            "source": filename,
            "cloudinary_url": cloudinary_url,
            "doc_id": doc_id,
            "file": {
                "filePath": cloudinary_url,
                "id": doc_id,
                "pdfName": filename
            }
        })
    except Exception as e:
        logger.error(f"Upload error: {e}")
        return jsonify({"error": "An error occurred during upload"}), 500

@app.route("/summarize", methods=["POST"])

def summarize():
    if("summary_type" in request.json and request.json["summary_type"] == "summary_concise"):
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
        if not full_text or len(full_text.strip()) == 0:
            logger.error(f"Document with doc_id {doc_id} has empty or invalid text")
            return jsonify({"error": "Document text is empty or invalid"}), 400

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
    elif("summary_type" in request.json and request.json["summary_type"] == "summary_analytical"):
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
        if not full_text or len(full_text.strip()) == 0:
            logger.error(f"Document with doc_id {doc_id} has empty or invalid text")
            return jsonify({"error": "Document text is empty or invalid"}), 400

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
    elif("summary_type" in request.json and request.json["summary_type"] == "summary_comprehensive"):
        data = request.get_json()
        doc_id = data.get("doc_id")
        if not doc_id:
            return jsonify({"error": "doc_id is required"}), 400

        # Retrieve document from ChromaDB using its ID
        result = collection.get(ids=[doc_id])
        if not result['documents']:
            return jsonify({"error": "Document not found"}), 404

        full_text = result['documents'][0]
        if not full_text or len(full_text.strip()) == 0:
            logger.error(f"Document with doc_id {doc_id} has empty or invalid text")
            return jsonify({"error": "Document text is empty or invalid"}), 400

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
    else:
        return jsonify({"error": "Invalid summary type"}), 400

@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json()
    question = data.get("question")
    doc_id = data.get("doc_id")
    if not question or not doc_id:
        logger.error("Both question and doc_id are required")
        return jsonify({"error": "Both question and doc_id are required"}), 400

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
    if not full_text or len(full_text.strip()) == 0:
        logger.error(f"Document with doc_id {doc_id} has empty or invalid text")
        return jsonify({"error": "Document text is empty or invalid"}), 400

    # Extract relevant context
    try:
        logger.info("Extracting relevant context...")
        context = get_relevant_context(question, full_text, max_sentences=5)
        if not context or len(context.strip()) == 0:
            logger.warning("No context could be extracted from the document. Returning first 500 characters as context.")
            context = full_text[:500]  # fallback to first 500 chars of the document
            if not context or len(context.strip()) == 0:
                return jsonify({"error": "Document does not contain extractable context."}), 400
        logger.info(f"Extracted context: {context[:500]}")  # Log the first 500 characters of the context
    except Exception as e:
        logger.error(f"Error extracting relevant context: {str(e)}")
        return jsonify({"error": "Failed to extract relevant context"}), 500

    # Generate answer
    try:
        logger.info("Generating answer...")
        prompt = f"Answer the question:\nQuestion: {question}\nContext: {context}"
        inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=1024)
        output = model.generate(
            inputs.input_ids,
            max_length=150,
            num_beams=2,
            temperature=0.7,
            do_sample=True,
            early_stopping=True
        )
        answer = tokenizer.decode(output[0], skip_special_tokens=True)
        logger.info(f"Generated answer: {answer}")
    except Exception as e:
        logger.error(f"Error generating answer: {str(e)}")
        return jsonify({"error": "Failed to generate answer"}), 500

    # Clean and extend the answer
    try:
        logger.info("Cleaning and extending the answer...")
        answer = clean_and_extend_answer(answer, question, result['metadatas'][0].get("source", "Unknown"))
        logger.info(f"Final answer: {answer}")
    except Exception as e:
        logger.error(f"Error cleaning and extending the answer: {str(e)}")
        return jsonify({"error": "Failed to clean and extend the answer"}), 500

    # Return the generated answer and metadata
    return jsonify({
        "answer": answer,
        "context_used": len(context),
        "source": result['metadatas'][0].get("source", "Unknown")
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)