document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. UI ELEMENT SELECTORS
    // ==========================================
    const sendBtn = document.getElementById('send-btn');
    const userInput = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');
    const themeToggle = document.getElementById('theme-toggle');
    const newChatBtn = document.getElementById('new-chat-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const fileList = document.getElementById('file-list');
    
    // PDF Viewer Elements
    const togglePdfBtn = document.getElementById('toggle-pdf-btn');
    const pdfPanel = document.getElementById('pdf-panel');
    const pdfFrame = document.getElementById('pdf-frame');
    const closePdfBtn = document.getElementById('close-pdf-btn');
    const chatContainer = document.getElementById('chat-container');

    // Model Manager Elements
    const modelSelector = document.getElementById('model-selector');
    const modelStatus = document.getElementById('model-status');
    const modal = document.getElementById('model-manager-modal');
    const openModalBtn = document.getElementById('open-model-manager-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const downloadableModelsList = document.getElementById('downloadable-models-list');

    // Settings Elements
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
    const systemPromptInput = document.getElementById('system-prompt-input'); 
    const kSlider = document.getElementById('k-slider'); 
    const kDisplay = document.getElementById('k-display');

    let activeDocument = null; 

    // ==========================================
    // 2. THEME MANAGEMENT
    // ==========================================
    const applyTheme = () => {
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
    };

    themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });

    // ==========================================
    // 3. SETTINGS & LOCAL STORAGE
    // ==========================================
    const loadSettings = () => {
        if (localStorage.getItem('openai_key')) apiKeyInput.value = localStorage.getItem('openai_key');
        if (localStorage.getItem('use_online') === 'true') onlineToggle.checked = true;
        
        if (localStorage.getItem('temperature')) {
            tempSlider.value = localStorage.getItem('temperature');
            if(tempDisplay) tempDisplay.innerText = tempSlider.value;
        }
        if (localStorage.getItem('max_tokens')) {
            tokenSlider.value = localStorage.getItem('max_tokens');
            if(tokenDisplay) tokenDisplay.innerText = tokenSlider.value;
        }
        if (localStorage.getItem('system_prompt')) systemPromptInput.value = localStorage.getItem('system_prompt');
        if (localStorage.getItem('k_value')) {
            kSlider.value = localStorage.getItem('k_value');
            if(kDisplay) kDisplay.innerText = kSlider.value;
        }
    };

    if (openSettingsBtn) openSettingsBtn.addEventListener('click', () => {
        loadSettings();
        settingsModal.classList.remove('hidden');
    });

    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', () => {
        localStorage.setItem('openai_key', apiKeyInput.value.trim());
        localStorage.setItem('use_online', onlineToggle.checked);
        localStorage.setItem('temperature', tempSlider.value);
        localStorage.setItem('max_tokens', tokenSlider.value);
        localStorage.setItem('system_prompt', systemPromptInput.value.trim());
        localStorage.setItem('k_value', kSlider.value);
        
        settingsModal.classList.add('hidden');
        alert("Configuration Saved!");
    });

    if (tempSlider) tempSlider.addEventListener('input', (e) => { if(tempDisplay) tempDisplay.innerText = e.target.value; });
    if (tokenSlider) tokenSlider.addEventListener('input', (e) => { if(tokenDisplay) tokenDisplay.innerText = e.target.value; });
    if (kSlider) kSlider.addEventListener('input', (e) => { if(kDisplay) kDisplay.innerText = e.target.value; });

    // ==========================================
    // 4. FILE LIST & CHAT HISTORY
    // ==========================================
    const loadFileList = async () => {
        fileList.innerHTML = '';
        try {
            const response = await fetch('/api/files');
            const files = await response.json();

            if (files.length === 0) {
                fileList.innerHTML = '<div class="text-center text-gray-500 text-xs mt-4">No documents uploaded.</div>';
                return;
            }

            // files.forEach(filename => {
            //     const itemHTML = `
            //         <div class="group flex items-center justify-between px-2 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer file-item-container" data-filename="${filename}">
            //             <div class="flex items-center gap-3 overflow-hidden">
            //                 <i class="fa-solid fa-file-pdf text-red-500 flex-shrink-0"></i>
            //                 <span class="text-sm text-gray-700 dark:text-gray-200 truncate select-none">${filename}</span>
            //             </div>
            //             <div class="flex gap-1">
            //                 <button class="summarize-btn opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-500 transition-all" title="Summarize">
            //                     <i class="fa-solid fa-list-check"></i>
            //                 </button>
            //                 <button class="delete-btn opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900 text-red-500 transition-all" title="Delete">
            //                     <i class="fa-solid fa-trash"></i>
            //                 </button>
            //             </div>
            //         </div>
            //     `;
            //     fileList.insertAdjacentHTML('beforeend', itemHTML);
            // });
files.forEach(filename => {
                // 1. Determine File Type & Icon
                const isPdf = filename.toLowerCase().endsWith('.pdf');
                // Use Red PDF icon or Blue Word icon
                const iconClass = isPdf ? 'fa-file-pdf text-red-500' : 'fa-file-word text-blue-500';

                const itemHTML = `
                    <div class="group flex items-center justify-between px-2 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer file-item-container" data-filename="${filename}">
                        <div class="flex items-center gap-3 overflow-hidden">
                            <!-- Use the dynamic icon class here -->
                            <i class="fa-solid ${iconClass} flex-shrink-0"></i>
                            <span class="text-sm text-gray-700 dark:text-gray-200 truncate select-none">${filename}</span>
                        </div>
                        <div class="flex gap-1">
                            <button class="summarize-btn opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-500 transition-all" title="Summarize">
                                <i class="fa-solid fa-list-check"></i>
                            </button>
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

    // const loadChatHistory = async (filename) => {
    //     activeDocument = filename;
        
    //     // Update PDF Viewer
    //     if(pdfFrame) pdfFrame.src = `/uploads/${filename}`;
    //     if(togglePdfBtn) {
    //         togglePdfBtn.classList.remove('hidden');
    //         togglePdfBtn.innerHTML = `<i class="fa-solid fa-book-open mr-1"></i> View PDF`;
    //     }

    //     // Highlight active file
    //     document.querySelectorAll('.file-item-container').forEach(el => {
    //         const isActive = el.dataset.filename === filename;
    //         el.classList.toggle('bg-blue-100', isActive);
    //         el.classList.toggle('dark:bg-blue-900/50', isActive);
    //     });

    //     chatBox.innerHTML = '<div class="text-center p-8"><i class="fa-solid fa-spinner fa-spin"></i> Loading History...</div>';

    //     try {
    //         const response = await fetch(`/api/history/${filename}`);
    //         const history = await response.json();
            
    //         chatBox.innerHTML = '';
    //         if (history.length === 0) {
    //             appendWelcomeMessage(filename);
    //         } else {
    //             history.forEach(msg => appendMessage(msg.content, msg.sender));
    //         }
    //     } catch (error) { console.error("Error loading history:", error); }
    // };


const loadChatHistory = async (filename) => {
        activeDocument = filename;
        
        // --- NEW: Check if file is PDF ---
        const isPdf = filename.toLowerCase().endsWith('.pdf');

        if (togglePdfBtn) {
            if (isPdf) {
                // IF PDF: Show the button and load the viewer
                togglePdfBtn.classList.remove('hidden');
                togglePdfBtn.innerHTML = `<i class="fa-solid fa-book-open mr-1"></i> View PDF`;
                if(pdfFrame) pdfFrame.src = `/uploads/${filename}`;
            } else {
                // IF DOCX: Hide the button
                togglePdfBtn.classList.add('hidden');
                
                // If the panel is currently open, close it automatically to avoid confusion
                if(pdfPanel && !pdfPanel.classList.contains('hidden')) {
                    const closeBtn = document.getElementById('close-pdf-btn');
                    if(closeBtn) closeBtn.click();
                }
            }
        }

        // Highlight active file
        document.querySelectorAll('.file-item-container').forEach(el => {
            const isActive = el.dataset.filename === filename;
            el.classList.toggle('bg-blue-100', isActive);
            el.classList.toggle('dark:bg-blue-900/50', isActive);
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
        } catch (error) { console.error("Error loading history:", error); }
    };

    fileList.addEventListener('click', async (e) => {
        const container = e.target.closest('.file-item-container');
        if (!container) return;
        const filename = container.dataset.filename;
        
        // DELETE
        if (e.target.closest('.delete-btn')) {
            e.stopPropagation();
            if (confirm(`Delete "${filename}"?`)) {
                try {
                    const response = await fetch(`/api/delete/${filename}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (result.success) {
                        await loadFileList();
                        if (activeDocument === filename) { activeDocument = null; appendWelcomeMessage(); }
                    } else { alert("Error: " + result.error); }
                } catch (error) { alert("Delete failed."); }
            }
            return;
        }

        // SUMMARIZE
        if (e.target.closest('.summarize-btn')) {
            e.stopPropagation();
            if (activeDocument !== filename) await loadChatHistory(filename);
            userInput.value = "Summarize this document.";
            sendMessage();
            return;
        }

        // SELECT
        if (filename && filename !== activeDocument) loadChatHistory(filename);
    });

    // ==========================================
    // 5. CHAT LOGIC (THE CORE)
    // ==========================================
    const sendMessage = async () => {
        const message = userInput.value.trim();
        if (!message) return;
        
        if (!activeDocument) {
            alert("Please select a document from the sidebar first!");
            return;
        }

        if (chatBox.querySelector('.fa-comments')) chatBox.innerHTML = '';

        appendMessage(message, 'user');
        userInput.value = '';
        userInput.style.height = 'auto';

        const botMessageDiv = appendMessage(null, 'bot'); 

        // SAFE SETTINGS GATHERING
        const useOnline = onlineToggle ? onlineToggle.checked : false;
        const apiKey = apiKeyInput ? apiKeyInput.value.trim() : "";
        const temperature = tempSlider ? parseFloat(tempSlider.value) : 0.3;
        const maxTokens = tokenSlider ? parseInt(tokenSlider.value) : 1024;
        const sysPrompt = systemPromptInput ? systemPromptInput.value.trim() : "";
        const nRes = kSlider ? parseInt(kSlider.value) : 3;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: message, 
                    active_document: activeDocument,
                    use_online: useOnline,
                    api_key: apiKey,
                    temperature: temperature,
                    max_tokens: maxTokens,
                    system_prompt: sysPrompt,
                    n_results: nRes
                })
            });

            if (!response.ok) throw new Error("Server Error");

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
        }
    };

    // --- CONNECTING THE BUTTONS (THIS WAS MISSING BEFORE) ---
    sendBtn.addEventListener('click', sendMessage);
    
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // ==========================================
    // 6. HELPER FUNCTIONS
    // ==========================================
    const appendMessage = (text, sender) => {
        let div;
        if (sender === 'user') {
            div = document.createElement('div');
            div.className = "msg-user self-end";
            div.innerText = text;
        } else {
            div = document.createElement('div');
            div.className = "flex gap-4 p-4";
            div.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white flex-shrink-0">
                    <i class="fa-solid fa-robot"></i>
                </div>
                <div class="prose dark:prose-invert flex-1 prose-sm max-w-none">
                    ${text ? marked.parse(text) : '<span class="animate-pulse">Thinking...</span>'}
                </div>
            `;
        }
        chatBox.appendChild(div);
        scrollToBottom();
        return div;
    };
    
    const appendWelcomeMessage = (filename = null) => {
        chatBox.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-center text-gray-400 opacity-50">
                <i class="fa-solid fa-comments text-6xl mb-4"></i>
                <p class="text-lg">
                    ${filename ? `Chatting with <br><strong>${filename}</strong>` : 'Select a document.'}
                </p>
            </div>
        `;
    };

    const scrollToBottom = () => chatBox.scrollTop = chatBox.scrollHeight;

    // ==========================================
    // 7. FILE UPLOAD & MODEL LOGIC
    // ==========================================
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    // fileInput.accept = '.pdf';
    fileInput.accept = '.pdf, .docx'; // Allow both formats
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    uploadBtn.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        
        uploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';
        uploadBtn.disabled = true;

        try {
            const response = await fetch('/api/upload', { method: 'POST', body: formData });
            const result = await response.json();
            if(!response.ok) alert(result.error);
            await loadFileList();
        } catch (error) { alert("Upload error"); } 
        finally {
            uploadBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload PDF, DOCX';
            uploadBtn.disabled = false;
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

    const loadModelList = async () => {
        try {
            const response = await fetch('/api/models');
            const data = await response.json();
            modelSelector.innerHTML = '';
            if (data.available_models.length === 0) {
                modelSelector.innerHTML = '<option>No models found</option>';
                return;
            }
            data.available_models.forEach(modelName => {
                const option = document.createElement('option');
                option.value = modelName;
                option.innerText = modelName;
                if (modelName === data.loaded_model) option.selected = true;
                modelSelector.appendChild(option);
            });
        } catch (e) { console.error(e); }
    };

    modelSelector.addEventListener('change', async (e) => {
        modelStatus.innerText = "Switching...";
        try {
            await fetch('/api/load_model', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({model_name: e.target.value})
            });
            modelStatus.innerText = "Loaded";
        } catch(e) { modelStatus.innerText = "Error"; }
    });
    
    // PDF Split Screen Logic
    if(togglePdfBtn) togglePdfBtn.addEventListener('click', () => {
        pdfPanel.classList.remove('hidden', 'w-0');
        pdfPanel.classList.add('w-1/2');
        chatContainer.classList.remove('flex-1');
        chatContainer.classList.add('w-1/2');
        togglePdfBtn.classList.add('hidden');
    });

    if(closePdfBtn) closePdfBtn.addEventListener('click', () => {
        pdfPanel.classList.add('hidden', 'w-0');
        pdfPanel.classList.remove('w-1/2');
        chatContainer.classList.add('flex-1');
        chatContainer.classList.remove('w-1/2');
        togglePdfBtn.classList.remove('hidden');
    });

    // Model Manager Modal Logic
    if (openModalBtn) openModalBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
        loadDownloadableModels();
    });

    if (closeModalBtn) closeModalBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });
    
    const loadDownloadableModels = async () => {
        downloadableModelsList.innerHTML = '<div class="text-center text-gray-500"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>';
        try {
            const response = await fetch('/api/downloadable_models');
            const models = await response.json();
            downloadableModelsList.innerHTML = '';
            models.forEach(model => {
                const isDownloaded = model.is_downloaded;
                const modelCard = document.createElement('div');
                modelCard.className = 'p-3 border rounded-lg bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700 flex items-center justify-between gap-4';
                // modelCard.innerHTML = `
                //     <div class="flex-1">
                //         <h3 class="font-semibold text-sm text-gray-800 dark:text-gray-100">${model.name}</h3>
                //         <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${model.description} (${model.size})</p>
                //     </div>
                //     <button class="download-btn text-white font-bold py-2 px-4 rounded-lg text-sm transition ${isDownloaded ? 'bg-green-600 cursor-not-allowed' : 'bg-primary hover:bg-blue-700'}" data-repo="${model.repo}" data-filename="${model.name}" ${isDownloaded ? 'disabled' : ''}>
                //         <i class="fa-solid ${isDownloaded ? 'fa-check' : 'fa-download'}"></i> ${isDownloaded ? 'Downloaded' : 'Download'}
                //     </button>
                // `;

                modelCard.innerHTML = `
                    <div class="flex-1 w-full overflow-hidden pr-4">
                        <h3 class="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">${model.name}</h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">${model.description} (${model.size})</p>
                        
                        <!-- NEW: Progress Bar Elements (Hidden by default) -->
                        <div class="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700 mt-3 hidden progress-bar-container">
                            <div class="bg-blue-600 h-2 rounded-full progress-bar transition-all duration-300" style="width: 0%"></div>
                        </div>
                        <div class="text-[10px] font-mono text-blue-600 dark:text-blue-400 mt-1 hidden progress-text">0%</div>
                    </div>
                    
                    <button class="download-btn flex-shrink-0 text-white font-bold py-2 px-4 rounded-lg text-sm transition ${isDownloaded ? 'bg-green-600 cursor-not-allowed' : 'bg-primary hover:bg-blue-700'}" data-repo="${model.repo}" data-filename="${model.name}" ${isDownloaded ? 'disabled' : ''}>
                        <i class="fa-solid ${isDownloaded ? 'fa-check' : 'fa-download'}"></i> ${isDownloaded ? 'Downloaded' : 'Download'}
                    </button>
                `;
                downloadableModelsList.appendChild(modelCard);
            });
        } catch (error) { downloadableModelsList.innerHTML = 'Error loading models.'; }
    };

    // downloadableModelsList.addEventListener('click', async (e) => {
    //     const btn = e.target.closest('.download-btn');
    //     if(btn && !btn.disabled) {
    //         btn.disabled = true;
    //         btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    //         try {
    //             await fetch('/api/download_model', {
    //                 method: 'POST',
    //                 headers: {'Content-Type': 'application/json'},
    //                 body: JSON.stringify({repo: btn.dataset.repo, filename: btn.dataset.filename})
    //             });
    //             // Assuming success for demo; real verification added previously
    //             btn.innerHTML = 'Downloaded';
    //             btn.classList.add('bg-green-600');
    //             loadModelList();
    //         } catch(e) { btn.innerHTML = 'Error'; }
    //     }
    // });


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
            progressText.innerText = `Connecting to server...`;
            progressBar.style.width = '0%'; 
            progressBar.classList.remove('animate-pulse'); // We want smooth filling now

            try {
                // --- Start Streaming Request ---
                const response = await fetch('/api/download_model', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ repo: repo, filename: filename })
                });

                if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);

                // --- Read Stream Chunk by Chunk ---
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    
                    // Keep the last incomplete line in the buffer
                    buffer = lines.pop(); 

                    for (const line of lines) {
                        if (line.trim() === '') continue;
                        
                        const data = JSON.parse(line);
                        
                        // 1. UPDATE REAL-TIME STATS
                        if (data.status === 'downloading') {
                            progressBar.style.width = data.percent + '%';
                            
                            // Format numbers (Bytes to GB/MB)
                            const dlGB = (data.downloaded / (1024 * 1024 * 1024)).toFixed(2);
                            const totGB = (data.total / (1024 * 1024 * 1024)).toFixed(2);
                            const speedMB = (data.speed / (1024 * 1024)).toFixed(1);
                            
                            // Format Time
                            let etaStr = "Calculating...";
                            if (data.eta > 0) {
                                const mins = Math.floor(data.eta / 60);
                                const secs = Math.floor(data.eta % 60);
                                etaStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                            }

                            progressText.innerText = `${data.percent.toFixed(1)}% (${dlGB} / ${totGB} GB) | Speed: ${speedMB} MB/s | ETA: ${etaStr}`;
                        } 
                        // 2. FINISHED DOWNLOADING
                        else if (data.status === 'complete') {
                            progressText.innerText = 'Download complete! Verifying file on disk...';
                            progressBar.style.width = '100%';

                            const checkResponse = await fetch(`/api/check_file/${filename}`);
                            const checkResult = await checkResponse.json();

                            if (checkResult.exists) {
                                button.innerHTML = '<i class="fa-solid fa-check"></i> Downloaded';
                                button.className = 'download-btn bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition cursor-not-allowed';
                                progressText.innerText = 'Verification successful! Added to model list.';
                                await loadModelList();
                            } else {
                                throw new Error("Verification failed. File not found.");
                            }
                        }
                        // 3. SERVER ERROR
                        else if (data.status === 'error') {
                            throw new Error(data.message);
                        }
                    }
                }
                
            } catch (error) {
                console.error("Download process failed:", error);
                button.innerHTML = '<i class="fa-solid fa-times"></i> Error';
                button.className = 'download-btn bg-red-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition';
                button.disabled = false; 
                progressText.innerText = `Error: ${error.message}`;
                progressBar.style.backgroundColor = '#ef4444'; // Red bar
            }
        }
    });


    // --- INITIALIZATION ---
    applyTheme();
    loadFileList();
    loadModelList();
    loadSettings();
    appendWelcomeMessage();
});