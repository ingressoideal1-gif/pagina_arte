document.addEventListener('DOMContentLoaded', () => {
    
    // --- Supabase Configuração ---
    const SUPABASE_URL = 'https://ferumcflobtwjfxyoeng.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_dbhmPRshI-RE1QTOnY4fWg_9LLDYBUA';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // --- Elements ---
    const form = document.getElementById('observation-form');
    const toast = document.getElementById('toast');
    const btnStageBatch = document.getElementById('btn-stage-batch');
    const btnSavePage = document.getElementById('btn-save-page');
    const designersTable = document.getElementById('designers-table'); // Ensure this exists

    // Main View Elements
    const btnOpenModal = document.getElementById('btn-open-modal');

    // History View Elements
    const historySection = document.getElementById('history-section');
    const historyList = document.getElementById('history-list');

    // Modal Elements
    const uploadModal = document.getElementById('upload-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    
    // Lightbox Elements
    const lightboxModal = document.getElementById('lightbox-modal');
    const btnCloseLightbox = document.getElementById('btn-close-lightbox');
    const lightboxBody = document.getElementById('lightbox-body');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxDownloadBtn = document.getElementById('lightbox-download-btn');
    
    // Modal Inner Elements (Drop Zone & Preview)
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const dropZoneContent = document.getElementById('drop-zone-content');
    const modalPreviewArea = document.getElementById('modal-preview-area');
    const modalPreviewGrid = document.getElementById('modal-preview-grid');
    const fileInfoSummary = document.getElementById('file-info-summary');
    const btnModalRemove = document.getElementById('remove-btn');

    // Initialize Flatpickr for Date and Time
    flatpickr(".date-picker", {
        locale: "pt",
        dateFormat: "d/m/Y",
        minDate: "today",
        disableMobile: "true"
    });

    flatpickr(".time-picker", {
        enableTime: true,
        noCalendar: true,
        dateFormat: "H:i",
        time_24hr: true,
        disableMobile: "true"
    });

    // --- Rich Text Editors (Quill) ---
    const observationsRoot = document.getElementById('observations-root-container');
    const btnAddEditor = document.getElementById('btn-add-editor');
    
    const quillOptions = {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'font': [] }, { 'size': [] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['clean']
            ]
        }
    };

    // Inicializa o primeiro editor (se existir no DOM)
    const firstEditorEl = observationsRoot.querySelector('.quill-editor');
    if (firstEditorEl) {
        new Quill(firstEditorEl, quillOptions);
    }

    // Adiciona nova janela inteira de observação
    btnAddEditor.addEventListener('click', () => {
        const newWindow = document.createElement('div');
        newWindow.className = 'form-group observation-window';
        newWindow.style.margin = '0';
        
        newWindow.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <label style="margin: 0;">Dados para impressão nos produtos:<br><small style="color: var(--text-muted); font-weight: normal; margin-top: 0.2rem; display: inline-block;">ex.: local do evento, data, informações, dados de impressão no verso (se houver), etc.</small></label>
            </div>
            <div class="editor-block">
                <div class="quill-editor"></div>
            </div>
        `;
        
        observationsRoot.appendChild(newWindow);
        const newEditorEl = newWindow.querySelector('.quill-editor');
        new Quill(newEditorEl, quillOptions);
    });

    // State
    let currentFiles = [];
    let stagedBatches = [];

    // --- Modal Logic ---
    function openModal() {
        uploadModal.classList.remove('hidden');
        resetModalInner();
    }

    function closeModal() {
        uploadModal.classList.add('hidden');
    }
    
    function closeLightbox() {
        lightboxModal.classList.add('hidden');
        lightboxBody.innerHTML = ''; // clear preview to stop audio/video
        lightboxDownloadBtn.href = "#";
    }

    btnOpenModal.addEventListener('click', openModal);
    btnCloseModal.addEventListener('click', closeModal);
    btnCloseLightbox.addEventListener('click', closeLightbox);
    
    uploadModal.addEventListener('click', (e) => {
        if (e.target === uploadModal) closeModal();
    });
    
    lightboxModal.addEventListener('click', (e) => {
        if (e.target === lightboxModal) closeLightbox();
    });

    // --- Drag and Drop Logic (Inside Modal) ---
    dropZone.addEventListener('click', (e) => {
        if (e.target.closest('#remove-btn') || e.target.closest('.preview-header')) return;
        if (currentFiles.length === 0) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (fileInput.files.length > 0) {
            handleFileSelect(fileInput.files);
        }
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            if (currentFiles.length === 0) dropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', (e) => {
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files);
        }
    });

    // --- File Processing ---
    function handleFileSelect(files) {
        currentFiles = Array.from(files);
        
        // Update Modal UI
        if(currentFiles.length === 1) {
            fileInfoSummary.textContent = `${currentFiles[0].name} (${formatBytes(currentFiles[0].size)})`;
        } else {
            const totalSize = currentFiles.reduce((acc, f) => acc + f.size, 0);
            fileInfoSummary.textContent = `${currentFiles.length} arquivos selecionados (${formatBytes(totalSize)})`;
        }
        
        dropZoneContent.classList.add('hidden');
        dropZoneContent.style.display = 'none';
        modalPreviewArea.classList.remove('hidden');
        dropZone.style.cursor = 'default';

        generatePreviews(currentFiles, modalPreviewGrid);
    }

    function generatePreviews(files, containerElement) {
        containerElement.innerHTML = ''; 
        
        files.forEach(file => {
            const fileType = file.type;
            const thumb = document.createElement('div');
            thumb.className = 'preview-thumbnail';

            if (fileType.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                img.onload = () => URL.revokeObjectURL(img.src);
                thumb.appendChild(img);
            } else if (fileType.startsWith('video/')) {
                const video = document.createElement('video');
                video.src = URL.createObjectURL(file);
                video.onload = () => URL.revokeObjectURL(video.src);
                thumb.appendChild(video);
            } else {
                let iconClass = 'fa-file';
                if (fileType.startsWith('audio/')) iconClass = 'fa-file-audio';
                else if (fileType === 'application/pdf') iconClass = 'fa-file-pdf';
                else if (fileType.includes('text') || file.name.endsWith('.txt')) iconClass = 'fa-file-lines';
                else if (file.name.endsWith('.zip') || file.name.endsWith('.rar')) iconClass = 'fa-file-zipper';
                else if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) iconClass = 'fa-file-excel';
                else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) iconClass = 'fa-file-word';
                
                thumb.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
            }

            const nameSpan = document.createElement('span');
            nameSpan.className = 'thumb-name';
            nameSpan.textContent = file.name;
            nameSpan.title = file.name;
            thumb.appendChild(nameSpan);

            containerElement.appendChild(thumb);
        });
    }

    function resetModalInner() {
        currentFiles = [];
        fileInput.value = '';
        modalPreviewArea.classList.add('hidden');
        dropZoneContent.classList.remove('hidden');
        dropZoneContent.style.display = 'block';
        modalPreviewGrid.innerHTML = '';
        dropZone.style.cursor = 'pointer';
        form.reset();
    }

    btnModalRemove.addEventListener('click', (e) => {
        e.stopPropagation();
        resetModalInner();
    });

    // --- Staging a Batch (Modal Button) ---
    btnStageBatch.addEventListener('click', (e) => {
        e.preventDefault();
        
        const title = document.getElementById('title').value;
        const obs = document.getElementById('observations').value;

        if (currentFiles.length === 0) {
            alert('Anexe ao menos um arquivo antes de adicionar ao lote.');
            return;
        }

        const batchIndex = stagedBatches.length;
        const now = new Date();
        currentFiles.forEach(f => f.addedAt = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));

        const batch = {
            title: title || 'Lote sem título',
            observation: obs || '',
            timestamp: now.toLocaleString(),
            files: [...currentFiles] // Copia os arquivos
        };
        
        stagedBatches.push(batch);
        renderHistory();
        
        // Limpa e fecha modal
        closeModal();
    });

    // --- Final Submission (Page Button) ---
    btnSavePage.addEventListener('click', async (e) => {
        e.preventDefault(); // EVITA O RELOAD DA PÁGINA!
        
        const eventNameInput = document.getElementById('event-name');
        const eventName = eventNameInput ? eventNameInput.value : '';
        const date = document.getElementById('event-date').value;
        const time = document.getElementById('event-time').value;
        const loc = document.getElementById('event-location').value;
        
        // Find selected designer
        let designer = 'Não selecionado';
        const selectedRow = designersTable.querySelector('tr.selected');
        if (selectedRow) {
            designer = selectedRow.cells[0].textContent.trim();
        }

        // Validate basic event fields
        if (!date || !time || !loc) {
            alert('Preencha os dados obrigatórios do evento (Data, Hora, Local) antes de salvar!');
            return;
        }

        // Start Loading State
        const originalBtnText = btnSavePage.innerHTML;
        btnSavePage.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando Evento e Fazendo Uploads...';
        btnSavePage.disabled = true;

        try {
            // 1. Insert Event Data
            // Passamos event_name caso o input exista
            const eventPayload = { event_date: date, event_time: time, event_location: loc, designer_name: designer };
            if (eventName) {
                eventPayload.event_name = eventName;
            }

            const { data: eventData, error: eventError } = await supabase
                .from('app_upload_events')
                .insert([eventPayload])
                .select();

            if (eventError) throw eventError;
            
            const eventId = eventData[0].id;

            // 2. Insert Observations (Rich Text)
            const observations = [];
            const editorBlocks = document.querySelectorAll('.quill-editor');
            editorBlocks.forEach((block, index) => {
                const htmlContent = block.querySelector('.ql-editor').innerHTML;
                if (htmlContent && htmlContent !== '<p><br></p>') {
                    observations.push({
                        event_id: eventId,
                        content: htmlContent,
                        order_index: index
                    });
                }
            });

            if (observations.length > 0) {
                const { error: obsError } = await supabase
                    .from('app_upload_observations')
                    .insert(observations);
                if (obsError) throw obsError;
            }

            // 3. Insert File Metadata e Upload Físico (Storage) por Lote
            const fileRecords = [];
            
            for (let b = 0; b < stagedBatches.length; b++) {
                const batch = stagedBatches[b];
                
                for (let i = 0; i < batch.files.length; i++) {
                    const f = batch.files[i];
                    
                    const fileExt = f.name.split('.').pop();
                    const uniqueName = `${Date.now()}_b${b}_${i}.${fileExt}`;
                    const filePath = `eventos/${eventId}/${uniqueName}`;

                    // Upload físico
                    const { data: storageData, error: storageError } = await supabase
                        .storage
                        .from('uploads')
                        .upload(filePath, f, {
                            cacheControl: '3600',
                            upsert: false
                        });

                    if (storageError) {
                        console.error("Erro no upload do arquivo:", storageError);
                        alert("Erro ao subir arquivo: " + (storageError.message || JSON.stringify(storageError)));
                        throw storageError; 
                    }

                    // Obter a URL pública
                    const { data: publicUrlData } = supabase
                        .storage
                        .from('uploads')
                        .getPublicUrl(filePath);

                    fileRecords.push({
                        event_id: eventId,
                        file_name: f.name,
                        file_size: f.size,
                        storage_path: publicUrlData.publicUrl,
                        batch_title: batch.title,
                        batch_observation: batch.observation
                    });
                }
            }

            // Grava os dados dos arquivos no Banco
            if (fileRecords.length > 0) {
                const { error: filesError } = await supabase
                    .from('app_upload_files')
                    .insert(fileRecords);
                if (filesError) throw filesError;
            }

            showToast('Evento e arquivos salvos no Supabase com sucesso!', 'success');
            // Limpa apenas os uploads pendentes, mantendo as informações e os lotes salvos na tela
            savedBatches = savedBatches.concat(stagedBatches);
            stagedBatches = [];
            renderHistory();
            
            // As linhas abaixo foram removidas para evitar que o usuário perca o que digitou
            // if (eventNameInput) eventNameInput.value = '';
            // document.getElementById('event-date').value = '';
            // document.getElementById('event-time').value = '';
            // document.getElementById('event-location').value = '';
            // const selectedRow = designersTable.querySelector('tr.selected');
            // if (selectedRow) selectedRow.classList.remove('selected');
            // editorBlocks.forEach(block => block.querySelector('.ql-editor').innerHTML = '');

        } catch (error) {
            console.error('Erro Supabase:', error);
            alert("ERRO: " + (error.message || JSON.stringify(error)));
            showToast('Erro ao salvar no banco de dados.', 'error');
        } finally {
            // Restore button
            btnSavePage.innerHTML = originalBtnText;
            btnSavePage.disabled = false;
        }
    });

    // State
    let currentFiles = [];
    let stagedBatches = [];
    let savedBatches = []; // Armazena lotes que já subiram pro banco

    // --- History UI ---
    function renderHistory() {
        historyList.innerHTML = '';
        
        const totalBatches = stagedBatches.length + savedBatches.length;
        if (totalBatches === 0) {
            historySection.classList.add('hidden');
            document.getElementById('main-empty-state').style.display = 'flex';
            return;
        }

        historySection.classList.remove('hidden');
        document.getElementById('main-empty-state').style.display = 'none';

        // Render both saved and staged (newest first)
        const allBatches = [
            ...stagedBatches.map(b => ({...b, isSaved: false})),
            ...savedBatches.map(b => ({...b, isSaved: true}))
        ];

        for (let b = allBatches.length - 1; b >= 0; b--) {
            const batch = allBatches[b];
            
            const item = document.createElement('div');
            item.className = 'history-item';
            if (batch.isSaved) {
                item.style.borderLeft = '4px solid var(--success)';
                item.style.opacity = '0.85';
            }
            
            const header = document.createElement('div');
            header.className = 'history-item-header';
            
            let statusBadge = batch.isSaved ? `<span style="background: var(--success); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; margin-left: 8px;">Salvo na Nuvem</span>` : '';

            const headerInfo = document.createElement('div');
            headerInfo.innerHTML = `
                <span class="history-title"><strong>Lote:</strong> ${batch.title} ${statusBadge}</span><br>
                <span class="history-meta" style="color: var(--text-muted); font-size: 0.85rem;">Obs: ${batch.observation || 'Sem observação'}</span><br>
                <span class="history-meta" style="color: var(--primary); font-size: 0.8rem; margin-top: 2px; display: inline-block;"><i class="fa-regular fa-clock"></i> Criado em: ${batch.timestamp}</span>
            `;
            
            const btnGroup = document.createElement('div');
            btnGroup.style.display = 'flex';
            btnGroup.style.gap = '0.5rem';

            const btnDownloadZip = document.createElement('button');
            btnDownloadZip.className = 'btn-download-zip';
            btnDownloadZip.innerHTML = `<i class="fa-solid fa-download"></i> Baixar Lote`;
            btnDownloadZip.onclick = () => downloadBatchZip(batch, batch.isSaved);

            btnGroup.appendChild(btnDownloadZip);

            // Apenas botões de edição se o lote NÃO estiver salvo
            if (!batch.isSaved) {
                const btnAddFiles = document.createElement('button');
                btnAddFiles.className = 'btn-add-to-batch';
                btnAddFiles.innerHTML = `<i class="fa-solid fa-plus"></i>`;
                btnAddFiles.title = "Adicionar mais arquivos";
                btnAddFiles.onclick = () => {
                    const hiddenInput = document.createElement('input');
                    hiddenInput.type = 'file';
                    hiddenInput.multiple = true;
                    hiddenInput.onchange = (e) => {
                        const newFiles = Array.from(e.target.files);
                        if (newFiles.length > 0) {
                            const addedTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                            newFiles.forEach(f => f.addedAt = addedTime);
                            // Precisamos achar o índice real no stagedBatches
                            const realIndex = stagedBatches.indexOf(batch);
                            if (realIndex > -1) {
                                stagedBatches[realIndex].files.push(...newFiles);
                                renderHistory();
                            }
                        }
                    };
                    hiddenInput.click();
                };

                const btnDeleteBatch = document.createElement('button');
                btnDeleteBatch.className = 'btn-delete-batch';
                btnDeleteBatch.innerHTML = `<i class="fa-solid fa-trash"></i>`;
                btnDeleteBatch.title = "Excluir Lote";
                btnDeleteBatch.onclick = () => {
                    if (confirm('Tem certeza que deseja excluir este lote inteiro?')) {
                        const realIndex = stagedBatches.indexOf(batch);
                        if (realIndex > -1) {
                            stagedBatches.splice(realIndex, 1);
                            renderHistory();
                        }
                    }
                };

                btnGroup.appendChild(btnAddFiles);
                btnGroup.appendChild(btnDeleteBatch);
            }

            header.appendChild(headerInfo);
            header.appendChild(btnGroup);

            const filesGrid = document.createElement('div');
            filesGrid.className = 'history-files preview-grid';
            filesGrid.style.padding = '0.5rem 0';

            batch.files.forEach((file, fIndex) => {
                const thumb = createHistoryThumbnail(file);
                
                // Add individual remove button Apenas se NÃO estiver salvo
                if (!batch.isSaved) {
                    const btnRemoveFile = document.createElement('button');
                    btnRemoveFile.className = 'btn-remove-file';
                    btnRemoveFile.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                    btnRemoveFile.onclick = (e) => {
                        e.stopPropagation();
                        if (confirm('Tem certeza que deseja excluir esta imagem do lote?')) {
                            const realIndex = stagedBatches.indexOf(batch);
                            if (realIndex > -1) {
                                stagedBatches[realIndex].files.splice(fIndex, 1);
                                if (stagedBatches[realIndex].files.length === 0) {
                                    stagedBatches.splice(realIndex, 1); // remove batch if empty
                                }
                                renderHistory();
                            }
                        }
                    };
                    thumb.appendChild(btnRemoveFile);
                }
                
                filesGrid.appendChild(thumb);
            });

            item.appendChild(header);
            item.appendChild(filesGrid);
            
            historyList.appendChild(item);
        }
    }
    
    function createHistoryThumbnail(file) {
        const fileType = file.type;
        const thumb = document.createElement('div');
        thumb.className = 'preview-thumbnail';
        thumb.style.cursor = 'pointer';
        
        const fileUrl = URL.createObjectURL(file);

        if (fileType.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = fileUrl;
            thumb.appendChild(img);
        } else if (fileType.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = fileUrl;
            thumb.appendChild(video);
        } else {
            let iconClass = 'fa-file';
            if (fileType.startsWith('audio/')) iconClass = 'fa-file-audio';
            else if (fileType === 'application/pdf') iconClass = 'fa-file-pdf';
            else if (fileType.includes('text') || file.name.endsWith('.txt')) iconClass = 'fa-file-lines';
            else if (file.name.endsWith('.zip') || file.name.endsWith('.rar')) iconClass = 'fa-file-zipper';
            else if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) iconClass = 'fa-file-excel';
            else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) iconClass = 'fa-file-word';
            
            thumb.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
        }

        const nameSpan = document.createElement('span');
        nameSpan.className = 'thumb-name';
        nameSpan.textContent = file.name;
        nameSpan.title = file.name;
        thumb.appendChild(nameSpan);

        // Click event to open lightbox
        thumb.addEventListener('click', () => {
            openLightbox(file, fileUrl);
        });

        if (file.addedAt) {
            const timeSpan = document.createElement('span');
            timeSpan.className = 'thumb-timestamp';
            timeSpan.textContent = file.addedAt;
            thumb.appendChild(timeSpan);
        }

        return thumb;
    }

    function openLightbox(file, fileUrl) {
        lightboxTitle.textContent = file.name;
        lightboxDownloadBtn.href = fileUrl;
        lightboxDownloadBtn.download = file.name;
        lightboxBody.innerHTML = '';
        
        const fileType = file.type;
        
        if (fileType.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = fileUrl;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.style.objectFit = 'contain';
            lightboxBody.appendChild(img);
        } else if (fileType.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = fileUrl;
            video.controls = true;
            video.style.maxWidth = '100%';
            video.style.maxHeight = '100%';
            lightboxBody.appendChild(video);
        } else if (fileType.startsWith('audio/')) {
            const audio = document.createElement('audio');
            audio.src = fileUrl;
            audio.controls = true;
            lightboxBody.appendChild(audio);
        } else if (fileType === 'application/pdf') {
            const iframe = document.createElement('iframe');
            iframe.src = fileUrl;
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            lightboxBody.appendChild(iframe);
        } else {
            const fallback = document.createElement('div');
            fallback.style.textAlign = 'center';
            fallback.style.color = 'var(--text-muted)';
            fallback.innerHTML = `<i class="fa-solid fa-file" style="font-size: 4rem; margin-bottom: 1rem;"></i><br><p>Nenhuma pré-visualização disponível.<br>Utilize o botão abaixo para baixar.</p>`;
            lightboxBody.appendChild(fallback);
        }
        
        lightboxModal.classList.remove('hidden');
    }

    // --- Utilities ---
    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    // --- Designers Table Selection ---
    const designerRows = document.querySelectorAll('.designer-row');
    designerRows.forEach(row => {
        row.addEventListener('click', () => {
            designerRows.forEach(r => r.classList.remove('selected'));
            row.classList.add('selected');
        });
    });

    function showToast() {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
});
