import re

# 1. Update index.html
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_header_html = """                        <div class="block-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; background: var(--bg-color); padding: 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                            <div style="flex: 1; margin-right: 1rem;">
                                <input type="text" class="block-title-input" placeholder="Nome do Bloco (ex: Copos, Pulseiras)" style="width: 100%; font-weight: bold; font-size: 1.05rem; border: none; background: transparent; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.2rem; color: var(--text-color); outline: none;">
                            </div>
                            <div class="block-actions" style="display: flex; gap: 0.5rem;">"""

new_header_html = """                        <div class="block-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; background: var(--bg-color); padding: 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); gap: 1rem;">
                            <div style="flex: 0 0 30%;">
                                <input type="text" class="block-title-input" placeholder="Nome do Bloco (ex: Copos, Pulseiras)" style="width: 100%; font-weight: bold; font-size: 1.05rem; border: none; background: transparent; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.2rem; color: var(--text-color); outline: none;">
                            </div>
                            <div class="toolbar-container" style="flex: 1; min-width: 0; display: flex; align-items: center; overflow-x: auto; padding-bottom: 0;"></div>
                            <div class="block-actions" style="display: flex; gap: 0.5rem; flex-shrink: 0;">"""

html = html.replace(old_header_html, new_header_html)

# Bump cache to v34
html = html.replace('v=33', 'v=34')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

# 2. Update script.js
with open('script.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Update HTML in addNewObservationBlock
old_js_header = """            <div class="block-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; background: var(--bg-color); padding: 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                <div style="flex: 1; margin-right: 1rem;">
                    <input type="text" class="block-title-input" placeholder="Nome do Bloco (ex: Copos, Pulseiras)" style="width: 100%; font-weight: bold; font-size: 1.05rem; border: none; background: transparent; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.2rem; color: var(--text-color); outline: none;">
                </div>
                <div class="block-actions" style="display: flex; gap: 0.5rem;">"""

new_js_header = """            <div class="block-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; background: var(--bg-color); padding: 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); gap: 1rem;">
                <div style="flex: 0 0 30%;">
                    <input type="text" class="block-title-input" placeholder="Nome do Bloco (ex: Copos, Pulseiras)" style="width: 100%; font-weight: bold; font-size: 1.05rem; border: none; background: transparent; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.2rem; color: var(--text-color); outline: none;">
                </div>
                <div class="toolbar-container" style="flex: 1; min-width: 0; display: flex; align-items: center; overflow-x: auto; padding-bottom: 0;"></div>
                <div class="block-actions" style="display: flex; gap: 0.5rem; flex-shrink: 0;">"""

js = js.replace(old_js_header, new_js_header)

# Move toolbar logic for first block
old_init_first = """    const firstEditorEl = observationsRoot.querySelector('.quill-editor');
    if (firstEditorEl) {
        new Quill(firstEditorEl, quillOptions);
    }"""

new_init_first = """    const firstEditorEl = observationsRoot.querySelector('.quill-editor');
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
    }"""

js = js.replace(old_init_first, new_init_first)

# Move toolbar logic for new blocks
old_init_new = """        const newEditorEl = newWindow.querySelector('.quill-editor');
        new Quill(newEditorEl, quillOptions);
        attachBlockEvents(newWindow);"""

new_init_new = """        const newEditorEl = newWindow.querySelector('.quill-editor');
        new Quill(newEditorEl, quillOptions);
        
        const qlToolbar = newWindow.querySelector('.ql-toolbar');
        const toolbarContainer = newWindow.querySelector('.toolbar-container');
        if (qlToolbar && toolbarContainer) {
            toolbarContainer.appendChild(qlToolbar);
            qlToolbar.style.border = 'none';
            qlToolbar.style.padding = '0';
            qlToolbar.style.width = '100%';
        }
        
        attachBlockEvents(newWindow);"""

js = js.replace(old_init_new, new_init_new)

with open('script.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Patch applied")
