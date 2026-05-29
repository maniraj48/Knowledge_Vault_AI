document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Get All UI Elements & State ---
    const sendBtn = document.getElementById('send-btn');
    const userInput = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');
    const themeToggle = document.getElementById('theme-toggle');
    const newChatBtn = document.getElementById('new-chat-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const fileList = document.getElementById('file-list');
    const modelSelector = document.getElementById('model-selector');
    const modelStatus = document.getElementById('model-status');
    // --- Get the new Modal Elements ---
    const modal = document.getElementById('model-manager-modal');
    const openModalBtn = document.getElementById('open-model-manager-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const downloadableModelsList = document.getElementById('downloadable-models-list');
   

    // --- NEW: SETTINGS ELEMENTS (Add these) ---
    const settingsModal = document.getElementById('settings-modal');
    const openSettingsBtn = document.getElementById('open-settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    
    const apiKeyInput = document.getElementById('api-key-input');
    const onlineToggle = document.getElementById('online-mode-toggle');
    const tempSlider = document.getElementById('temp-slider');
    const tempDisplay = document.getElementById('temp-display');
    const tokenSlider = document.getElementById('token-slider');
    const tokenDisplay = document.getElementById('token-display');
    let activeDocument = null; // State: currently selected document


    // ... inside DOMContentLoaded ...
    const systemPromptInput = document.getElementById('system-prompt-input');
    const kSlider = document.getElementById('k-slider');
    const kDisplay = document.getElementById('k-display');
    const resetSettingsBtn = document.getElementById('reset-settings-btn');
    // ... existing selectors ...

    // --- 2. Theme Management ---
    const applyTheme = () => {
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark');
            themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            document.body.classList.remove('dark');
            themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    };

    themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        applyTheme();
    });

    // --- 3. File List & Chat History ---
    // const loadFileList = async () => {
    //     fileList.innerHTML = '';
    //     try {
    //         const response = await fetch('/api/files');
    //         const files = await response.json();

    //         if (files.length === 0) {
    //             fileList.innerHTML = '<div class="text-center text-gray-500 text-xs mt-4">No documents uploaded.</div>';
    //             return;
    //         }

    //         files.forEach(filename => {
    //             const itemHTML = `
    //                 <div class="group flex items-center gap-3 px-2 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer file-item-container" data-filename="${filename}">
    //                     <i class="fa-solid fa-file-pdf text-red-500"></i>
    //                     <span class="text-sm text-gray-700 dark:text-gray-200 truncate select-none flex-1">${filename}</span>
    //                 </div>
    //             `;
    //             fileList.insertAdjacentHTML('beforeend', itemHTML);
    //         });
    //     } catch (error) { console.error("Error loading files:", error); }
    // };
const loadFileList = async () => {
        fileList.innerHTML = '';
        try {
            const response = await fetch('/api/files');
            const files = await response.json();

            if (files.length === 0) {
                fileList.innerHTML = '<div class="text-center text-gray-500 text-xs mt-4">No documents uploaded.</div>';
                return;
            }

            files.forEach(filename => {
                const itemHTML = `
                    <div class="group flex items-center justify-between px-2 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer file-item-container" data-filename="${filename}">
                        <div class="flex items-center gap-3 overflow-hidden">
                            <i class="fa-solid fa-file-pdf text-red-500 flex-shrink-0"></i>
                            <span class="text-sm text-gray-700 dark:text-gray-200 truncate select-none">${filename}</span>
                        </div>
                        
                        <div class="flex gap-1">
                            <!-- Summarize Button -->
                            <button class="summarize-btn opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-500 transition-all" title="Summarize">
                                <i class="fa-solid fa-list-check"></i>
                            </button>
                            
                            <!-- NEW: Delete Button -->
                            <button class="delete-btn opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900 text-red-500 transition-all" title="Delete">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
                fileList.insertAdjacentHTML('beforeend', itemHTML);
            });
        } catch (error) { console.error("Error loading files:", error); }
    };



    // --- LOAD SAVED SETTINGS (Local Storage) ---
    const loadSettings = () => {
        if (localStorage.getItem('openai_key')) apiKeyInput.value = localStorage.getItem('openai_key');
        
        if (localStorage.getItem('use_online') === 'true') {
            onlineToggle.checked = true;
        } else {
            onlineToggle.checked = false;
        }

        if (localStorage.getItem('temperature')) {
            tempSlider.value = localStorage.getItem('temperature');
            tempDisplay.innerText = tempSlider.value;
        }

        if (localStorage.getItem('max_tokens')) {
            tokenSlider.value = localStorage.getItem('max_tokens');
            tokenDisplay.innerText = tokenSlider.value;
        }

    if (localStorage.getItem('system_prompt')) systemPromptInput.value = localStorage.getItem('system_prompt');
    else systemPromptInput.value = "You are a helpful assistant. Use the Context below to answer the Question."; // Default

    if (localStorage.getItem('k_value')) {
        kSlider.value = localStorage.getItem('k_value');
        kDisplay.innerText = kSlider.value;
    }

    };

    // --- SETTINGS EVENT LISTENERS ---
    
    // Open Modal
    openSettingsBtn.addEventListener('click', () => {
        loadSettings(); // Refresh values
        settingsModal.classList.remove('hidden');
    });

    // Close Modal (X button)
    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });



resetSettingsBtn.addEventListener('click', () => {
    if(confirm("Reset all settings to default?")) {
        apiKeyInput.value = "";
        onlineToggle.checked = false;
        tempSlider.value = 0.3;
        tempDisplay.innerText = "0.3";
        tokenSlider.value = 1024;
        tokenDisplay.innerText = "1024";
        systemPromptInput.value = "You are a helpful assistant. Use the Context below to answer the Question.";
        kSlider.value = 3;
        kDisplay.innerText = "3";
    }
});

// Add listener for K slider display
kSlider.addEventListener('input', (e) => kDisplay.innerText = e.target.value);


    // Save Button Logic
    saveSettingsBtn.addEventListener('click', () => {
        // Save to Browser Memory
        localStorage.setItem('openai_key', apiKeyInput.value.trim());
        localStorage.setItem('use_online', onlineToggle.checked);
        localStorage.setItem('temperature', tempSlider.value);
        localStorage.setItem('max_tokens', tokenSlider.value);

        // NEW
        localStorage.setItem('system_prompt', systemPromptInput.value.trim());
        localStorage.setItem('k_value', kSlider.value);

        settingsModal.classList.add('hidden');
        
        // visual feedback
        alert("Configuration Saved!");
    });

    // Update Slider Numbers live
    tempSlider.addEventListener('input', (e) => tempDisplay.innerText = e.target.value);
    tokenSlider.addEventListener('input', (e) => tokenDisplay.innerText = e.target.value);


    const loadChatHistory = async (filename) => {
        activeDocument = filename;
        
        document.querySelectorAll('.file-item-container').forEach(el => {
            el.classList.toggle('bg-blue-100', el.dataset.filename === filename);
            el.classList.toggle('dark:bg-blue-900/50', el.dataset.filename === filename);
        });

        chatBox.innerHTML = '<div class="text-center p-8"><i class="fa-solid fa-spinner fa-spin"></i> Loading History...</div>';

        try {
            const response = await fetch(`/api/history/${filename}`);
            const history = await response.json();
            
            chatBox.innerHTML = '';
            if (history.length === 0) {
                appendWelcomeMessage(filename);
            } else {
                history.forEach(msg => appendMessage(msg.content, msg.sender));
            }
        } catch (error) {
            console.error("Error loading history:", error);
        }
    };

    // fileList.addEventListener('click', (e) => {
    //     const container = e.target.closest('.file-item-container');
    //     if (container) {
    //         const filename = container.dataset.filename;
    //         if (filename && filename !== activeDocument) loadChatHistory(filename);
    //     }
    // });

// Event Listener for File Click, Summarize, and Delete
    fileList.addEventListener('click', async (e) => {
        const container = e.target.closest('.file-item-container');
        if (!container) return;
        
        const filename = container.dataset.filename;
        
        // A. Handle Delete Click
        if (e.target.closest('.delete-btn')) {
            e.stopPropagation(); // Stop the row from being clicked
            
            if (confirm(`Are you sure you want to permanently delete "${filename}"?`)) {
                try {
                    const response = await fetch(`/api/delete/${filename}`, { method: 'DELETE' });
                    const result = await response.json();
                    
                    if (result.success) {
                        // Refresh list
                        await loadFileList();
                        
                        // If we deleted the currently active document, clear the screen
                        if (activeDocument === filename) {
                            activeDocument = null;
                            appendWelcomeMessage(); // Reset to "New Chat" screen
                        }
                    } else {
                        alert("Error deleting file: " + result.error);
                    }
                } catch (error) {
                    console.error("Delete failed:", error);
                    alert("Failed to delete file.");
                }
            }
            return;
        }

        // B. Handle Summarize Click
        if (e.target.closest('.summarize-btn')) {
            e.stopPropagation();
            if (activeDocument !== filename) await loadChatHistory(filename);
            userInput.value = "Provide a comprehensive summary of this document, highlighting the key points and main conclusions.";
            sendMessage();
            return;
        }

        // C. Standard File Click (Load History)
        if (filename && filename !== activeDocument) loadChatHistory(filename);
    });
    
    // --- 4. Chat Functionality ---
    // const sendMessage = async () => {
    //     const message = userInput.value.trim();
    //     if (!message) return;
    //     if (!activeDocument) {
    //         alert("Please select a document from the sidebar first!");
    //         return;
    //     }

    //     if (chatBox.querySelector('.fa-comments')) chatBox.innerHTML = '';

    //     appendMessage(message, 'user');
    //     userInput.value = '';
    //     userInput.style.height = 'auto';

    //     const botMessageDiv = appendMessage(null, 'bot'); // This creates the placeholder

    //     try {
    //         const response = await fetch('/api/chat', {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({ message: message, active_document: activeDocument })
    //         });

    //         const reader = response.body.getReader();
    //         const decoder = new TextDecoder();
    //         let rawText = "";
    //         const proseElement = botMessageDiv.querySelector('.prose');

    //         while (true) {
    //             const { done, value } = await reader.read();
    //             if (done) break;
                
    //             rawText += decoder.decode(value, { stream: true });
    //             proseElement.innerHTML = marked.parse(rawText);
    //             scrollToBottom();
    //         }
    //     } catch (error) {
    //         const proseElement = botMessageDiv.querySelector('.prose');
    //         proseElement.innerHTML = "<span class='text-red-500'>Error connecting to the local AI server.</span>";
    //     }
    // };

    // sendBtn.addEventListener('click', sendMessage);
    // userInput.addEventListener('keypress', (e) => {
    //     if (e.key === 'Enter' && !e.shiftKey) {
    //         e.preventDefault();
    //         sendMessage();
    //     }
    // });



// // --- 4. Chat Functionality ---
//     const sendMessage = async () => {
//         const message = userInput.value.trim();
//         if (!message) return;
//         if (!activeDocument) {
//             alert("Please select a document from the sidebar first!");
//             return;
//         }

//         if (chatBox.querySelector('.fa-comments')) chatBox.innerHTML = '';

//         appendMessage(message, 'user');
//         userInput.value = '';
//         userInput.style.height = 'auto';

//         const botMessageDiv = appendMessage(null, 'bot'); // This creates the placeholder

//         // --- NEW: Gather Settings from the UI ---
//         // We check the DOM elements directly to see what the user selected
//         const useOnline = document.getElementById('online-mode-toggle').checked;
//         const apiKey = document.getElementById('api-key-input').value.trim();
//         const temperature = parseFloat(document.getElementById('temp-slider').value);
//         const maxTokens = parseInt(document.getElementById('token-slider').value);

//         try {
//             const response = await fetch('/api/chat', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 // body: JSON.stringify({ 
//                 //     message: message, 
//                 //     active_document: activeDocument,
                    
//                 //     // --- NEW: Send these settings to Python ---
//                 //     use_online: useOnline,
//                 //     api_key: apiKey,
//                 //     temperature: temperature,
//                 //     max_tokens: maxTokens
//                 // })

//                 // Inside sendMessage try/catch block:
//                 body: JSON.stringify({ 
//                     message: message, 
//                     active_document: activeDocument,
//                     use_online: onlineToggle.checked,
//                     api_key: apiKeyInput.value.trim(),
//                     temperature: parseFloat(tempSlider.value),
//                     max_tokens: parseInt(tokenSlider.value),
                    
//                     // NEW VALUES
//                     system_prompt: systemPromptInput.value.trim(),
//                     n_results: parseInt(kSlider.value)
//                 })

//             });

//             const reader = response.body.getReader();
//             const decoder = new TextDecoder();
//             let rawText = "";
//             const proseElement = botMessageDiv.querySelector('.prose');

//             while (true) {
//                 const { done, value } = await reader.read();
//                 if (done) break;
                
//                 // Stream the text
//                 const chunk = decoder.decode(value, { stream: true });
//                 rawText += chunk;
//                 proseElement.innerHTML = marked.parse(rawText);
//                 scrollToBottom();
//             }
//         } catch (error) {
//             const proseElement = botMessageDiv.querySelector('.prose');
//             proseElement.innerHTML = "<span class='text-red-500'>Error connecting to the AI server.</span>";
//             console.error(error);
//         }
//     };



// --- 4. Chat Functionality ---
    const sendMessage = async () => {
        const message = userInput.value.trim();
        if (!message) return;
        
        // Safety Check
        if (!activeDocument) {
            alert("Please select a document from the sidebar first!");
            return;
        }

        // UI Updates
        if (chatBox.querySelector('.fa-comments')) chatBox.innerHTML = '';
        appendMessage(message, 'user');
        userInput.value = '';
        userInput.style.height = 'auto';

        const botMessageDiv = appendMessage(null, 'bot'); // Create placeholder

        // --- GATHER SETTINGS SAFELY ---
        // We get the elements by ID first
        const onlineEl = document.getElementById('online-mode-toggle');
        const apiEl = document.getElementById('api-key-input');
        const tempEl = document.getElementById('temp-slider');
        const tokenEl = document.getElementById('token-slider');
        const systemEl = document.getElementById('system-prompt-input'); // Make sure this ID exists in your HTML
        const kEl = document.getElementById('k-slider');                 // Make sure this ID exists in your HTML

        // We extract the values (using defaults if elements are missing)
        const useOnline = onlineEl ? onlineEl.checked : false;
        const apiKey = apiEl ? apiEl.value.trim() : "";
        const temperature = tempEl ? parseFloat(tempEl.value) : 0.3;
        const maxTokens = tokenEl ? parseInt(tokenEl.value) : 1024;
        const systemPrompt = systemEl ? systemEl.value.trim() : "";
        const nResults = kEl ? parseInt(kEl.value) : 3;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: message, 
                    active_document: activeDocument,
                    
                    // --- Send the values we gathered above ---
                    use_online: useOnline,
                    api_key: apiKey,
                    temperature: temperature,
                    max_tokens: maxTokens,
                    system_prompt: systemPrompt,
                    n_results: nResults
                })
            });

            // Handle Server Errors (like 500 or 400)
            if (!response.ok) {
                throw new Error(`Server Error: ${response.status} ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let rawText = "";
            const proseElement = botMessageDiv.querySelector('.prose');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                rawText += chunk;
                proseElement.innerHTML = marked.parse(rawText);
                scrollToBottom();
            }
        } catch (error) {
            const proseElement = botMessageDiv.querySelector('.prose');
            proseElement.innerHTML = `<span class='text-red-500'>Error: ${error.message}</span>`;
            console.error(error);
        }
    };

    
    // --- 5. Helper Functions ---
    const appendMessage = (text, sender) => {
        let messageDiv;
        if (sender === 'user') {
            messageDiv = document.createElement('div');
            messageDiv.className = "msg-user self-end";
            messageDiv.innerText = text;
        } else {
            messageDiv = document.createElement('div');
            messageDiv.className = "flex gap-4 p-4";
            messageDiv.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white flex-shrink-0">
                    <i class="fa-solid fa-robot"></i>
                </div>
                <div class="prose dark:prose-invert flex-1 prose-sm max-w-none">
                    ${text ? marked.parse(text) : '<span class="animate-pulse">Thinking...</span>'}
                </div>
            `;
        }
        chatBox.appendChild(messageDiv);
        scrollToBottom();
        return messageDiv; // Return the created element
    };
    
    const appendWelcomeMessage = (filename = null) => {
        chatBox.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-center text-gray-400 opacity-50">
                <i class="fa-solid fa-comments text-6xl mb-4"></i>
                <p class="text-lg">
                    ${filename ? `This is a new chat for <br><strong>${filename}</strong>` : 'Chat cleared. Ready for new questions!'}
                </p>
            </div>
        `;
    };

    const scrollToBottom = () => chatBox.scrollTop = chatBox.scrollHeight;

    // --- 6. Buttons and Uploads ---
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    uploadBtn.addEventListener('click', () => fileInput.click());
    
    // fileInput.addEventListener('change', async () => {
    //     const file = fileInput.files[0];
    //     if (!file) return;

    //     const formData = new FormData();
    //     formData.append('file', file);
        
    //     uploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';
    //     uploadBtn.disabled = true;

    //     try {
    //         await fetch('/api/upload', { method: 'POST', body: formData });
    //         await loadFileList();
    //     } catch (error) {
    //         console.error(error);
    //     } finally {
    //         uploadBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload PDF';
    //         uploadBtn.disabled = false;
    //     }
    // });


fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        
        // Change button to loading state
        uploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';
        uploadBtn.disabled = true;

        try {
            const response = await fetch('/api/upload', { method: 'POST', body: formData });
            const result = await response.json();

            // --- FIX: Check if the upload failed ---
            if (!response.ok) {
                // Show the error message from the backend (e.g., "File already exists")
                alert(result.error || "Upload failed.");
            } else {
                // Success
                await loadFileList();
            }

        } catch (error) {
            console.error(error);
            alert("An unexpected error occurred during upload.");
        } finally {
            // Reset button
            uploadBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload PDF';
            uploadBtn.disabled = false;
            
            // Clear the input so you can try selecting the same file again if it failed
            fileInput.value = ''; 
        }
    });

    newChatBtn.addEventListener('click', () => {
        appendWelcomeMessage();
        activeDocument = null;
        document.querySelectorAll('.file-item-container').forEach(el => {
            el.classList.remove('bg-blue-100', 'dark:bg-blue-900/50');
        });
    });


    // --- NEW: Model Management Section ---
    const loadModelList = async () => {
        try {
            const response = await fetch('/api/models');
            const data = await response.json();

            modelSelector.innerHTML = ''; // Clear "Loading..."

            if (data.available_models.length === 0) {
                modelSelector.innerHTML = '<option>No models found</option>';
                modelSelector.disabled = true;
                return;
            }

            data.available_models.forEach(modelName => {
                const option = document.createElement('option');
                option.value = modelName;
                option.innerText = modelName;
                if (modelName === data.loaded_model) {
                    option.selected = true;
                    modelStatus.innerText = `Loaded: ${data.loaded_model.substring(0, 20)}...`;
                }
                modelSelector.appendChild(option);
            });
        } catch (error) {
            console.error("Error loading model list:", error);
            modelSelector.innerHTML = '<option>Error loading</option>';
        }
    };

    modelSelector.addEventListener('change', async (e) => {
        const selectedModel = e.target.value;
        modelStatus.innerText = `Loading ${selectedModel.substring(0, 20)}...`;
        modelStatus.classList.add('animate-pulse');
        modelSelector.disabled = true;

        try {
            const response = await fetch('/api/load_model', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model_name: selectedModel })
            });

            const data = await response.json();
            if (data.success) {
                modelStatus.innerText = `Loaded: ${selectedModel.substring(0, 20)}...`;
                // Optional: show a success alert or message
            } else {
                modelStatus.innerText = `Error: ${data.error}`;
                // Optional: revert selector to previous model
            }
        } catch (error) {
            console.error("Error switching model:", error);
            modelStatus.innerText = 'Error switching model.';
        } finally {
            modelStatus.classList.remove('animate-pulse');
            modelSelector.disabled = false;
        }
    });
// --- NEW: Modal Control Logic ---
openModalBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
    loadDownloadableModels(); // Refresh list every time modal is opened
});

closeModalBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
});

// Close modal if clicking outside of it
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.add('hidden');
    }
});


// --- NEW: Function to load and display downloadable models ---
const loadDownloadableModels = async () => {
    downloadableModelsList.innerHTML = '<div class="text-center text-gray-500"><i class="fa-solid fa-spinner fa-spin"></i> Loading available models...</div>';
    
    try {
        const response = await fetch('/api/downloadable_models');
        const models = await response.json();

        downloadableModelsList.innerHTML = ''; // Clear spinner

        models.forEach(model => {
            const isDownloaded = model.is_downloaded;
            const modelCard = document.createElement('div');
            modelCard.className = 'p-3 border rounded-lg bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700 flex items-center justify-between gap-4';
            
            modelCard.innerHTML = `
                <div class="flex-1">
                    <h3 class="font-semibold text-sm text-gray-800 dark:text-gray-100">${model.name}</h3>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${model.description} (${model.size})</p>
                    <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2 hidden progress-bar-container">
                        <div class="bg-blue-600 h-2.5 rounded-full progress-bar" style="width: 0%"></div>
                    </div>
                    <div class="text-xs text-blue-500 mt-1 hidden progress-text">Downloading...</div>
                </div>
                <button 
                    class="download-btn text-white font-bold py-2 px-4 rounded-lg text-sm transition ${isDownloaded ? 'bg-green-600 cursor-not-allowed' : 'bg-primary hover:bg-blue-700'}"
                    data-repo="${model.repo}"
                    data-filename="${model.name}"
                    ${isDownloaded ? 'disabled' : ''}
                >
                    <i class="fa-solid ${isDownloaded ? 'fa-check' : 'fa-download'}"></i>
                    ${isDownloaded ? 'Downloaded' : 'Download'}
                </button>
            `;
            downloadableModelsList.appendChild(modelCard);
        });

    } catch (error) {
        console.error("Failed to load downloadable models:", error);
        downloadableModelsList.innerHTML = '<div class="text-red-500">Failed to load model list.</div>';
    }
};

// --- NEW: Event Listener for Download Buttons (using event delegation) ---
// In static/script.js

// In static/script.js

downloadableModelsList.addEventListener('click', async (e) => {
    const downloadButton = e.target.closest('.download-btn');
    if (downloadButton && !downloadButton.disabled) {
        const button = downloadButton;
        const repo = button.dataset.repo;
        const filename = button.dataset.filename;
        
        button.disabled = true;
        button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Downloading';

        const card = button.closest('.p-3');
        const progressContainer = card.querySelector('.progress-bar-container');
        const progressBar = card.querySelector('.progress-bar');
        const progressText = card.querySelector('.progress-text');

        // Show progress elements
        progressContainer.classList.remove('hidden');
        progressText.classList.remove('hidden');
        progressText.innerText = `Starting download for ${filename}...`;
        progressBar.style.width = '0%'; // Reset progress bar

        try {
            // --- Step 1: Tell the backend to start downloading ---
            const response = await fetch('/api/download_model', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repo: repo, filename: filename })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                // If the download fails immediately (e.g., 404 error)
                throw new Error(result.error || `Server responded with status: ${response.status}`);
            }

            // --- Step 2: The download is complete on the backend. Verify it. ---
            progressText.innerText = 'Download complete! Verifying file...';
            progressBar.style.width = '100%';

            const checkResponse = await fetch(`/api/check_file/${filename}`);
            const checkResult = await checkResponse.json();

            if (checkResult.exists) {
                // --- SUCCESS ---
                button.innerHTML = '<i class="fa-solid fa-check"></i> Downloaded';
                button.className = 'download-btn bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition cursor-not-allowed';
                progressText.innerText = 'Verification successful! Added to model list.';
                
                // Refresh the main model selector in the sidebar
                await loadModelList();
            } else {
                // --- FAILURE (File doesn't exist after download) ---
                throw new Error("Verification failed. File not found on disk.");
            }
            
        } catch (error) {
            // --- CATCH ALL ERRORS ---
            console.error("Download process failed:", error);
            button.innerHTML = '<i class="fa-solid fa-times"></i> Error';
            button.className = 'download-btn bg-red-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition';
            button.disabled = false; // Re-enable on error
            progressText.innerText = `Error: ${error.message}`;
            progressBar.style.backgroundColor = 'red';
        }
    }
});

    // --- 7. Initial Load ---
    applyTheme();
    loadFileList();
    loadModelList(); // <-- Add this to the initial load
    loadSettings(); // <--- ADD THIS LINE
    appendWelcomeMessage('a document from the sidebar');
});