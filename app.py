from flask import Flask, request, jsonify
from flask_cors import CORS
import os, uuid, logging, re
from transformers import T5Tokenizer, T5ForConditionalGeneration
import chromadb
from chromadb.config import Settings
from PyPDF2 import PdfReader
from werkzeug.utils import secure_filename
from chromadb import PersistentClient
from pymongo import MongoClient
from datetime import datetime
import cloudinary
import cloudinary.uploader
import cloudinary.api
import requests
from io import BytesIO
from dotenv import load_dotenv
import cloudinary.utils  # <-- Add this import

app = Flask(__name__)
CORS(app)

# Load environment variables
load_dotenv()

# Configure Cloudinary with your credentials
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", "dpimerw8h"),
    api_key=os.getenv("CLOUDINARY_API_KEY", "495726973616313"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", "cPM0j222fiNUVb1rHXuugZ2AZ-A")
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/gistifyDB")
client = MongoClient(MONGO_URI)
db = client["gistifyDB"]
summaries_collection = db["summaries"]

# ChromaDB connection
chroma_client = PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="research_papers")

# Load model and tokenizer
tokenizer = T5Tokenizer.from_pretrained("google/flan-t5-base", legacy=False)
model = T5ForConditionalGeneration.from_pretrained("google/flan-t5-base", device_map="auto")

# Utility functions
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
        logger.error(f"PDF extraction error: {e}")
        return f"Error extracting text: {str(e)}"

def get_text_from_pdf_from_url(url):
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        pdf_file = BytesIO(response.content)
        reader = PdfReader(pdf_file)
        text = "\n".join([page.extract_text() or "" for page in reader.pages])
        return text.strip() if text else "Error: No text extracted."
    except Exception as e:
        logger.error(f"Error extracting text from URL: {e}")
        return f"Error extracting text from URL: {str(e)}"

@app.route('/')
def home():
    return jsonify({"status": "active", "model": "FLAN-T5", "endpoints": ["/upload", "/summarize", "/ask", "/generate_signed_url"]})

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
    data = request.get_json()
    doc_id = data.get("doc_id")
    file_path = data.get("file_path")  # Get the file_path
    summary_type = data.get("summary_type")
    file_name = data.get("file_name")

    print()

    logger.info(f"Received /summarize request with: doc_id='{doc_id}', file_path='{file_path}', summary_type='{summary_type}', file_name='{file_name}'")

    if not summary_type:
        logger.warning("summary_type is missing in the request.")
        return jsonify({"error": "summary_type is required"}), 400

    if file_path:
        logger.info(f"Processing file_path: {file_path}")
        try:
            # Extract text from PDF using the file_path (Cloudinary URL)
            text = get_text_from_pdf_from_url(file_path)
            logger.info(f"Text extraction result (first 100 chars): '{text[:100]}...'")
            if "Error" in text:
                logger.error(f"Error during text extraction: {text}")
                return jsonify({"error": text}), 500

            # Generate a unique doc_id for this summarization
            new_doc_id = str(uuid.uuid4())
            logger.info(f"Generated new doc_id: {new_doc_id}")

            # Add the text to ChromaDB
            collection.add(
                ids=[new_doc_id],
                documents=[text],
                metadatas=[{"source": file_name, "cloudinary_url": file_path}]
            )
            logger.info(f"Added document to ChromaDB with id: {new_doc_id}")

            # Now perform summarization using the new_doc_id
            result = collection.get(ids=[new_doc_id])
            logger.info(f"Retrieved document from ChromaDB: {result}")
            if not result['documents']:
                logger.error(f"Failed to retrieve document from ChromaDB after adding for id: {new_doc_id}")
                return jsonify({"error": "Failed to retrieve document from ChromaDB after adding"}), 500
            full_text = result['documents'][0]
            metadata = result['metadatas'][0]
            cloudinary_url = metadata.get("cloudinary_url", "")
            source_file_name = metadata.get("source", "Unknown")
            logger.info(f"Retrieved full_text (first 100 chars): '{full_text[:100]}...', metadata: {metadata}")

            def generate(text, task):
                input_text = f"{task}:\n{text[:5000]}"
                logger.info(f"Generating '{task}' summary with input (first 100 chars): '{input_text[:100]}...'")
                inputs = tokenizer(input_text, return_tensors="pt", truncation=True, max_length=1024)
                # Move inputs to the same device as model
                inputs = {k: v.to(model.device) for k, v in inputs.items()}
                output = model.generate(**inputs, max_length=500, num_beams=4, temperature=0.7)
                decoded_output = tokenizer.decode(output[0], skip_special_tokens=True)
                logger.info(f"Generated '{task}' summary (first 100 chars): '{decoded_output[:100]}...'")
                return decoded_output

            summary = generate(full_text, f"Summarize this in a {summary_type} way")
            advantages = generate(full_text, "List advantages")
            disadvantages = generate(full_text, "List disadvantages")

            summary_data = {
                "doc_id": new_doc_id,
                "source": source_file_name,
                "cloudinary_url": cloudinary_url,
                "summary": summary,
                "advantages": advantages,
                "disadvantages": disadvantages,
                "timestamp": datetime.utcnow()
            }
            summaries_collection.insert_one(summary_data)
            logger.info(f"Summary saved to MongoDB for doc_id: {new_doc_id}")

            return jsonify({
                "summary": summary,
                "advantages": advantages,
                "disadvantages": disadvantages,
                "source": source_file_name,
                "cloudinary_url": cloudinary_url
            })  # Explicit return after processing file_path

        except Exception as e:
            logger.error(f"An unexpected error occurred while processing file_path: {e}", exc_info=True)
            return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

    elif not doc_id:
        logger.warning("Neither doc_id nor file_path was provided.")
        return jsonify({"error": "Either doc_id or file_path is required"}), 400
    else:
        logger.info(f"Processing doc_id: {doc_id}")
        try:
            # If doc_id is provided (e.g., for direct text input handled earlier)
            result = collection.get(ids=[doc_id])
            logger.info(f"Retrieved document from ChromaDB for doc_id '{doc_id}': {result}")
            if not result['documents']:
                logger.error(f"Document not found in ChromaDB for doc_id: {doc_id}")
                return jsonify({"error": "Document not found"}), 404
            full_text = result['documents'][0]
            metadata = result['metadatas'][0]
            cloudinary_url = metadata.get("cloudinary_url", "")
            file_name = metadata.get("source", "Unknown")
            logger.info(f"Retrieved full_text (first 100 chars): '{full_text[:100]}...', metadata: {metadata}")

            def generate(text, task):
                input_text = f"{task}:\n{text[:5000]}"
                logger.info(f"Generating '{task}' summary with input (first 100 chars): '{input_text[:100]}...'")
                inputs = tokenizer(input_text, return_tensors="pt", truncation=True, max_length=1024)
                output = model.generate(inputs.input_ids, max_length=500, num_beams=4, temperature=0.7)
                logger.info(f"Input device: {inputs['input_ids'].device}")
                decoded_output = tokenizer.decode(output[0], skip_special_tokens=True)
                logger.info(f"Generated '{task}' summary (first 100 chars): '{decoded_output[:100]}...'")
                return decoded_output

            summary = generate(full_text, f"Summarize this in a {summary_type} way")
            advantages = generate(full_text, "List advantages")
            disadvantages = generate(full_text, "List disadvantages")

            summary_data = {
                "doc_id": doc_id,
                "source": file_name,
                "cloudinary_url": cloudinary_url,
                "summary": summary,
                "advantages": advantages,
                "disadvantages": disadvantages,
                "timestamp": datetime.utcnow()
            }
            summaries_collection.insert_one(summary_data)
            logger.info(f"Summary saved to MongoDB for doc_id: {doc_id}")

            return jsonify({
                "summary": summary,
                "advantages": advantages,
                "disadvantages": disadvantages,
                "source": file_name,
                "cloudinary_url": cloudinary_url
            })

        except Exception as e:
            logger.error(f"An unexpected error occurred while processing doc_id '{doc_id}': {e}", exc_info=True)
            return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

@app.route("/ask", methods=["POST"])
def ask():
    # ... (rest of your ask route with potential logging if needed)
    pass

if __name__ == "__main__":
    logger.info(f"Model device: {model.device}")
    app.run(host="0.0.0.0", port=5001)