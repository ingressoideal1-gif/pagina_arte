import re

with open('script.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add currentEditingEventId
code = code.replace("let savedBatches = []; // Armazena lotes que já subiram pro banco", 
                    "let savedBatches = []; // Armazena lotes que já subiram pro banco\n    let currentEditingEventId = null;")

# 2. Add btn-new-event logic right before btnSavePage
new_event_logic = """
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
                document.getElementById('event-time').value = '';
                document.getElementById('event-location').value = '';
                
                const selectedRow = designersTable.querySelector('tr.selected');
                if (selectedRow) selectedRow.classList.remove('selected');
                
                const editorBlocks = document.querySelectorAll('.quill-editor');
                editorBlocks.forEach((block, index) => {
                    if (index === 0) {
                        block.querySelector('.ql-editor').innerHTML = '';
                    } else {
                        block.closest('.observation-window').remove();
                    }
                });
                
                showToast('Tela limpa para um novo evento.', 'success');
            }
        });
    }

    // --- Final Submission (Page Button) ---
"""
code = code.replace("// --- Final Submission (Page Button) ---", new_event_logic)

# 3. Replace btnSavePage logic
save_logic_old = """        try {
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
            renderHistory();"""

save_logic_new = """        try {
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
            fetchSavedEvents(); // Refresh sidebar"""

code = code.replace(save_logic_old, save_logic_new)

# 4. Add fetchSavedEvents and loadEvent at the end
end_logic = """

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
            `;
            listEl.appendChild(li);
        });
    }

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
            document.getElementById('event-date').value = eventData.event_date || '';
            document.getElementById('event-time').value = eventData.event_time || '';
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
                if (index === 0) {
                    firstBlock.querySelector('.ql-editor').innerHTML = obs.content;
                } else {
                    document.getElementById('btn-add-editor').click();
                    const allBlocks = document.querySelectorAll('.quill-editor');
                    const newBlock = allBlocks[allBlocks.length - 1];
                    newBlock.querySelector('.ql-editor').innerHTML = obs.content;
                }
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
                const key = `${file.batch_title}|||${file.batch_observation}`;
                if (!batchMap[key]) {
                    batchMap[key] = {
                        title: file.batch_title,
                        observation: file.batch_observation,
                        timestamp: 'Carregado do Banco',
                        files: []
                    };
                }
                // Convertendo file row para o objeto de arquivo que a UI espera (sem URL local, usamos a URL do Supabase para preview)
                batchMap[key].files.push({
                    name: file.file_name,
                    size: file.file_size,
                    type: file.file_name.endsWith('pdf') ? 'application/pdf' : 'image/jpeg',
                    addedAt: 'Carregado',
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
"""

code = re.sub(r'}\);\s*$', end_logic + '\n});\n', code)

with open('script.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patch applied successfully.")
