const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const instanceList = document.getElementById('instance-list');
const saveBtn = document.getElementById('save-btn');
const saveStatus = document.getElementById('save-status');
const autosaveCheck = document.getElementById('autosave-check');
const searchInput = document.getElementById('search-input');
const statsEl = document.getElementById('stats');
const modalOverlay = document.getElementById('app-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalInput = document.getElementById('modal-input');
const modalConfirmBtn = document.getElementById('modal-confirm');
const modalCancelBtn = document.getElementById('modal-cancel');

let currentData = UserData.getAllData();
let settings = UserData.getSettings();
let isDirty = false;

window.onload = () => {
    autosaveCheck.checked = settings.autosave;
    renderSidebar();
    if (searchInput) {
        searchInput.value = '';
        searchInput.addEventListener('input', renderSidebar);
    }
    // If there are no files, create a default one so the user can start editing immediately
    const hasFiles = Object.keys(currentData.files || {}).length > 0;
    if (!hasFiles) {
        const defaultId = 'file_' + Date.now();
        currentData.files = currentData.files || {};
        currentData.files[defaultId] = { title: 'novo-arquivo', content: '', history: [], pinned: false };
        currentData.activeId = defaultId;
        saveToDisk();
        renderSidebar();
        loadInstance(defaultId);
    } else if (currentData.activeId && currentData.files[currentData.activeId]) {
        loadInstance(currentData.activeId);
    } else {
        // pick first file if activeId missing
        const first = Object.keys(currentData.files)[0];
        if (first) loadInstance(first);
        else { editor.disabled = true; updateStats(); }
    }
};

async function createNewInstance() {
    const res = await showModal({ title: 'Novo arquivo', message: 'Nome do arquivo:', showInput: true, defaultValue: 'novo-arquivo', confirmText: 'Criar', cancelText: 'Cancelar' });
    if (!res.confirmed) return;
    const name = (res.value || '').trim();
    if (!name) return;
    const id = 'file_' + Date.now();
    currentData.files[id] = { title: name, content: "", history: [], pinned: false };
    currentData.activeId = id;
    saveToDisk();
    renderSidebar();
    loadInstance(id);
}

async function loadInstance(id) {
    if (isDirty && !settings.autosave) {
        const keep = await showConfirm('Alterações não salvas', 'Existem alterações não salvas. Sair mesmo assim?', 'Sair', 'Cancelar');
        if (!keep) return;
    }
    currentData.activeId = id;
    editor.value = currentData.files[id].content || '';
    editor.disabled = false;
    isDirty = false;
    updateUIStatus();
    updatePreview();
    updateStats();
    renderSidebar();
    saveToDisk();
}

function renderSidebar() {
    instanceList.innerHTML = "";
    const query = (searchInput && searchInput.value) ? searchInput.value.toLowerCase().trim() : '';
    const ids = Object.keys(currentData.files);
    const pinned = ids.filter(id => currentData.files[id].pinned);
    const others = ids.filter(id => !currentData.files[id].pinned);

    function appendGroup(list) {
        list.forEach(id => {
            const file = currentData.files[id];
            if (!file) return;
            if (query && !file.title.toLowerCase().includes(query)) return;
            const div = document.createElement('div');
            div.className = `instance-item ${id === currentData.activeId ? 'active' : ''} ${file.pinned ? 'pinned' : ''}`;
            const titleSpan = document.createElement('span');
            titleSpan.innerText = file.title;
            titleSpan.onclick = () => loadInstance(id);
            div.appendChild(titleSpan);

            const actions = document.createElement('div');
            actions.className = 'instance-actions';

            const pinBtn = document.createElement('button');
            pinBtn.className = 'mini';
            pinBtn.title = file.pinned ? 'Despin' : 'Pin';
            pinBtn.innerText = file.pinned ? '★' : '☆';
            pinBtn.onclick = (e) => { e.stopPropagation(); togglePin(id); };

            const renameBtn = document.createElement('button');
            renameBtn.className = 'mini';
            renameBtn.title = 'Renomear';
            renameBtn.innerText = '✎';
            renameBtn.onclick = (e) => { e.stopPropagation(); renameInstance(id); };

            const dupBtn = document.createElement('button');
            dupBtn.className = 'mini';
            dupBtn.title = 'Duplicar';
            dupBtn.innerText = '⎘';
            dupBtn.onclick = (e) => { e.stopPropagation(); duplicateInstance(id); };

            actions.appendChild(pinBtn);
            actions.appendChild(renameBtn);
            actions.appendChild(dupBtn);
            div.appendChild(actions);

            instanceList.appendChild(div);
        });
    }

    // show pinned first, then others
    appendGroup(pinned);
    appendGroup(others);
}

function updateUIStatus() {
    if (isDirty && !settings.autosave) {
        saveBtn.classList.add('unsaved');
        saveStatus.innerText = "Modificado";
    } else {
        saveBtn.classList.remove('unsaved');
        saveStatus.innerText = "";
    }
}

function manualSave() {
    if (!currentData.activeId) return;
    currentData.files[currentData.activeId].content = editor.value;
    pushHistoryForActiveFile(true);
    saveToDisk();
    isDirty = false;
    updateUIStatus();
    saveStatus.innerText = "Salvo!";
    setTimeout(() => updateUIStatus(), 1500);
}

function saveToDisk() { UserData.saveAllData(currentData); }

function toggleAutosave() {
    settings.autosave = autosaveCheck.checked;
    UserData.saveSettings(settings);
    if (settings.autosave && isDirty) manualSave();
    updateUIStatus();
}

editor.addEventListener('input', () => {
    if (!currentData.activeId) return;
    isDirty = true;
    updatePreview();
    updateStats();
    if (settings.autosave) {
        currentData.files[currentData.activeId].content = editor.value;
        // push history but throttled to avoid flooding
        pushHistoryForActiveFile(false);
        saveToDisk();
        isDirty = false;
    }
    updateUIStatus();
});

function updatePreview() {
    preview.innerHTML = marked.parse(editor.value);
}

// Atalhos
window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        manualSave();
    }
    if (document.activeElement === editor && (e.ctrlKey || e.metaKey)) {
        if (e.key.toLowerCase() === 'b') { e.preventDefault(); applyStyle('bold'); }
        if (e.key.toLowerCase() === 'i') { e.preventDefault(); applyStyle('italic'); }
    }
});

function applyStyle(type) {
    if (!currentData.activeId) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const text = editor.value;
    const selectedText = text.substring(start, end);
    let prefix = "", suffix = "", placeholder = "";

    switch (type) {
        case 'bold': prefix = "**"; suffix = "**"; placeholder = "negrito"; break;
        case 'italic': prefix = "*"; suffix = "*"; placeholder = "itálico"; break;
        case 'heading': prefix = "\n# "; suffix = ""; placeholder = "Título"; break;
        case 'code': prefix = "```\n"; suffix = "\n```"; placeholder = "código"; break;
    }

    const content = selectedText || placeholder;
    const replacement = prefix + content + suffix;
    editor.setRangeText(replacement, start, end, 'select');
    if (!selectedText) {
        editor.setSelectionRange(start + prefix.length, start + prefix.length + content.length);
    }
    isDirty = true;
    if (settings.autosave) manualSave();
    updatePreview();
    updateUIStatus();
    editor.focus();
}

async function deleteCurrentInstance() {
    if (!currentData.activeId) return;
    const ok = await showConfirm('Excluir arquivo', 'Excluir este arquivo?', 'Excluir', 'Cancelar');
    if (!ok) return;
    delete currentData.files[currentData.activeId];
    currentData.activeId = Object.keys(currentData.files)[0] || null;
    saveToDisk();
    location.reload();
}

// --- New: rename / duplicate / export / stats ---
function renameCurrentInstance() {
    if (!currentData.activeId) return;
    renameInstance(currentData.activeId);
}

async function renameInstance(id) {
    const file = currentData.files[id];
    const res = await showModal({ title: 'Renomear arquivo', message: 'Novo nome:', showInput: true, defaultValue: file.title || '', confirmText: 'Renomear', cancelText: 'Cancelar' });
    if (!res.confirmed) return;
    const newName = (res.value || '').trim();
    if (!newName) return;
    currentData.files[id].title = newName;
    saveToDisk();
    renderSidebar();
    updateUIStatus();
}

function duplicateCurrentInstance() {
    if (!currentData.activeId) return;
    duplicateInstance(currentData.activeId);
}

function duplicateInstance(id) {
    const newId = 'file_' + Date.now();
    const original = currentData.files[id];
    const baseTitle = original.title.replace(/^Copy of\s*/, '');
    let copyTitle = `Copy of ${baseTitle}`;
    let i = 1;
    while (Object.values(currentData.files).some(f => f.title === copyTitle)) {
        copyTitle = `Copy (${i}) of ${baseTitle}`;
        i++;
    }
    currentData.files[newId] = { title: copyTitle, content: original.content };
    currentData.activeId = newId;
    saveToDisk();
    renderSidebar();
    loadInstance(newId);
}

function exportCurrentInstance(format) {
    if (!currentData.activeId) return;
    const file = currentData.files[currentData.activeId];
    const filenameBase = file.title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-\.]/g, '');
    if (format === 'md') {
        const blob = new Blob([file.content], { type: 'text/markdown' });
        downloadBlob(blob, `${filenameBase}.md`);
    } else if (format === 'html') {
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(file.title)}</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:Segoe UI,Arial; padding:20px; background:#fff; color:#222;}</style></head><body>${marked.parse(file.content)}</body></html>`;
        const blob = new Blob([html], { type: 'text/html' });
        downloadBlob(blob, `${filenameBase}.html`);
    }
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
}

function escapeHtml(str) { return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function updateStats() {
    if (!statsEl) return;
    const text = editor.value || '';
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const minutes = words ? Math.max(1, Math.round(words / 200)) : 0;
    statsEl.innerText = `${words} palavras • ${chars} caracteres • ${minutes} min leitura`;
}

// --- Version history helpers ---
function pushHistoryForActiveFile(force = false) {
    if (!currentData.activeId) return;
    const file = currentData.files[currentData.activeId];
    if (!file) return;
    file.history = file.history || [];
    const last = file.history[file.history.length - 1];
    const now = Date.now();
    if (!force && last && (now - last.ts) < 60000) return; // throttle: 60s
    // avoid duplicate consecutive snapshots
    const currentContent = editor.value || file.content || '';
    if (last && last.content === currentContent) return;
    file.history.push({ content: currentContent, title: file.title, ts: now });
    // cap history
    if (file.history.length > 40) file.history.shift();
}

async function openHistory() {
    if (!currentData.activeId) return;
    await showHistoryModal(currentData.activeId);
}

function togglePin(id) {
    const file = currentData.files[id];
    if (!file) return;
    file.pinned = !file.pinned;
    saveToDisk();
    renderSidebar();
}

function showHistoryModal(id) {
    return new Promise(resolve => {
        const file = currentData.files[id];
        const hist = (file && file.history) ? file.history.slice().reverse() : [];
        modalTitle.textContent = 'Histórico';
        modalMessage.style.display = 'none';
        modalInput.style.display = 'none';
        const body = modalOverlay.querySelector('.modal-body');
        const container = document.createElement('div');
        container.className = 'history-list';
        if (!hist.length) {
            const empty = document.createElement('p');
            empty.textContent = 'Sem versões salvas.';
            container.appendChild(empty);
        } else {
            hist.forEach((h, idx) => {
                const row = document.createElement('div');
                row.className = 'history-row';
                const meta = document.createElement('div');
                meta.className = 'history-meta';
                meta.textContent = new Date(h.ts).toLocaleString();
                const previewEl = document.createElement('div');
                previewEl.className = 'history-preview';
                previewEl.innerText = (h.content || '').substring(0, 240).replace(/\n/g, ' ');
                const actions = document.createElement('div');
                actions.className = 'history-actions';
                const restoreBtn = document.createElement('button');
                restoreBtn.className = 'btn';
                restoreBtn.textContent = 'Restaurar';
                restoreBtn.onclick = async (e) => {
                    e.stopPropagation();
                    const ok = await showConfirm('Restaurar versão', `Restaurar a versão de ${new Date(h.ts).toLocaleString()}? Isso substituirá o conteúdo atual.`, 'Restaurar', 'Cancelar');
                    if (!ok) return;
                    // push current as snapshot before restoring
                    pushHistoryForActiveFile(true);
                    file.content = h.content;
                    saveToDisk();
                    loadInstance(id);
                    cleanup();
                    resolve(true);
                };
                actions.appendChild(restoreBtn);
                row.appendChild(meta);
                row.appendChild(previewEl);
                row.appendChild(actions);
                container.appendChild(row);
            });
        }
        // append and show
        body.appendChild(container);
        modalConfirmBtn.textContent = 'Fechar';
        modalCancelBtn.style.display = 'none';

        const onClose = () => { cleanup(); resolve(false); };
        modalConfirmBtn.addEventListener('click', onClose);
        modalOverlay.classList.remove('hidden');
        modalOverlay.setAttribute('aria-hidden', 'false');

        function cleanup() {
            modalOverlay.classList.add('hidden');
            modalOverlay.setAttribute('aria-hidden', 'true');
            modalMessage.style.display = '';
            modalInput.style.display = 'none';
            modalConfirmBtn.textContent = 'OK';
            modalCancelBtn.style.display = '';
            modalConfirmBtn.removeEventListener('click', onClose);
            container.remove();
            modalCancelBtn.style.display = '';
        }
    });
}

// --- Find & Replace (uses sequential modals) ---
async function findReplace() {
    if (!currentData.activeId) return;
    const r1 = await showModal({ title: 'Buscar', message: 'Termo a buscar:', showInput: true, defaultValue: '', confirmText: 'OK', cancelText: 'Cancelar' });
    if (!r1.confirmed) return;
    const search = (r1.value || '').trim();
    if (!search) return;
    const r2 = await showModal({ title: 'Substituir', message: 'Substituir por (deixe vazio para remover):', showInput: true, defaultValue: '', confirmText: 'OK', cancelText: 'Cancelar' });
    if (!r2.confirmed) return;
    const replace = (r2.value || '');
    const all = await showConfirm('Substituir todas?', `Substituir todas as ocorrências de "${search}"?`, 'Sim', 'Não');
    const content = editor.value || '';
    if (all) {
        const re = new RegExp(escapeRegex(search), 'g');
        const newContent = content.replace(re, replace);
        editor.value = newContent;
    } else {
        const idx = content.indexOf(search);
        if (idx === -1) return;
        editor.value = content.slice(0, idx) + replace + content.slice(idx + search.length);
    }
    isDirty = true;
    updatePreview();
    updateStats();
    if (settings.autosave) manualSave();
}

function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'); }

// --- Modal helpers (promise-based) ---
function showModal({ title = '', message = '', showInput = false, defaultValue = '', placeholder = '', confirmText = 'OK', cancelText = 'Cancelar' } = {}) {
    return new Promise(resolve => {
        if (!modalOverlay) return resolve({ confirmed: false });
        modalTitle.textContent = title || '';
        modalMessage.textContent = message || '';
        modalInput.value = defaultValue || '';
        modalInput.placeholder = placeholder || '';
        modalInput.style.display = showInput ? 'block' : 'none';
        modalConfirmBtn.textContent = confirmText;
        modalCancelBtn.textContent = cancelText;

        const cleanup = () => {
            modalOverlay.classList.add('hidden');
            modalOverlay.setAttribute('aria-hidden', 'true');
            modalConfirmBtn.removeEventListener('click', onConfirm);
            modalCancelBtn.removeEventListener('click', onCancel);
            document.removeEventListener('keydown', onKeyDown);
        };

        const onConfirm = () => {
            cleanup();
            resolve({ confirmed: true, value: modalInput.value });
        };

        const onCancel = () => {
            cleanup();
            resolve({ confirmed: false });
        };

        const onKeyDown = (e) => {
            if (e.key === 'Escape') { onCancel(); }
            if (e.key === 'Enter') { if (showInput) { onConfirm(); } }
        };

        modalConfirmBtn.addEventListener('click', onConfirm);
        modalCancelBtn.addEventListener('click', onCancel);
        document.addEventListener('keydown', onKeyDown);

        modalOverlay.classList.remove('hidden');
        modalOverlay.setAttribute('aria-hidden', 'false');
        setTimeout(() => { if (showInput) modalInput.focus(); else modalConfirmBtn.focus(); }, 10);
    });
}

async function showConfirm(title, message, confirmText = 'OK', cancelText = 'Cancelar') {
    const r = await showModal({ title, message, showInput: false, confirmText, cancelText });
    return r.confirmed;
}
