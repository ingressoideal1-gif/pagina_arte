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
        enableTime: true,
        dateFormat: "d/m/Y H:i",
        time_24hr: true,
        minDate: "today",
        disableMobile: "true"
    });

    // --- Rich Text Editors (Quill) ---
    const observationsRoot = document.getElementById('observations-root-container');
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
        const qlToolbar = firstEditorEl.parentElement.parentElement.querySelector('.ql-toolbar');
        const toolbarContainer = firstEditorEl.parentElement.parentElement.querySelector('.toolbar-container');
        if (qlToolbar && toolbarContainer) {
            toolbarContainer.appendChild(qlToolbar);
            qlToolbar.style.border = 'none';
            qlToolbar.style.padding = '0';
            qlToolbar.style.width = '100%';
        }
    }

    function attachBlockEvents(blockEl) {
        const btnAdd = blockEl.querySelector('.btn-add-block');
        const btnToggle = blockEl.querySelector('.btn-toggle-block');
        const btnDelete = blockEl.querySelector('.btn-delete-block');
        const editorBlock = blockEl.querySelector('.editor-block');
        
        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                window.addNewObservationBlock();
            });
        }
        
        if (btnToggle) {
            btnToggle.addEventListener('click', () => {
                if (editorBlock.style.display === 'none') {
                    editorBlock.style.display = 'block';
                    btnToggle.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
                } else {
                    editorBlock.style.display = 'none';
                    btnToggle.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
                }
            });
        }
        
        if (btnDelete) {
            btnDelete.addEventListener('click', () => {
                const allBlocks = document.querySelectorAll('.observation-window');
                if (allBlocks.length === 1) {
                    blockEl.querySelector('.ql-editor').innerHTML = '';
                    const titleInput = blockEl.querySelector('.block-title-input');
                    if (titleInput) titleInput.value = '';
                    showToast('O último bloco foi limpo.', 'info');
                } else {
                    if (confirm('Deseja excluir este bloco?')) {
                        blockEl.remove();
                    }
                }
            });
        }
    }

    const firstWindowEl = observationsRoot.querySelector('.observation-window');
    if (firstWindowEl) {
        attachBlockEvents(firstWindowEl);
    }

    if (window.Sortable) {
        new Sortable(observationsRoot, {
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'sortable-ghost'
        });
    }

    // Adiciona nova janela inteira de observação
    window.addNewObservationBlock = function() {
        const newWindow = document.createElement('div');
        newWindow.className = 'form-group observation-window';
        newWindow.style.margin = '0';
        newWindow.style.position = 'relative';
        
        newWindow.innerHTML = `
            <div class="block-header" style="display: flex; flex-direction: row; flex-wrap: nowrap; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; background: var(--bg-color); padding: 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); gap: 0.5rem;">
                <div class="drag-handle" title="Arrastar para reordenar" style="cursor: grab; color: var(--text-muted); padding: 0 0.2rem;">
                    <i class="fa-solid fa-grip-vertical"></i>
                </div>
                <button type="button" class="btn-toggle-block" title="Minimizar / Expandir Bloco" style="background: transparent; border: none; color: var(--text-color); padding: 0.2rem 0.4rem; cursor: pointer; transition: all 0.2s;">
                    <i class="fa-solid fa-chevron-up"></i>
                </button>
                <div style="flex: 1; min-width: 100px;">
                    <input type="text" class="block-title-input" placeholder="Nome do Bloco (ex: Copos, Pulseiras)" style="width: 100%; font-weight: bold; font-size: 1.05rem; border: none; background: transparent; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.2rem; color: var(--text-color); outline: none;">
                </div>
                <div class="toolbar-container" style="flex: 0 0 auto; display: flex; align-items: center;"></div>
                <div class="block-actions" style="flex: 0 0 auto; display: flex; gap: 0.5rem;">
                    <button type="button" class="btn-add-block" title="Adicionar Bloco" style="background: transparent; border: 1px solid var(--border-color); color: var(--primary); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.2s;">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                    <button type="button" class="btn-delete-block" title="Excluir Bloco" style="background: transparent; border: 1px solid var(--border-color); color: var(--danger); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.2s;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="editor-block">
                <div class="quill-editor"></div>
            </div>
        `;
        
        observationsRoot.appendChild(newWindow);
        const newEditorEl = newWindow.querySelector('.quill-editor');
        new Quill(newEditorEl, quillOptions);
        
        const qlToolbar = newWindow.querySelector('.ql-toolbar');
        const toolbarContainer = newWindow.querySelector('.toolbar-container');
        if (qlToolbar && toolbarContainer) {
            toolbarContainer.appendChild(qlToolbar);
            qlToolbar.style.border = 'none';
            qlToolbar.style.padding = '0';
            qlToolbar.style.width = '100%';
        }
        
        attachBlockEvents(newWindow);
    };

    // State
    let currentFiles = [];
    let stagedBatches = [];
    let savedBatches = []; // Armazena lotes que já subiram pro banco
    let currentEditingEventId = null;

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
    function handleFiles(files) {
        if (files.length === 0) return;
        currentFiles = Array.from(files);
        openModal();
    }

    function getFileTypeFromName(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image/' + ext;
        if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return 'video/' + ext;
        if (['mp3', 'wav', 'ogg'].includes(ext)) return 'audio/' + ext;
        if (ext === 'pdf') return 'application/pdf';
        if (['zip', 'rar', '7z'].includes(ext)) return 'application/zip';
        if (['txt', 'csv'].includes(ext)) return 'text/plain';
        return 'application/octet-stream';
    }

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
            } else if (fileType === 'application/pdf') {
                const iframe = document.createElement('iframe');
                iframe.src = URL.createObjectURL(file) + '#toolbar=0&navpanes=0&scrollbar=0';
                thumb.appendChild(iframe);
            } else {
                let iconClass = 'fa-file';
                if (fileType.startsWith('audio/')) iconClass = 'fa-file-audio';
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

    
    // --- Novo Evento / Limpar Tela ---
    const btnNewEvent = document.getElementById('btn-new-event');
    if (btnNewEvent) {
        btnNewEvent.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja limpar a tela e criar um novo evento?')) {
                currentEditingEventId = null;
                savedBatches = [];
                stagedBatches = [];
                renderHistory();
                
                const eventNameInput = document.getElementById('event-name');
                if (eventNameInput) eventNameInput.value = '';
                document.getElementById('event-date').value = '';
                const timeEl = document.getElementById('event-time');
                if (timeEl) timeEl.value = '';
                document.getElementById('event-location').value = '';
                
                const selectedRow = designersTable.querySelector('tr.selected');
                if (selectedRow) selectedRow.classList.remove('selected');
                
                const obsWindows = document.querySelectorAll('.observation-window');
                obsWindows.forEach((block, index) => {
                    if (index === 0) {
                        block.querySelector('.ql-editor').innerHTML = '';
                        const titleInput = block.querySelector('.block-title-input');
                        if (titleInput) titleInput.value = '';
                    } else {
                        block.remove();
                    }
                });
                
                showToast('Tela limpa para um novo evento.', 'success');
            }
        });
    }

    // --- Final Submission (Page Button) ---

    btnSavePage.addEventListener('click', async (e) => {
        e.preventDefault(); // EVITA O RELOAD DA PÁGINA!
        
        const eventNameInput = document.getElementById('event-name');
        const eventName = eventNameInput ? eventNameInput.value : '';
        const date = document.getElementById('event-date').value;
        const timeEl = document.getElementById('event-time');
        const time = timeEl ? timeEl.value : null;
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
            const eventPayload = { event_date: date, event_time: time, event_location: loc, designer_name: designer };
            if (eventName) {
                eventPayload.event_name = eventName;
            }

            let eventId;
            if (currentEditingEventId) {
                // UPDATE
                const { error: eventError } = await supabase
                    .from('app_upload_events')
                    .update(eventPayload)
                    .eq('id', currentEditingEventId);
                if (eventError) throw eventError;
                eventId = currentEditingEventId;
            } else {
                // INSERT
                const { data: eventData, error: eventError } = await supabase
                    .from('app_upload_events')
                    .insert([eventPayload])
                    .select();
                if (eventError) throw eventError;
                eventId = eventData[0].id;
                currentEditingEventId = eventId;
            }

            // 2. Observations
            const observations = [];
            const obsWindows = document.querySelectorAll('.observation-window');
            obsWindows.forEach((block, index) => {
                const htmlContent = block.querySelector('.ql-editor').innerHTML;
                const titleInput = block.querySelector('.block-title-input');
                const title = titleInput ? titleInput.value.trim() : '';
                
                if (htmlContent && htmlContent !== '<p><br></p>') {
                    const payload = JSON.stringify({ title: title, html: htmlContent });
                    observations.push({
                        event_id: eventId,
                        content: payload,
                        order_index: index
                    });
                }
            });

            // Se for update, deletar antigos primeiro
            if (currentEditingEventId) {
                await supabase.from('app_upload_observations').delete().eq('event_id', eventId);
            }
            
            if (observations.length > 0) {
                const { error: obsError } = await supabase
                    .from('app_upload_observations')
                    .insert(observations);
                if (obsError) throw obsError;
            }

            // 3. Upload new files (stagedBatches only)
            const fileRecords = [];
            for (let b = 0; b < stagedBatches.length; b++) {
                const batch = stagedBatches[b];
                for (let i = 0; i < batch.files.length; i++) {
                    const f = batch.files[i];
                    const fileExt = f.name.split('.').pop();
                    const uniqueName = `${Date.now()}_b${b}_${i}.${fileExt}`;
                    const filePath = `eventos/${eventId}/${uniqueName}`;

                    const { error: storageError } = await supabase.storage.from('uploads').upload(filePath, f, { cacheControl: '3600', upsert: false });
                    if (storageError) { throw storageError; }

                    const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filePath);

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

            if (fileRecords.length > 0) {
                const { error: filesError } = await supabase.from('app_upload_files').insert(fileRecords);
                if (filesError) throw filesError;
            }

            showToast('Evento salvo com sucesso!', 'success');
            
            savedBatches = savedBatches.concat(stagedBatches);
            stagedBatches = [];
            renderHistory();
            fetchSavedEvents(); // Refresh sidebar
            
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

            const totalBytes = batch.files.reduce((acc, file) => acc + (file.size || 0), 0);
            const totalSizeFormatted = formatBytes(totalBytes);

            const headerInfo = document.createElement('div');
            headerInfo.innerHTML = `
                <span class="history-title"><strong>Lote:</strong> ${batch.title} ${statusBadge}</span><br>
                <span class="history-meta" style="color: var(--text-muted); font-size: 0.85rem;">Obs: ${batch.observation || 'Sem observação'} | <strong>Tamanho:</strong> ${totalSizeFormatted}</span><br>
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
        
        let fileUrl;
        if (file.remoteUrl) {
            fileUrl = file.remoteUrl;
        } else {
            fileUrl = URL.createObjectURL(file);
        }

        if (fileType.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = fileUrl;
            thumb.appendChild(img);
        } else if (fileType.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = fileUrl;
            thumb.appendChild(video);
        } else if (fileType === 'application/pdf') {
            const iframe = document.createElement('iframe');
            iframe.src = fileUrl + '#toolbar=0&navpanes=0&scrollbar=0';
            thumb.appendChild(iframe);
        } else {
            let iconClass = 'fa-file';
            if (fileType.startsWith('audio/')) iconClass = 'fa-file-audio';
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


    // --- Saved Events Sidebar Logic ---
    async function fetchSavedEvents() {
        const listEl = document.getElementById('saved-events-list');
        if (!listEl) return;
        
        const { data, error } = await supabase
            .from('app_upload_events')
            .select('id, event_name, event_date')
            .order('id', { ascending: false });
            
        if (error) {
            console.error('Erro ao buscar eventos:', error);
            listEl.innerHTML = '<li style="color:red; padding:1rem;">Erro ao carregar</li>';
            return;
        }
        
        listEl.innerHTML = '';
        if (data.length === 0) {
            listEl.innerHTML = '<li style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 1rem;">Nenhum evento salvo</li>';
            return;
        }
        
        data.forEach(event => {
            const li = document.createElement('li');
            li.className = 'saved-event-item';
            li.onclick = () => window.loadEvent(event.id);
            li.innerHTML = `
                <div class="saved-event-title">${event.event_name || 'Sem título'}</div>
                <div class="saved-event-meta"><i class="fa-regular fa-calendar"></i> ${event.event_date}</div>
                <button class="btn-delete-event" onclick="event.stopPropagation(); window.deleteEvent('${event.id}')" title="Excluir evento"><i class="fa-solid fa-trash"></i></button>
            `;
            listEl.appendChild(li);
        });
    }

    window.deleteEvent = async function(eventId) {
        if (!confirm('Tem certeza que deseja excluir PERMANENTEMENTE este evento e todos os seus anexos do banco de dados? Esta ação não pode ser desfeita.')) return;
        
        try {
            showToast('Excluindo...', 'info');
            
            // 1. Fetch file paths to delete from storage
            const { data: filesData } = await supabase.from('app_upload_files').select('storage_path').eq('event_id', eventId);
            if (filesData && filesData.length > 0) {
                const pathsToRemove = filesData.map(f => {
                    const urlParts = f.storage_path.split('/uploads/');
                    return urlParts.length > 1 ? urlParts[1] : null;
                }).filter(p => p !== null);
                
                if (pathsToRemove.length > 0) {
                    await supabase.storage.from('uploads').remove(pathsToRemove);
                }
            }
            
            // 2. Delete DB records
            await supabase.from('app_upload_files').delete().eq('event_id', eventId);
            await supabase.from('app_upload_observations').delete().eq('event_id', eventId);
            
            const { error: eventError } = await supabase.from('app_upload_events').delete().eq('id', eventId);
            if (eventError) throw eventError;
            
            // If deleting the current editing event, reset UI
            if (currentEditingEventId === eventId) {
                const btnNewEvent = document.getElementById('btn-new-event');
                if (btnNewEvent) btnNewEvent.click(); // Uses the logic we already created to clear the screen!
            }
            
            showToast('Evento excluído com sucesso!', 'success');
            fetchSavedEvents();
        } catch (error) {
            console.error('Erro ao excluir evento:', error);
            alert("ERRO ao excluir: " + (error.message || JSON.stringify(error)));
        }
    };

    window.loadEvent = async function(eventId) {
        if (!confirm('Deseja carregar este evento? As mudanças não salvas na tela atual serão perdidas.')) return;
        
        try {
            showToast('Carregando evento...', 'info');
            
            // 1. Fetch Event
            const { data: eventData, error: eventError } = await supabase
                .from('app_upload_events')
                .select('*')
                .eq('id', eventId)
                .single();
            if (eventError) throw eventError;
            
            currentEditingEventId = eventId;
            
            const eventNameInput = document.getElementById('event-name');
            if (eventNameInput) eventNameInput.value = eventData.event_name || '';
            
            let fullDate = eventData.event_date || '';
            if (eventData.event_time) {
                fullDate += ' ' + eventData.event_time;
            }
            document.getElementById('event-date').value = fullDate;
            
            const timeElLoad = document.getElementById('event-time');
            if (timeElLoad) timeElLoad.value = eventData.event_time || '';
            document.getElementById('event-location').value = eventData.event_location || '';
            
            // Select designer
            const designerRows = designersTable.querySelectorAll('tr.designer-row');
            designerRows.forEach(row => {
                if (row.cells[0].textContent.trim() === eventData.designer_name) {
                    row.classList.add('selected');
                } else {
                    row.classList.remove('selected');
                }
            });
            
            // 2. Fetch Observations
            const { data: obsData, error: obsError } = await supabase
                .from('app_upload_observations')
                .select('*')
                .eq('event_id', eventId)
                .order('order_index', { ascending: true });
            if (obsError) throw obsError;
            
            // Limpa as janelas extras
            const editorBlocks = document.querySelectorAll('.quill-editor');
            editorBlocks.forEach((block, index) => {
                if (index > 0) block.closest('.observation-window').remove();
            });
            const firstBlock = document.querySelector('.quill-editor');
            if (firstBlock) firstBlock.querySelector('.ql-editor').innerHTML = '';
            
            // Preenche
            obsData.forEach((obs, index) => {
                let title = '';
                let html = obs.content;
                
                if (obs.content && obs.content.startsWith('{')) {
                    try {
                        const parsed = JSON.parse(obs.content);
                        if (parsed.html !== undefined) {
                            title = parsed.title || '';
                            html = parsed.html;
                        }
                    } catch (e) {}
                }
                
                let targetBlock;
                if (index === 0) {
                    targetBlock = firstBlock.closest('.observation-window');
                } else {
                    window.addNewObservationBlock();
                    const allWindows = document.querySelectorAll('.observation-window');
                    targetBlock = allWindows[allWindows.length - 1];
                }
                
                targetBlock.querySelector('.ql-editor').innerHTML = html;
                const titleInput = targetBlock.querySelector('.block-title-input');
                if (titleInput) titleInput.value = title;
            });
            
            // 3. Fetch Files
            const { data: filesData, error: filesError } = await supabase
                .from('app_upload_files')
                .select('*')
                .eq('event_id', eventId);
            if (filesError) throw filesError;
            
            savedBatches = [];
            stagedBatches = [];
            
            // Agrupar arquivos por batch_title + batch_observation
            const batchMap = {};
            filesData.forEach(file => {
                const dbDate = new Date(file.created_at);
                const fileAddedAt = dbDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const batchTimestamp = dbDate.toLocaleString();

                const key = `${file.batch_title}|||${file.batch_observation}`;
                if (!batchMap[key]) {
                    batchMap[key] = {
                        title: file.batch_title,
                        observation: file.batch_observation,
                        timestamp: batchTimestamp,
                        files: [],
                        isSaved: true
                    };
                }
                // Convertendo file row para o objeto de arquivo que a UI espera (sem URL local, usamos a URL do Supabase para preview)
                batchMap[key].files.push({
                    name: file.file_name,
                    size: file.file_size,
                    type: getFileTypeFromName(file.file_name),
                    addedAt: fileAddedAt,
                    remoteUrl: file.storage_path // Campo customizado para o createHistoryThumbnail
                });
            });
            
            savedBatches = Object.values(batchMap);
            renderHistory();
            
            showToast('Evento carregado com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao carregar evento:', error);
            alert("ERRO ao carregar: " + (error.message || JSON.stringify(error)));
        }
    };

    fetchSavedEvents();

});
