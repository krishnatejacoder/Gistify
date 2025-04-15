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
            resource_type="raw",
            format="pdf",
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
            "doc_id": doc_id
        })
    except Exception as e:
        logger.error(f"Upload error: {e}")
        return jsonify({"error": "An error occurred during upload"}), 500

@app.route("/summarize", methods=["POST"])
def summarize():
    data = request.get_json()
    doc_id = data.get("doc_id")
    if not doc_id:
        return jsonify({"error": "doc_id is required"}), 400

    try:
        result = collection.get(ids=[doc_id])
        if not result['documents']:
            return jsonify({"error": "Document not found"}), 404

        full_text = result['documents'][0]
        metadata = result['metadatas'][0]
        cloudinary_url = metadata.get("cloudinary_url", "")

        def generate(text, task):
            input_text = f"{task}:\n{text[:5000]}"
            inputs = tokenizer(input_text, return_tensors="pt", truncation=True, max_length=1024)
            output = model.generate(inputs.input_ids, max_length=500, num_beams=4, temperature=0.7)
            return tokenizer.decode(output[0], skip_special_tokens=True)

        summary = generate(full_text, "Summarize this")
        advantages = generate(full_text, "List advantages")
        disadvantages = generate(full_text, "List disadvantages")

        summary_data = {
            "doc_id": doc_id,
            "source": metadata.get("source", "Unknown"),
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
            "source": metadata.get("source", "Unknown"),
            "cloudinary_url": cloudinary_url
        })
    except Exception as e:
        logger.error(f"Summarization error: {e}")
        return jsonify({"error": "An error occurred during summarization"}), 500

@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json()
    question = data.get("question")
    doc_id = data.get("doc_id")
    if not question or not doc_id:
        return jsonify({"error": "Both question and doc_id are required"}), 400

    try:
        result = collection.get(ids=[doc_id])
        if not result['documents']:
            return jsonify({"error": "Document not found"}), 404

        context = result['documents'][0]
        prompt = f"Answer the question:\nQuestion: {question}\nContext: {context[:5000]}"
        inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=1024)
        output = model.generate(inputs.input_ids, max_length=200, num_beams=4, temperature=0.7)
        answer = tokenizer.decode(output[0], skip_special_tokens=True)

        return jsonify({
            "answer": answer,
            "context_used": len(context),
            "source": result['metadatas'][0].get("source", "Unknown")
        })
    except Exception as e:
        logger.error(f"Question answering error: {e}")
        return jsonify({"error": "An error occurred while answering the question"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
