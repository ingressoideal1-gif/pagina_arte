document.addEventListener('DOMContentLoaded', () => {
    
    // --- Supabase Configuração ---
    const SUPABASE_URL = 'https://ferumcflobtwjfxyoeng.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_dbhmPRshI-RE1QTOnY4fWg_9LLDYBUA';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // --- Elements ---
    const form = document.getElementById('observation-form');
    const toast = document.getElementById('toast');
    const btnSaveAll = document.getElementById('submit-btn'); // Assuming submit-btn triggers this
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

    // --- Final Submission ---
    btnSaveAll.addEventListener('click', async () => {
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
            showToast('Preencha os dados obrigatórios do evento antes de salvar!', 'error');
            return;
        }

        if (currentFiles.length === 0) {
            showToast('Anexe ao menos um arquivo antes de salvar.', 'error');
            return;
        }

        // Start Loading State
        const originalBtnText = btnSaveAll.innerHTML;
        btnSaveAll.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
        btnSaveAll.disabled = true;

        try {
            // 1. Insert Event Data
            const { data: eventData, error: eventError } = await supabase
                .from('app_upload_events')
                .insert([
                    { event_date: date, event_time: time, event_location: loc, designer_name: designer }
                ])
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

            // 3. Insert File Metadata e Upload Físico (Storage)
            const fileRecords = [];
            
            for (let i = 0; i < currentFiles.length; i++) {
                const f = currentFiles[i];
                
                // Gerar nome único para o arquivo no Storage para evitar sobreposições
                const fileExt = f.name.split('.').pop();
                const uniqueName = `${Date.now()}_${i}.${fileExt}`;
                const filePath = `eventos/${eventId}/${uniqueName}`;

                // Faz o Upload físico do arquivo para o Bucket 'uploads'
                const { data: storageData, error: storageError } = await supabase
                    .storage
                    .from('uploads')
                    .upload(filePath, f, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (storageError) {
                    console.error("Erro no upload do arquivo:", storageError);
                    showToast(`Falha ao enviar o arquivo: ${f.name}`, 'error');
                    throw storageError; 
                }

                // Obter a URL pública do arquivo recém-upado
                const { data: publicUrlData } = supabase
                    .storage
                    .from('uploads')
                    .getPublicUrl(filePath);

                fileRecords.push({
                    event_id: eventId,
                    file_name: f.name,
                    file_size: f.size,
                    storage_path: publicUrlData.publicUrl
                });
            }

            // Grava os dados do arquivo no Banco de Dados
            if (fileRecords.length > 0) {
                const { error: filesError } = await supabase
                    .from('app_upload_files')
                    .insert(fileRecords);
                if (filesError) throw filesError;
            }

            // Update History List visually
            addHistoryItem(date, loc, designer, currentFiles);
            
            // Limpar lista atual para proximo envio
            currentFiles = [];
            resetModalInner();

            showToast('Lote de arquivos e dados salvos no Supabase com sucesso!', 'success');

        } catch (error) {
            console.error('Erro Supabase:', error);
            showToast('Erro ao salvar no banco de dados. Verifique a conexão.', 'error');
        } finally {
            // Restore button
            btnSaveAll.innerHTML = originalBtnText;
            btnSaveAll.disabled = false;
        }
    });

    function addHistoryItem(date, loc, designer, filesArr) {
        historySection.classList.remove('hidden');
        
        const now = new Date();
        const timeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const dateString = now.toLocaleDateString('pt-BR');
        
        const div = document.createElement('div');
        div.className = 'history-item';
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'history-header';
        infoDiv.innerHTML = `
            <span class="history-title">Data: ${date} | Local: ${loc}</span>
            <span class="history-date">${dateString} às ${timeString}</span>
        `;
        div.appendChild(infoDiv);

        const filesContainer = document.createElement('div');
        filesContainer.className = 'history-files preview-grid';
        filesContainer.style.padding = '0.5rem 0';
        
        filesArr.forEach(file => {
            const thumb = createHistoryThumbnail(file);
            filesContainer.appendChild(thumb);
        });
        div.appendChild(filesContainer);

        const obsDiv = document.createElement('div');
        obsDiv.className = 'history-obs';
        obsDiv.innerHTML = `<strong>Designer:</strong> ${designer} &nbsp;|&nbsp; <strong>Total:</strong> ${filesArr.length} arquivo(s)`;
        div.appendChild(obsDiv);

        // Prepend to top of list
        historyList.insertBefore(div, historyList.firstChild);
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
