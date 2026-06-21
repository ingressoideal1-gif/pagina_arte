import re

with open('script.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Substitute btnAddEditor logic
add_editor_old = """    // Adiciona nova janela inteira de observação
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
    });"""

add_editor_new = """    function attachBlockEvents(blockEl) {
        const btnToggle = blockEl.querySelector('.btn-toggle-block');
        const btnDelete = blockEl.querySelector('.btn-delete-block');
        const editorBlock = blockEl.querySelector('.editor-block');
        
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

    // Adiciona nova janela inteira de observação
    btnAddEditor.addEventListener('click', () => {
        const newWindow = document.createElement('div');
        newWindow.className = 'form-group observation-window';
        newWindow.style.margin = '0';
        newWindow.style.position = 'relative';
        
        newWindow.innerHTML = `
            <div class="block-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; background: var(--bg-color); padding: 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                <div style="flex: 1; margin-right: 1rem;">
                    <input type="text" class="block-title-input" placeholder="Nome do Bloco (ex: Copos, Pulseiras)" style="width: 100%; font-weight: bold; font-size: 1.05rem; border: none; background: transparent; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.2rem; color: var(--text-color); outline: none;">
                </div>
                <div class="block-actions" style="display: flex; gap: 0.5rem;">
                    <button type="button" class="btn-toggle-block" title="Minimizar / Expandir Bloco" style="background: transparent; border: 1px solid var(--border-color); color: var(--text-color); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.2s;">
                        <i class="fa-solid fa-chevron-up"></i>
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
        attachBlockEvents(newWindow);
    });"""

code = code.replace(add_editor_old, add_editor_new)

# 2. Substitute btnSavePage saving logic for JSON
save_obs_old = """            // 2. Observations
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
            });"""

save_obs_new = """            // 2. Observations
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
            });"""

code = code.replace(save_obs_old, save_obs_new)

# 3. Substitute loadEvent parsing logic
load_obs_old = """            // Preenche
            obsData.forEach((obs, index) => {
                if (index === 0) {
                    firstBlock.querySelector('.ql-editor').innerHTML = obs.content;
                } else {
                    document.getElementById('btn-add-editor').click();
                    const allBlocks = document.querySelectorAll('.quill-editor');
                    const newBlock = allBlocks[allBlocks.length - 1];
                    newBlock.querySelector('.ql-editor').innerHTML = obs.content;
                }
            });"""

load_obs_new = """            // Preenche
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
                    document.getElementById('btn-add-editor').click();
                    const allWindows = document.querySelectorAll('.observation-window');
                    targetBlock = allWindows[allWindows.length - 1];
                }
                
                targetBlock.querySelector('.ql-editor').innerHTML = html;
                const titleInput = targetBlock.querySelector('.block-title-input');
                if (titleInput) titleInput.value = title;
            });"""

code = code.replace(load_obs_old, load_obs_new)

# 4. Clean up "Novo Evento" clearing logic to clear titles
clear_old = """                const editorBlocks = document.querySelectorAll('.quill-editor');
                editorBlocks.forEach((block, index) => {
                    if (index === 0) {
                        block.querySelector('.ql-editor').innerHTML = '';
                    } else {
                        block.closest('.observation-window').remove();
                    }
                });"""

clear_new = """                const obsWindows = document.querySelectorAll('.observation-window');
                obsWindows.forEach((block, index) => {
                    if (index === 0) {
                        block.querySelector('.ql-editor').innerHTML = '';
                        const titleInput = block.querySelector('.block-title-input');
                        if (titleInput) titleInput.value = '';
                    } else {
                        block.remove();
                    }
                });"""

code = code.replace(clear_old, clear_new)

with open('script.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Blocks patch applied successfully!")
