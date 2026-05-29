import os
import threading
import webbrowser
import uuid
import sqlite3
from flask import Flask, render_template, request, jsonify, Response, stream_with_context
from waitress import serve
from llama_cpp import Llama
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
import chromadb
from huggingface_hub import hf_hub_download
from flask import stream_with_context 
import sys
import docx 
from flashrank import Ranker, RerankRequest

import requests
import time
import json

# Add this at the very top
from openai import OpenAI
# app = Flask(__name__)


# --- Fix for PyInstaller (Finds templates inside the exe) ---
if getattr(sys, 'frozen', False):
    # We are running in a bundle (The .exe)
    base_dir = sys._MEIPASS
    template_folder = os.path.join(base_dir, 'templates')
    static_folder = os.path.join(base_dir, 'static')
    app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)
else:
    # We are running in a normal Python environment
    app = Flask(__name__)

# --- Configuration ---
UPLOAD_FOLDER = './uploads'
MODELS_FOLDER = './models' # Dynamic model loading
DB_PATH = "./db"
CHAT_DB = "chat_history.db"


# This is our curated list of recommended models.
# We specify the Hugging Face repo, the filename, and a short description.
# In app.py

RECOMMENDED_MODELS = {
    # CORRECTED FILENAME
    "tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf": { 
        "repo": "TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF",
        "description": "Very small and fast, good for simple chats.",
        "size": "0.6 GB"
    },
    # CORRECTED FILENAME
    "phi-2.Q4_K_M.gguf": {
        "repo": "TheBloke/phi-2-GGUF",
        "description": "Microsoft's Phi-2. Great balance of speed and logic.",
        "size": "1.6 GB"
    },
    # This one was correct
    "Phi-3-mini-4k-instruct-q4.gguf": {
        "repo": "microsoft/Phi-3-mini-4k-instruct-gguf",
        "description": "New model from Microsoft. Excellent performance for its size.",
        "size": "2.2 GB"
    },
    # VERIFIED AND CORRECTED FILENAME
    "qwen2-1_5b-instruct-q4_k_m.gguf": { 
        "repo": "Qwen/Qwen2-1.5B-Instruct-GGUF",
        "description": "Alibaba's Qwen 2. A strong, modern small model.",
        "size": "1.1 GB"
    },

    # ADD THIS NEW ONE (Best balance of speed/accuracy right now)
    "Llama-3-8B-Instruct-Q4_K_M.gguf": { 
        "repo": "bartowski/Meta-Llama-3-8B-Instruct-GGUF",
        "description": "Meta's Llama 3. Extremely smart and accurate. (4.9 GB)",
        "size": "4.9 GB"
    },
    
    # OR THIS ONE (Very popular, uncensored, smart)
    "Mistral-7B-Instruct-v0.3.Q4_K_M.gguf": {
        "repo": "MaziyarPanahi/Mistral-7B-Instruct-v0.3-GGUF",
        "description": "Mistral 7B. High reasoning capability. (4.3 GB)",
        "size": "4.3 GB"
    }
}


# Set these environment variables to force offline mode
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["ANONYMIZED_TELEMETRY"] = "False"  # <--- Disables ChromaDB internet tracking


os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(MODELS_FOLDER, exist_ok=True)
os.makedirs(DB_PATH, exist_ok=True)

# --- Global State ---
# llm is now a dictionary to hold the loaded model and its name
llm_state = {"model": None, "name": None}

# embedder = SentenceTransformer('all-MiniLM-L6-v2')
# --- Initialize AI Components ---
print("1. Loading Embedding Model (Offline)...")

# Path to the folder we just downloaded
EMBEDDING_MODEL_PATH = "./models/all-MiniLM-L6-v2"

# Check if the folder exists to avoid crashing
if os.path.exists(EMBEDDING_MODEL_PATH):
    # Load directly from the local folder
    embedder = SentenceTransformer(EMBEDDING_MODEL_PATH)
    print("   Offline embedding model loaded successfully!")
else:
    print("   ERROR: Embedding model not found in ./models/")
    print("   Please run 'python download_embedder.py' first!")
    embedder = None
chroma_client = chromadb.PersistentClient(path=DB_PATH)
collection = chroma_client.get_or_create_collection(name="knowledge_vault")


print("Loading FlashRank Re-ranker...")
ranker = Ranker(model_name="ms-marco-MiniLM-L-12-v2", cache_dir="./models")

# --- Helper Functions ---
def get_db_connection():
    conn = sqlite3.connect(CHAT_DB)
    conn.row_factory = sqlite3.Row
    return conn

def load_llm(model_name):
    """Unloads any existing model and loads a new one."""
    if llm_state["model"] is not None:
        # This is a simplification. Llama.cpp objects don't have a formal "unload" method.
        # Reassigning to None allows Python's garbage collector to free the memory.
        llm_state["model"] = None
        print(f"Unloaded model: {llm_state['name']}")

    model_path = os.path.join(MODELS_FOLDER, model_name)
    if os.path.exists(model_path):
        try:
            print(f"Loading model: {model_name}...")
            llm_state["model"] = Llama(model_path=model_path, n_ctx=2048, verbose=False)
            llm_state["name"] = model_name
            print("Model loaded successfully!")
            return True
        except Exception as e:
            print(f"Error loading model {model_name}: {e}")
            llm_state["model"] = None
            llm_state["name"] = None
            return False
    else:
        print(f"Model file not found: {model_path}")
        return False



# --- Helper Function for Text Chunking ---
def recursive_character_text_splitter(text, chunk_size=1000, overlap=200):
    """
    Splits a long string into smaller overlapping chunks.
    
    Args:
        text: The full string to split.
        chunk_size: How many characters per chunk (default 1000).
        overlap: How many characters to repeat between chunks (default 200).
                 This helps the AI understand context across cuts.
    """
    chunks = []
    start = 0
    text_len = len(text)

    while start < text_len:
        end = start + chunk_size
        
        # If we are near the end, just take the rest
        if end >= text_len:
            chunks.append(text[start:])
            break
            
        # Standard chunk
        chunks.append(text[start:end])
        
        # Move forward, but step back by 'overlap' amount
        # This creates the sliding window effect
        start += (chunk_size - overlap)
        
    return chunks



def extract_text_from_docx(filepath):
    """Extracts text from a DOCX file."""
    doc = docx.Document(filepath)
    full_text = []
    for para in doc.paragraphs:
        full_text.append(para.text)
    return '\n'.join(full_text)

# --- API Routes ---

@app.route('/')
def home():
    return render_template('index.html')

# NEW: API to list available models
@app.route('/api/models', methods=['GET'])
def list_models():
    models = [f for f in os.listdir(MODELS_FOLDER) if f.endswith('.gguf')]
    return jsonify({
        "available_models": models,
        "loaded_model": llm_state["name"]
    })

# NEW: API to load a model
@app.route('/api/load_model', methods=['POST'])
def handle_load_model():
    data = request.json
    model_name = data.get('model_name')
    if not model_name:
        return jsonify({"success": False, "error": "No model name provided."}), 400
    
    success = load_llm(model_name)
    if success:
        return jsonify({"success": True, "message": f"Successfully loaded {model_name}."})
    else:
        return jsonify({"success": False, "error": f"Failed to load {model_name}."}), 500

# # MODIFIED: Chat route now checks the llm_state
# @app.route('/api/chat', methods=['POST'])
# def chat():
#     # ... (Most of this function remains the same, just the LLM check is updated)
#     if not llm_state["model"]:
#         return Response("Model not loaded. Please select a model from the settings.", status=503)

#     # ... (The rest of your chat, RAG, and database logic is identical) ...
#     data = request.json
#     user_query = data.get('message', '')
#     active_doc = data.get('active_document', None)

#     if not active_doc: return Response("No document selected.", status=400)

#     conn = get_db_connection()
#     conn.execute('INSERT INTO messages (document_name, sender, content) VALUES (?, ?, ?)', (active_doc, 'user', user_query))
#     conn.commit()
#     conn.close()
    
#     where_filter = {"source": active_doc}
#     results = collection.query(query_embeddings=embedder.encode([user_query]).tolist(), n_results=3, where=where_filter)
    
#     context_text, sources = "", []
#     if results['documents']:
#         for i, doc in enumerate(results['documents'][0]):
#             meta = results['metadatas'][0][i]
#             context_text += f"-- Page {meta['page']} from {meta['source']}: --\n{doc}\n\n"
#             sources.append(f"{meta['source']} (Pg {meta['page']})")

#     # system_prompt = "You are a helpful assistant. Use the Context below to answer the Question."
#     # We give the AI a persona and strict rules to follow.
#     system_prompt = """You are a highly intelligent and precise research assistant. 
# Your task is to answer the user's question based ONLY on the provided Context.

# Guidelines:
# 1. Be Comprehensive: Explain the answer in detail using the context.
# 2. Structure: Use bullet points, bold text, and clear headings.
# 3. Accuracy: If the answer is not in the context, explicitly say "I cannot find the answer in this document." Do not hallucinate.
# 4. Tone: Professional and academic."""
#     # prompt = f"{system_prompt}\n\nContext:\n{context_text}\n\nQuestion: {user_query}\nAnswer:"
  
#     prompt = f"System: {system_prompt}\n\nContext:\n{context_text}\n\nUser: {user_query}\nAssistant:"

#     def generate():
#         full_bot_response = ""
  
#         # for chunk in llm_state["model"](prompt, max_tokens=512, stop=["User:", "Question:"], stream=True):
#         for chunk in llm_state["model"](
#             prompt, 
#             max_tokens=1024,      # Allow longer answers
#             temperature=0.2,      # <--- LOWER THIS (0.1 to 0.3 is best for facts)
#             top_p=0.9,            # Focuses on high-probability words
#             repeat_penalty=1.1,   # Prevents it from repeating sentences
#             stop=["User:", "System:"], 
#             stream=True
#         ):  
#             text = chunk['choices'][0]['text']
#             full_bot_response += text
#             yield text
        
#         conn_save = get_db_connection()
#         conn_save.execute('INSERT INTO messages (document_name, sender, content) VALUES (?, ?, ?)',(active_doc, 'bot', full_bot_response.strip()))
#         conn_save.commit()
#         conn_save.close()
        
#         if sources:
#             unique_sources = list(set(sources))
#             yield f"\n\n*Sources: {', '.join(unique_sources)}*"

#     return Response(stream_with_context(generate()), mimetype='text/plain')




@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    user_query = data.get('message', '')
    active_doc = data.get('active_document', None)
    
    # --- NEW: Get Settings from Frontend ---
    use_online = data.get('use_online', False)
    api_key = data.get('api_key', '')
    temperature = float(data.get('temperature', 0.2)) # Default to your preference
    max_tokens = int(data.get('max_tokens', 1024))

    # NEW: Get advanced settings
    custom_system_prompt = data.get('system_prompt', "You are a helpful assistant.")
    n_results = int(data.get('n_results', 3))

    if not active_doc: 
        return Response("No document selected.", status=400)

    # 1. Save User Message to DB
    conn = get_db_connection()
    conn.execute('INSERT INTO messages (document_name, sender, content) VALUES (?, ?, ?)', 
                 (active_doc, 'user', user_query))
    conn.commit()
    conn.close()
    
    # 2. RAG Retrieval (Same for both Online & Offline)
    # where_filter = {"source": active_doc}
    # results = collection.query(
    #     query_embeddings=embedder.encode([user_query]).tolist(),
    #     n_results=3, 
    #     where=where_filter
    # )

    # UPDATE RAG QUERY
    results = collection.query(
        query_embeddings=embedder.encode([user_query]).tolist(),
        n_results=n_results, # <--- Use user preference
        where={"source": active_doc}
    )

    # context_text = ""
    # sources = []
    # if results['documents']:
    #     for i, doc in enumerate(results['documents'][0]):
    #         meta = results['metadatas'][0][i]
    #         context_text += f"-- Page {meta['page']} from {meta['source']}: --\n{doc}\n\n"
    #         sources.append(f"{meta['source']} (Pg {meta['page']})")

    context_text = ""
    sources = []
    
    if results['documents']:
        for i, doc in enumerate(results['documents'][0]):
            meta = results['metadatas'][0][i]
            
            # --- FIX: Handle missing 'page' key safely ---
            # If 'page' exists (PDF), use it. If not (DOCX), use 'chunk_index' or 'N/A'
            page_info = meta.get('page', f"Chunk {meta.get('chunk_index', '?')}")
            source_name = meta.get('source', 'Unknown File')
            
            context_text += f"-- Location: {page_info} from {source_name}: --\n{doc}\n\n"
            sources.append(f"{source_name} ({page_info})")
    # 3. System Prompt (Your optimized version)
#     system_prompt = """You are a highly intelligent and precise research assistant. 
# Your task is to answer the user's question based ONLY on the provided Context.

# Guidelines:
# 1. Be Comprehensive: Explain the answer in detail using the context.
# 2. Structure: Use bullet points, bold text, and clear headings.
# 3. Accuracy: If the answer is not in the context, explicitly say "I cannot find the answer in this document." Do not hallucinate.
# 4. Tone: Professional and academic."""

    # system_prompt = custom_system_prompt

    
    strict_rag_rule = """
    CRITICAL INSTRUCTION: You are a RAG (Retrieval Augmented Generation) AI. 
    You must answer the user's question based STRICTLY and ONLY on the provided Context text below.
    
    Rules:
    1. Do not use your outside knowledge or training data.
    2. If the answer is not found in the Context, say "I cannot find the answer in this document."
    3. Do not make up information.
    """
    
    # Combine them: User's Persona (Style) + Our Rule (Logic)
    final_system_prompt = f"{strict_rag_rule}\n\nUser Persona Instructions: {custom_system_prompt}"



    # --- BRANCH 1: ONLINE MODE (OpenAI) ---
    if use_online and api_key:
        print(f"--- Using Online Model (Temperature: {temperature}) ---")
        try:
            client = OpenAI(api_key=api_key)
            
            def generate_online():
                full_bot_response = ""
                # Stream from OpenAI
                stream = client.chat.completions.create(
                    model="gpt-3.5-turbo", # Or "gpt-4o" if you want to be fancy
                    messages=[
                        # {"role": "system", "content": system_prompt},
                        {"role": "system", "content": final_system_prompt}, 

                        {"role": "user", "content": f"Context:\n{context_text}\n\nQuestion: {user_query}"}
                    ],
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=True
                )
                
                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        text = chunk.choices[0].delta.content
                        full_bot_response += text
                        yield text
                
                # Save to DB
                conn_save = get_db_connection()
                conn_save.execute('INSERT INTO messages (document_name, sender, content) VALUES (?, ?, ?)',
                                  (active_doc, 'bot', full_bot_response.strip()))
                conn_save.commit()
                conn_save.close()

                if sources:
                    unique_sources = list(set(sources))
                    yield f"\n\n*Sources: {', '.join(unique_sources)}*"

            return Response(stream_with_context(generate_online()), mimetype='text/plain')

        except Exception as e:
            return Response(f"Error with Online API: {str(e)}", status=500)

    # --- BRANCH 2: OFFLINE MODE (Local Llama) ---
    else:
        # Check if local model is loaded
        if not llm_state["model"]:
            return Response("Local model not loaded. Please select a model settings.", status=503)

        print(f"--- Using Local Model (Temperature: {temperature}) ---")
        
        # Standard Alpaca/ChatML format for local models
        # prompt = f"System: {system_prompt}\n\nContext:\n{context_text}\n\nUser: {user_query}\nAssistant:"
        prompt = f"System: {final_system_prompt}\n\nContext:\n{context_text}\n\nUser: {user_query}\nAssistant:"
        def generate_local():
            full_bot_response = ""
            for chunk in llm_state["model"](
                prompt, 
                max_tokens=max_tokens, # Use frontend setting
                temperature=temperature, # Use frontend setting
                top_p=0.9,
                repeat_penalty=1.1,
                stop=["User:", "System:"], 
                stream=True
            ):
                text = chunk['choices'][0]['text']
                full_bot_response += text
                yield text
            
            # Save to DB
            conn_save = get_db_connection()
            conn_save.execute('INSERT INTO messages (document_name, sender, content) VALUES (?, ?, ?)',
                              (active_doc, 'bot', full_bot_response.strip()))
            conn_save.commit()
            conn_save.close()
            
            if sources:
                unique_sources = list(set(sources))
                yield f"\n\n*Sources: {', '.join(unique_sources)}*"

        return Response(stream_with_context(generate_local()), mimetype='text/plain')


# ... (Your other routes like /api/files, /api/upload, /api/history are unchanged) ...
# @app.route('/api/files', methods=['GET'])
# def list_files():
#     files = [f for f in os.listdir(UPLOAD_FOLDER) if f.endswith('.pdf')]
#     return jsonify(files)

@app.route('/api/files', methods=['GET'])
def list_files():
    """Returns a list of uploaded PDFs and DOCX files."""
    if not os.path.exists(UPLOAD_FOLDER):
        return jsonify([])
    
    # FIX: Check for both .pdf and .docx (case insensitive)
    files = [
        f for f in os.listdir(UPLOAD_FOLDER) 
        if f.lower().endswith(('.pdf', '.docx'))
    ]
    return jsonify(files)

# @app.route('/api/upload', methods=['POST'])
# def upload_file():
#     if 'file' not in request.files: return jsonify({"error": "No file part"}), 400
#     file = request.files[0]
#     if file.filename == '': return jsonify({"error": "No selected file"}), 400
#     if file:
#         filename = file.filename
#         filepath = os.path.join(UPLOAD_FOLDER, filename)
#         file.save(filepath)
#         reader = PdfReader(filepath)
#         text_chunks, metadatas, ids = [], [], []
#         for i, page in enumerate(reader.pages):
#             text = page.extract_text()
#             if text:
#                 text_chunks.append(text)
#                 metadatas.append({"source": filename, "page": i + 1})
#                 ids.append(str(uuid.uuid4()))
#         if text_chunks:
#             embeddings = embedder.encode(text_chunks).tolist()
#             collection.add(documents=text_chunks, embeddings=embeddings, metadatas=metadatas, ids=ids)
#             return jsonify({"message": f"Successfully learned {filename}!"})
#         return jsonify({"error": "Could not extract text from PDF."}), 500


# @app.route('/api/upload', methods=['POST'])
# def upload_file():
#     # 1. Check if the 'file' key exists
#     if 'file' not in request.files: 
#         return jsonify({"error": "No file part"}), 400
    
#     # 2. Get the file using the key 'file' (NOT [0])
#     file = request.files['file']
    
#     # 3. Check if a file was actually selected
#     if file.filename == '': 
#         return jsonify({"error": "No selected file"}), 400

#     if file:
#         filename = file.filename
#         filepath = os.path.join(UPLOAD_FOLDER, filename)
#         file.save(filepath)
        
#         # ... (Your logic continues here) ...
#         reader = PdfReader(filepath)
#         text_chunks, metadatas, ids = [], [], []
#         for i, page in enumerate(reader.pages):
#             text = page.extract_text()
#             if text:
#                 text_chunks.append(text)
#                 metadatas.append({"source": filename, "page": i + 1})
#                 ids.append(str(uuid.uuid4()))
        
#         if text_chunks:
#             embeddings = embedder.encode(text_chunks).tolist()
#             collection.add(documents=text_chunks, embeddings=embeddings, metadatas=metadatas, ids=ids)
#             return jsonify({"message": f"Successfully learned {filename}!"})
        
#         return jsonify({"error": "Could not extract text from PDF."}), 500
    


# @app.route('/api/upload', methods=['POST'])
# def upload_file():
#     # 1. Basic checks
#     if 'file' not in request.files:
#         return jsonify({"error": "No file part"}), 400
    
#     file = request.files['file']
    
#     if file.filename == '':
#         return jsonify({"error": "No selected file"}), 400

#     filename = file.filename

#     # --- FIX: Check for duplicates first ---
#     # We query the database to see if we already have chunks from this file
#     existing_docs = collection.get(where={"source": filename})
    
#     # If we found any IDs, it means the document is already in the vault
#     if existing_docs and len(existing_docs['ids']) > 0:
#         print(f"Duplicate upload attempt: {filename}")
#         return jsonify({"error": f"'{filename}' is already in your Knowledge Vault."}), 409

#     # 2. Save the file
#     filepath = os.path.join(UPLOAD_FOLDER, filename)
#     file.save(filepath)
#     print(f"Processing new file: {filename}")
    
#     # 3. Process PDF (Extract Text)
#     try:
#         reader = PdfReader(filepath)
#         text_chunks, metadatas, ids = [], [], []
        
#         for i, page in enumerate(reader.pages):
#             text = page.extract_text()
#             if text:
#                 text_chunks.append(text)
#                 metadatas.append({"source": filename, "page": i + 1})
#                 ids.append(str(uuid.uuid4()))
        
#         if text_chunks:
#             embeddings = embedder.encode(text_chunks).tolist()
#             collection.add(documents=text_chunks, embeddings=embeddings, metadatas=metadatas, ids=ids)
#             return jsonify({"message": f"Successfully learned {filename}!"})
#         else:
#             return jsonify({"error": "PDF seems empty or could not be read."}), 400

#     except Exception as e:
#         print(f"Error processing PDF: {e}")
#         return jsonify({"error": str(e)}), 500
    


@app.route('/api/upload', methods=['POST'])
def upload_file():
    # 1. Basic Checks
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    filename = file.filename
    file_ext = os.path.splitext(filename)[1].lower()

    # 2. Check Supported Formats
    if file_ext not in ['.pdf', '.docx']:
        return jsonify({"error": "Only PDF and DOCX files are supported."}), 400

    # 3. Check for Duplicates
    existing_docs = collection.get(where={"source": filename})
    if existing_docs and len(existing_docs['ids']) > 0:
        return jsonify({"error": f"'{filename}' is already in your Knowledge Vault."}), 409

    # 4. Save File
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    print(f"Processing: {filename}")

    try:
        full_text = ""
        
        # --- PARSE BASED ON FILE TYPE ---
        if file_ext == '.pdf':
            reader = PdfReader(filepath)
            for page in reader.pages:
                full_text += page.extract_text() + "\n"
        
        elif file_ext == '.docx':
            full_text = extract_text_from_docx(filepath)

        # 5. Check if text was found
        if not full_text.strip():
            return jsonify({"error": "File appears to be empty or unreadable."}), 400

        # 6. Chunking (Using the new Helper Function)
        text_chunks = recursive_character_text_splitter(full_text, chunk_size=1000, overlap=200)
        
        metadatas = []
        ids = []
        
        for i, chunk in enumerate(text_chunks):
            metadatas.append({"source": filename, "chunk_index": i})
            ids.append(str(uuid.uuid4()))

        # 7. Save to Database
        if text_chunks:
            embeddings = embedder.encode(text_chunks).tolist()
            collection.add(documents=text_chunks, embeddings=embeddings, metadatas=metadatas, ids=ids)
            return jsonify({"message": f"Successfully learned {filename}!"})
        
        return jsonify({"error": "Could not extract text chunks."}), 500
        
    except Exception as e:
        print(f"Error processing file: {e}")
        return jsonify({"error": str(e)}), 500
    

@app.route('/api/history/<filename>', methods=['GET'])
def get_history(filename):
    conn = get_db_connection()
    messages = conn.execute('SELECT sender, content FROM messages WHERE document_name = ? ORDER BY timestamp ASC', (filename,)).fetchall()
    conn.close()
    return jsonify([dict(msg) for msg in messages])


# --- Add these TWO new API routes to app.py ---

@app.route('/api/downloadable_models', methods=['GET'])
def get_downloadable_models():
    """Returns the curated list of models and their download status."""
    local_models = [f for f in os.listdir(MODELS_FOLDER) if f.endswith('.gguf')]
    
    model_list_with_status = []
    for filename, details in RECOMMENDED_MODELS.items():
        model_list_with_status.append({
            "name": filename,
            "repo": details["repo"],
            "description": details["description"],
            "size": details["size"],
            "is_downloaded": filename in local_models
        })
        
    return jsonify(model_list_with_status)


# @app.route('/api/download_model', methods=['POST'])
# # In app.py

# @app.route('/api/download_model', methods=['POST'])
# def download_model():
#     """Downloads a model from Hugging Face and returns a status."""
#     data = request.json
#     repo_id = data.get('repo')
#     filename = data.get('filename')

#     if not repo_id or not filename:
#         return jsonify({"success": False, "error": "Missing repo_id or filename"}), 400

#     try:
#         print(f"Starting download for {filename} from {repo_id}...")
        
#         hf_hub_download(
#             repo_id=repo_id,
#             filename=filename,
#             local_dir=MODELS_FOLDER,
#             local_dir_use_symlinks=False,
#             resume_download=True
#         )
        
#         print(f"Download function completed for {filename}.")
#         # Verify the file was actually created
#         if os.path.exists(os.path.join(MODELS_FOLDER, filename)):
#             print("File verified on disk.")
#             return jsonify({"success": True, "message": "Download successful!"})
#         else:
#             print("ERROR: hf_hub_download completed but file not found!")
#             return jsonify({"success": False, "error": "File not found after download."}), 500

#     except Exception as e:
#         error_message = str(e)
#         print(f"Download failed: {error_message}")
#         # Check for 404 specifically
#         if "Entry Not Found" in error_message or "404" in error_message:
#             return jsonify({"success": False, "error": "Model not found on Hugging Face (404)."}), 404
#         return jsonify({"success": False, "error": f"An error occurred: {error_message}"}), 500



@app.route('/api/download_model', methods=['POST'])
def download_model():
    data = request.json
    repo_id = data.get('repo')
    filename = data.get('filename')

    if not repo_id or not filename:
        return jsonify({"error": "Missing repo_id or filename"}), 400

    def generate_download():
        try:
            # Construct the direct download URL
            url = f"https://huggingface.co/{repo_id}/resolve/main/{filename}"
            print(f"Starting streaming download for: {filename}")
            
            # Start the request, stream=True allows us to download it in pieces
            response = requests.get(url, stream=True, allow_redirects=True)
            response.raise_for_status()
            
            # Get total file size from headers
            total_size = int(response.headers.get('content-length', 0))
            filepath = os.path.join(MODELS_FOLDER, filename)
            
            downloaded_size = 0
            start_time = time.time()
            last_yield_time = start_time

            # Open file and write chunks
            with open(filepath, 'wb') as f:
                # Download in 64KB chunks
                for chunk in response.iter_content(chunk_size=65536):
                    if chunk:
                        f.write(chunk)
                        downloaded_size += len(chunk)
                        current_time = time.time()

                        # Send progress to frontend every 0.5 seconds (prevents lag)
                        if current_time - last_yield_time > 0.5:
                            elapsed = current_time - start_time
                            speed = downloaded_size / elapsed if elapsed > 0 else 0
                            eta = (total_size - downloaded_size) / speed if speed > 0 else 0
                            percent = (downloaded_size / total_size) * 100 if total_size > 0 else 0

                            progress_data = {
                                "status": "downloading",
                                "downloaded": downloaded_size,
                                "total": total_size,
                                "speed": speed,
                                "eta": eta,
                                "percent": percent
                            }
                            # Yield data as a string ending with newline
                            yield f"{json.dumps(progress_data)}\n"
                            last_yield_time = current_time
            
            # Download completely finished
            yield f"{json.dumps({'status': 'complete'})}\n"
            
        except Exception as e:
            yield f"{json.dumps({'status': 'error', 'message': str(e)})}\n"

    # We return a streaming response instead of static JSON
    return Response(stream_with_context(generate_download()), mimetype='text/plain')

# In app.py

@app.route('/api/check_file/<filename>', methods=['GET'])
def check_file(filename):
    """Checks if a model file exists in the models folder."""
    file_path = os.path.join(MODELS_FOLDER, filename)
    return jsonify({"exists": os.path.exists(file_path)})


# --- NEW: Delete Document Route ---
@app.route('/api/delete/<filename>', methods=['DELETE'])
def delete_file(filename):
    """Deletes a file, its vector embeddings, and its chat history."""
    try:
        # 1. Delete the physical file
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
            print(f"Deleted file: {filename}")
        else:
            print(f"File not found: {filepath}")

        # 2. Delete from ChromaDB (Vector Store)
        # This prevents the AI from knowing about the document
        try:
            collection.delete(where={"source": filename})
            print(f"Deleted embeddings for: {filename}")
        except Exception as e:
            print(f"Error deleting from ChromaDB: {e}")

        # 3. Delete from SQLite (Chat History)
        conn = get_db_connection()
        conn.execute('DELETE FROM messages WHERE document_name = ?', (filename,))
        conn.commit()
        conn.close()
        print(f"Deleted chat history for: {filename}")

        return jsonify({"success": True, "message": f"Deleted {filename}"})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/favicon.ico')
def favicon():
    return '', 204

def open_browser():
    if not os.environ.get("WERKZEUG_RUN_MAIN"):
        webbrowser.open_new('http://127.0.0.1:5000/')

if __name__ == '__main__':
    # Automatically load the first model found on startup
    available_models = [f for f in os.listdir(MODELS_FOLDER) if f.endswith('.gguf')]
    if available_models:
        load_llm(available_models[0])
    else:
        print("WARNING: No models found in the 'models' folder. The chat will not work.")
        
    threading.Timer(1.5, open_browser).start()
    serve(app, host='0.0.0.0', port=5000, threads=8)