import re

with open('script.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update attachBlockEvents
old_attach = """    function attachBlockEvents(blockEl) {
        const btnToggle = blockEl.querySelector('.btn-toggle-block');
        const btnDelete = blockEl.querySelector('.btn-delete-block');
        const editorBlock = blockEl.querySelector('.editor-block');"""

new_attach = """    function attachBlockEvents(blockEl) {
        const btnAdd = blockEl.querySelector('.btn-add-block');
        const btnToggle = blockEl.querySelector('.btn-toggle-block');
        const btnDelete = blockEl.querySelector('.btn-delete-block');
        const editorBlock = blockEl.querySelector('.editor-block');
        
        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                window.addNewObservationBlock();
            });
        }"""

code = code.replace(old_attach, new_attach)

# 2. Update btnAddEditor logic to global function
old_add_btn = """    // Adiciona nova janela inteira de observação
    btnAddEditor.addEventListener('click', () => {"""

new_add_btn = """    // Adiciona nova janela inteira de observação
    window.addNewObservationBlock = function() {"""

code = code.replace(old_add_btn, new_add_btn)

# 3. Add btn-add-block to the generated HTML inside addNewObservationBlock
old_html = """                <div class="block-actions" style="display: flex; gap: 0.5rem;">
                    <button type="button" class="btn-toggle-block" title="Minimizar / Expandir Bloco" style="background: transparent; border: 1px solid var(--border-color); color: var(--text-color); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.2s;">
                        <i class="fa-solid fa-chevron-up"></i>
                    </button>"""

new_html = """                <div class="block-actions" style="display: flex; gap: 0.5rem;">
                    <button type="button" class="btn-add-block" title="Adicionar Bloco" style="background: transparent; border: 1px solid var(--border-color); color: var(--primary); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.2s;">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                    <button type="button" class="btn-toggle-block" title="Minimizar / Expandir Bloco" style="background: transparent; border: 1px solid var(--border-color); color: var(--text-color); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.2s;">
                        <i class="fa-solid fa-chevron-up"></i>
                    </button>"""

code = code.replace(old_html, new_html)

# 4. Update loadEvent
old_load = """                } else {
                    document.getElementById('btn-add-editor').click();
                    const allWindows = document.querySelectorAll('.observation-window');"""

new_load = """                } else {
                    window.addNewObservationBlock();
                    const allWindows = document.querySelectorAll('.observation-window');"""

code = code.replace(old_load, new_load)

# 5. Remove btnAddEditor variable
code = re.sub(r"const btnAddEditor = document\.getElementById\('btn-add-editor'\);\s*", "", code)

with open('script.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patch applied")
