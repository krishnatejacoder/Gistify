from flask import Flask, request, jsonify
import json
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
import cloudinary.utils
from docx import Document

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
summaries_collection = db["Summary"]

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

def get_text_from_docx_from_url(url):
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        docx_file = BytesIO(response.content)
        doc = Document(docx_file)
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text.strip() if text else "Error: No text extracted."
    except Exception as e:
        logger.error(f"DOCX extraction error from URL: {e}")
        return f"Error extracting text from DOCX: {str(e)}"

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
    text = request.form.get("text")  # Handle text input
    selectedUploadOption = int(request.form.get("selectedUploadOption", 0))

    try:
        if selectedUploadOption == 0:  # File upload (PDF/DOCX)
            if not file or file.filename == "":
                logger.warning("No file provided in upload request")
                return jsonify({"error": "No valid file uploaded"}), 400

            filename = secure_filename(file.filename)
            resource_type = "raw"
            format_type = "pdf" if filename.lower().endswith(".pdf") else "docx" if filename.lower().endswith(".docx") else "raw"

            response = cloudinary.uploader.upload(
                file,
                public_id=filename,
                folder="Gistify",
                resource_type=resource_type,
                format=format_type,
                access_mode="public",
            )
            cloudinary_url = response.get("secure_url")
            if not cloudinary_url:
                logger.error("Failed to retrieve Cloudinary URL")
                return jsonify({"error": "Failed to upload file to Cloudinary"}), 500

            # Extract text based on file type
            text = get_text_from_pdf_from_url(cloudinary_url) if filename.lower().endswith(".pdf") else get_text_from_docx_from_url(cloudinary_url)
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
        else:  # Text upload
            if not text or not text.strip():
                logger.warning("No text provided in upload request")
                return jsonify({"error": "No valid text provided"}), 400

            filename = request.form.get("title", "text-upload.txt")
            text_content = text.strip()
            response = cloudinary.uploader.upload(
                text_content,
                public_id=filename,
                folder="Gistify",
                resource_type="raw",
                format="txt",
                access_mode="public",
            )
            cloudinary_url = response.get("secure_url")
            if not cloudinary_url:
                logger.error("Failed to retrieve Cloudinary URL for text")
                return jsonify({"error": "Failed to upload text to Cloudinary"}), 500

            doc_id = str(uuid.uuid4())
            collection.add(
                ids=[doc_id],
                documents=[text_content],
                metadatas=[{"source": filename, "cloudinary_url": cloudinary_url}]
            )

            return jsonify({
                "message": "Text uploaded to Cloudinary",
                "sample": text_content[:250],
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
    # Handle multipart/form-data instead of application/json
    doc_id = request.form.get("doc_id")
    file_path = request.form.get("file_path")
    summary_type = request.form.get("summary_type")
    file_name = request.form.get("file_name")
    user_id = request.form.get("userId")

    logger.info("Hai")
    logger.info(f"Received /summarize request with: doc_id='{doc_id}', file_path='{file_path}', summary_type='{summary_type}', file_name='{file_name}', user_id='{user_id}'")

    if not summary_type:
        logger.warning("summary_type is missing in the request.")
        return jsonify({"error": "summary_type is required"}), 400

    if file_path:
        logger.info(f"Processing file_path: {file_path}")
        try:
            # Extract text based on file type (assuming file_path is a Cloudinary URL)
            if file_path.lower().endswith(".pdf"):
                text = get_text_from_pdf_from_url(file_path)
            elif file_path.lower().endswith(".docx"):
                text = get_text_from_docx_from_url(file_path)
            elif file_path.lower().endswith(".txt"):
                text = requests.get(file_path).text  # Simple text extraction for .txt
            else:
                return jsonify({"error": "Unsupported file type"}), 400

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
                metadatas=[{"source": doc_id, "cloudinary_url": file_path}]
            )
            logger.info(f"Added document to ChromaDB with id: {new_doc_id}")

            # Perform summarization using the new_doc_id
            result = collection.get(ids=[new_doc_id])
            logger.info(f"Retrieved document from ChromaDB: {result}")
            if not result['documents']:
                logger.error(f"Failed to retrieve document from ChromaDB after adding for id: {new_doc_id}")
                return jsonify({"error": "Failed to retrieve document from ChromaDB after adding"}), 500
            full_text = result['documents'][0]
            metadata = result['metadatas'][0]
            cloudinary_url = metadata.get("cloudinary_url", "")
            source_file_id = metadata.get("source", "Unknown")
            logger.info(f"Retrieved full_text (first 100 chars): '{full_text[:100]}...', metadata: {metadata}")

            def generate(text, task):
                input_text = f"{task}:\n{text[:1024]}"
                logger.info(f"Generating '{task}' summary with input (first 100 chars): '{input_text[:100]}...'")
                inputs = tokenizer(input_text, return_tensors="pt", truncation=True, max_length=1024)
                inputs = {k: v.to(model.device) for k, v in inputs.items()}
                output = model.generate(**inputs, max_length=500, num_beams=4, temperature=0.7)
                decoded_output = tokenizer.decode(output[0], skip_special_tokens=True)
                logger.info(f"Generated '{task}' summary (first 100 chars): '{decoded_output[:100]}...'")
                return decoded_output

            summary = generate(full_text, f"Summarize this in a {summary_type} way")
            advantages = generate(full_text, "List advantages")
            disadvantages = generate(full_text, "List disadvantages")

            summary_data = {
                "user_id": user_id,
                "file_id": source_file_id,
                "fileUrl": cloudinary_url,
                "summary": summary,
                "advantages": advantages,
                "disadvantages": disadvantages,
                "chromaId": new_doc_id,
                "summaryType": summary_type,
            }
            result = summaries_collection.insert_one(summary_data)
            logger.info(f"Summary saved to MongoDB for doc_id: {new_doc_id}")
            logger.info(f"Result: {result}")

            return jsonify({
                "summaryId": str(result.inserted_id),
                "chromaId": str(new_doc_id),
                "summary": summary,
                "advantages": advantages,
                "disadvantages": disadvantages,
                "fileUrl": cloudinary_url,
            })

        except Exception as e:
            logger.error(f"An unexpected error occurred while processing file_path: {e}", exc_info=True)
            return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

    elif not doc_id:
        logger.warning("Neither doc_id nor file_path was provided.")
        return jsonify({"error": "Either doc_id or file_path is required"}), 400
    else:
        logger.info(f"Processing doc_id: {doc_id}")
        try:
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
                input_text = f"{task}:\n{text[:1024]}"
                logger.info(f"Generating '{task}' summary with input (first 100 chars): '{input_text[:100]}...'")
                inputs = tokenizer(input_text, return_tensors="pt", truncation=True, max_length=1024)
                inputs = {k: v.to(model.device) for k, v in inputs.items()}
                output = model.generate(**inputs, max_length=500, num_beams=4, temperature=0.7)
                decoded_output = tokenizer.decode(output[0], skip_special_tokens=True)
                logger.info(f"Generated '{task}' summary (first 100 chars): '{decoded_output[:100]}...'")
                return decoded_output

            summary = generate(full_text, f"Summarize this in a {summary_type} way")
            advantages = generate(full_text, "List advantages")
            disadvantages = generate(full_text, "List disadvantages")

            summary_data = {
                "user_id": user_id,
                "file_id": file_name,
                "fileUrl": cloudinary_url,
                "summary": summary,
                "advantages": advantages,
                "disadvantages": disadvantages,
                "chromaId": doc_id,
                "summaryType": summary_type,
            }
            result = summaries_collection.insert_one(summary_data)
            logger.info(f"Summary saved to MongoDB for doc_id: {doc_id}")
            logger.info(f"result: {result}")

            return jsonify({
                "summaryId": str(result.inserted_id),
                "chromaId": doc_id,
                "summary": summary,
                "advantages": advantages,
                "disadvantages": disadvantages,
                "fileUrl": cloudinary_url,
            })

        except Exception as e:
            logger.error(f"An unexpected error occurred while processing doc_id '{doc_id}': {e}", exc_info=True)
            return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json()
    question = data.get("question")
    doc_id = data.get("doc_id")
    logger.info(doc_id)
    logger.info(question)
    if not question or not doc_id:
        return jsonify({"error": "Both question and doc_id are required"}), 400

    result = collection.get(ids=[doc_id])
    if not result['documents']:
        return jsonify({"error": "Document not found"}), 404

    context = result['documents'][0]
    prompt = f"Answer the question:\nQuestion: {question}\nContext: {context[:1024]}"
    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=1024)
    device = model.device
    inputs = {k: v.to(device) for k, v in inputs.items()}
    output = model.generate(**inputs, max_length=200, num_beams=4, temperature=0.7)
    answer = tokenizer.decode(output[0], skip_special_tokens=True)

    return jsonify({
        "answer": answer,
        "context_used": len(context),
        "source": result['metadatas'][0].get("source", "Unknown")
    })

if __name__ == "__main__":
    logger.info(f"Model device: {model.device}")
    app.run(host="0.0.0.0", port=5001)