***

```markdown
# 🧠 Knowledge Vault AI

**Knowledge Vault AI** is a secure, offline-first desktop application designed to bring the power of Generative AI to personal document management without compromising data privacy. 

Built on a robust Python-Flask architecture, the system utilizes **Retrieval-Augmented Generation (RAG)** to transform static PDF and DOCX documents into an interactive knowledge base. All data processing—from vector embedding to AI inference—occurs entirely on your local machine, ensuring **zero data leakage**.

---

## ✨ Key Features

*   **🔒 100% Offline & Private:** Your documents never leave your computer. Inference is done locally using CPU/GPU optimized `.gguf` models.
*   **📄 Multi-Format Support:** Easily upload, parse, and chat with both `.pdf` and `.docx` files.
*   **🎯 High Accuracy (RAG):** Uses ChromaDB and Sentence-Transformers to retrieve exact context, preventing AI hallucinations. Includes source citations (e.g., *Page 3*) with every answer.
*   **🤖 Dynamic Model Manager:** Built-in downloader to browse, fetch, and switch between Open-Source LLMs (like Phi-2, Qwen2, TinyLlama) directly from Hugging Face.
*   **💬 Persistent Memory:** Automatically saves chat history for each document using SQLite.
*   **📝 One-Click Summarization:** Instantly generate comprehensive bullet-point summaries of your documents.
*   **⚙️ Hybrid Mode & Customization:** Switch to OpenAI (GPT-3.5/4) via API key if an internet connection is available. Adjust AI temperature, context depth, and system personas on the fly.
*   **🌗 Modern UI:** A responsive, Tailwind CSS-powered interface with Light and Dark mode support.

---

## 🛠️ Tech Stack

*   **Frontend:** HTML5, Vanilla JavaScript, Tailwind CSS, FontAwesome, Marked.js
*   **Backend:** Python, Flask, Waitress (Production Server)
*   **AI / Inference:** `llama-cpp-python` (C++ Port of Llama)
*   **Vector Database:** ChromaDB
*   **Relational Database:** SQLite (Chat History)
*   **NLP & Embeddings:** `sentence-transformers` (all-MiniLM-L6-v2), `pypdf`, `python-docx`

---

## 🚀 Installation & Setup

### 1. Prerequisites
*   **Python 3.10+** installed on your system.
*   A C++ compiler (optional, but recommended for faster `llama.cpp` installation).

### 2. Clone the Repository
```bash
git clone https://github.com/maniraj48/Knowledge_Vault_AI.git
cd Knowledge-Vault-AI
```

### 3. Create a Virtual Environment
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

### 5. Setup Offline Embeddings (Run Once)
To ensure the app works completely without the internet, run the embedding downloader script to cache the `all-MiniLM-L6-v2` model locally.
```bash
python download_embedder.py
```

### 6. Initialize the Database
Run the setup script to create the SQLite database for chat histories.
```bash
python db_setup.py
```

---

## 💻 Usage

1.  **Start the Server:**
    ```bash
    python app.py
    ```
2.  The application will automatically open your default web browser to `http://localhost:5000`.
3.  **Download a Model:** Click the "Add More Models" button in the bottom left to download a local LLM (e.g., Qwen2 or TinyLlama).
4.  **Upload a Document:** Upload a PDF or Word document.
5.  **Start Chatting:** Ask questions and watch the AI answer based strictly on your document!

---

## 📂 Project Structure

```text
Knowledge_Vault_AI/
│
├── app.py                   # Main Flask application and API routes
├── db_setup.py              # SQLite database initialization script
├── download_embedder.py     # Script to fetch local embedding models
├── requirements.txt         # Python dependencies
│
├── models/                  # Directory for downloaded .gguf AI models
├── uploads/                 # Directory for user-uploaded documents
├── db/                      # ChromaDB vector storage directory
├── chat_history.db          # SQLite database file
│
├── templates/
│   └── index.html           # Main frontend UI
│
└── static/
    ├── script.js            # Frontend logic and API calls
    ├── style.css            # Custom CSS scrollbars and Markdown styles
    ├── tailwindcss.js       # Offline Tailwind CSS script
    ├── marked.min.js        # Offline Markdown parser
    └── fontawesome/         # Offline icon library
```

---

## 🔮 Future Enhancements

*   **Advanced Semantic Chunking:** Implement NLP-based text splitting (by paragraph/topic rather than character count) for even higher retrieval accuracy.
*   **Voice Interaction:** Integrate a local Whisper AI model for speech-to-text querying.
*   **Executable Packaging:** Bundle the application into a standalone `.exe` using PyInstaller for easy distribution to non-technical users.

---

## 📜 License

This project was developed as an academic engineering project. Feel free to fork, modify, and use it for your own private document analysis.

**Disclaimer:** AI models can occasionally hallucinate. Always verify critical information against the cited source documents.
```
