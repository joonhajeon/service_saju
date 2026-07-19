// static/js/clients.js
let selectedIds = new Set();
let currentFolder = null; // null = 루트, string = 폴더 id
let folderStack = [];     // [{id, name}] 브레드크럼 스택
let allFolders = [];
let viewAll = false;      // 전체보기 모드
let searchQuery = '';     // 검색어

function formatBirthDate(bd) {
  if (!bd) return '';
  const s = String(bd).replace(/-/g,'').replace(/\./g,'');
  if (s.length === 8) return `${s.slice(0,4)}.${s.slice(4,6)}.${s.slice(6,8)}`;
  return bd;
}

function formatTime(bt) {
  return bt ? bt : '시간없음';
}

// ── 선택 토글 ─────────────────────────────────────────────────
function toggleSelect(id, card) {
  if (selectedIds.has(id)) {
    selectedIds.delete(id);
    card.classList.remove('client-selected');
  } else {
    if (selectedIds.size >= 6) { alert('최대 6명까지 선택 가능합니다.'); return; }
    selectedIds.add(id);
    card.classList.add('client-selected');
  }
  updateBtns();
}

function updateBtns() {
  const n = selectedIds.size;
  const btnM = document.getElementById('btnMultiAnalysis');
  const btnD = document.getElementById('btnDelete');
  const btnG = document.getElementById('btnGoonghap');
  const btnMove = document.getElementById('btnMove');
  const btnOut = document.getElementById('btnMoveOut');

  if (btnM) {
    btnM.disabled = n === 0;
    btnM.textContent = n > 0 ? `📊 선택한 ${n}명 사주팔자 보기` : '📊 선택한 사람 사주팔자 보기';
  }
  if (btnD) {
    btnD.disabled = n === 0;
    btnD.textContent = n > 0 ? `🗑️ 선택 ${n}명 삭제` : '🗑️ 선택 삭제';
  }
  if (btnG) {
    if (n === 2) { btnG.style.display = ''; btnG.disabled = false; }
    else { btnG.style.display = 'none'; btnG.disabled = true; }
  }
  if (btnMove) btnMove.disabled = n === 0;
  if (btnOut) btnOut.disabled = n === 0;
}

function updateBtn() { updateBtns(); }

// ── 삭제 ─────────────────────────────────────────────────────
async function deleteSelected() {
  if (selectedIds.size === 0) return;
  const names = [...selectedIds].map(id => {
    const card = document.querySelector(`.client-card[data-id="${CSS.escape(id)}"]`);
    return card ? card.querySelector('.client-name').textContent : id;
  }).join(', ');
  if (!confirm(`다음 내담자를 삭제하시겠습니까?\n\n${names}`)) return;

  const btnD = document.getElementById('btnDelete');
  btnD.textContent = '삭제 중...'; btnD.disabled = true;

  let failCount = 0;
  for (const id of [...selectedIds]) {
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        document.querySelector(`.client-card[data-id="${CSS.escape(id)}"]`)?.remove();
        selectedIds.delete(id);
      } else { failCount++; }
    } catch(e) { failCount++; }
  }

  if (failCount > 0) alert(`${failCount}명 삭제에 실패했습니다.`);
  checkEmpty();
  updateBtns();
}

function checkEmpty() {
  const grids = document.querySelectorAll('.clients-grid');
  grids.forEach(grid => {
    if (grid.querySelectorAll('.client-card').length === 0) {
      if (!grid.querySelector('.empty-msg')) {
        grid.insertAdjacentHTML('beforeend', '<p class="empty-msg" style="color:#555;grid-column:1/-1">내담자가 없습니다.</p>');
      }
    }
  });
}

// ── 분석 ─────────────────────────────────────────────────────
async function startMultiAnalysis() {
  if (selectedIds.size === 0) return;
  const btn = document.getElementById('btnMultiAnalysis');
  btn.textContent = '불러오는 중...'; btn.disabled = true;
  try {
    const results = [];
    for (const id of selectedIds) {
      const res = await fetch(`/api/clients/${encodeURIComponent(id)}`);
      const client = await res.json();
      let hour = null, minute = null;
      if (client.birth_time) {
        const parts = client.birth_time.split(':');
        if (parts.length === 2) { hour = parseInt(parts[0],10); minute = parseInt(parts[1],10); }
      }
      let birthDate = String(client.birth_date||'').replace(/\./g,'-');
      const s = birthDate.replace(/-/g,'');
      if (/^\d{8}$/.test(s)) birthDate = `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
      let saju = client.saju;
      try {
        const calcRes = await fetch('/api/calculate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ birth_date: birthDate, hour, minute, gender: client.gender }),
        });
        const calcData = await calcRes.json();
        if (calcData.success) saju = calcData.data;
      } catch(e) {}
      results.push({ person: { name:client.name, birth_date:birthDate, lunar_date:client.lunar_date||null, birth_time:client.birth_time||null, gender:client.gender, career_type:client.career_type, hour, minute }, saju, documents:client.documents });
    }
    sessionStorage.setItem('analysisData', JSON.stringify(results));
    window.location.href = results.length === 1 ? '/analysis' : '/multi-analysis';
  } catch(e) {
    alert('불러오기 오류: ' + e.message);
    updateBtns();
  }
}

async function startGoonghap() {
  if (selectedIds.size !== 2) return;
  const btn = document.getElementById('btnGoonghap');
  btn.textContent = '불러오는 중...'; btn.disabled = true;
  try {
    const people = [];
    for (const id of selectedIds) {
      const res = await fetch(`/api/clients/${encodeURIComponent(id)}`);
      const client = await res.json();
      let hour = null, minute = null;
      if (client.birth_time) {
        const parts = client.birth_time.split(':');
        if (parts.length === 2) { hour = parseInt(parts[0], 10); minute = parseInt(parts[1], 10); }
      }
      let birthDate = String(client.birth_date || '').replace(/\./g, '-');
      const s = birthDate.replace(/-/g, '');
      if (/^\d{8}$/.test(s)) birthDate = `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
      let saju = client.saju;
      try {
        const calcRes = await fetch('/api/calculate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ birth_date: birthDate, hour, minute, gender: client.gender }),
        });
        const calcData = await calcRes.json();
        if (calcData.success) saju = calcData.data;
      } catch(e) {}
      people.push({ name: client.name, birth_date: birthDate, birth_time: client.birth_time || null, gender: client.gender, career_type: client.career_type, hour, minute, saju });
    }
    sessionStorage.setItem('goonghapData', JSON.stringify(people));
    window.location.href = '/goonghap';
  } catch(e) {
    alert('불러오기 오류: ' + e.message);
    btn.textContent = '💑 궁합 분석'; btn.disabled = false;
  }
}

// ── 폴더 이동 ─────────────────────────────────────────────────
function showMoveDropdown() {
  if (selectedIds.size === 0) return;
  const existing = document.getElementById('moveDropdown');
  if (existing) { existing.remove(); return; }

  const dropdown = document.createElement('div');
  dropdown.id = 'moveDropdown';
  dropdown.className = 'move-dropdown';

  // 현재 폴더 안에 있으면 현재 폴더는 제외
  const otherFolders = allFolders.filter(f => f.id !== currentFolder);
  if (otherFolders.length === 0) {
    dropdown.innerHTML = '<div style="padding:8px 12px;color:#999;font-size:13px">이동할 폴더가 없습니다</div>';
  } else {
    otherFolders.forEach(f => {
      const btn = document.createElement('button');
      btn.textContent = `📁 ${f.name}`;
      btn.onclick = () => moveToFolder(f.id);
      dropdown.appendChild(btn);
    });
  }

  const btnMove = document.getElementById('btnMove');
  btnMove.parentNode.style.position = 'relative';
  btnMove.parentNode.appendChild(dropdown);

  setTimeout(() => {
    document.addEventListener('click', function handler(e) {
      if (!dropdown.contains(e.target) && e.target !== btnMove) {
        dropdown.remove();
        document.removeEventListener('click', handler);
      }
    });
  }, 0);
}

async function moveToFolder(folderId) {
  document.getElementById('moveDropdown')?.remove();
  if (selectedIds.size === 0) return;
  const ids = [...selectedIds];
  try {
    const res = await fetch('/api/clients/bulk-move', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, folder: folderId }),
    });
    if ((await res.json()).success) {
      ids.forEach(id => {
        document.querySelector(`.client-card[data-id="${CSS.escape(id)}"]`)?.remove();
        selectedIds.delete(id);
      });
      await refreshFolders();
      // 폴더 카드 카운트 갱신
      document.querySelectorAll('.folder-card').forEach(fc => {
        const fid = fc.dataset.folderId;
        const f = allFolders.find(x => x.id === fid);
        if (f) fc.querySelector('.folder-count').textContent = `${f.count}명`;
      });
      checkEmpty();
      updateBtns();
    }
  } catch(e) { alert('이동 오류: ' + e.message); }
}

async function moveOutOfFolder() {
  if (selectedIds.size === 0) return;
  const ids = [...selectedIds];
  try {
    const res = await fetch('/api/clients/bulk-move', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, folder: null }),
    });
    if ((await res.json()).success) {
      ids.forEach(id => {
        document.querySelector(`.client-card[data-id="${CSS.escape(id)}"]`)?.remove();
        selectedIds.delete(id);
      });
      checkEmpty();
      updateBtns();
    }
  } catch(e) { alert('오류: ' + e.message); }
}

// ── 폴더 CRUD ─────────────────────────────────────────────────
async function createFolder() {
  const name = prompt('새 폴더 이름을 입력하세요:');
  if (!name || !name.trim()) return;
  try {
    const res = await fetch('/api/folders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      // 현재 폴더 안에서 만들면 하위 폴더로 생성
      body: JSON.stringify({ name: name.trim(), parent: currentFolder }),
    });
    const data = await res.json();
    if (!data.success) { alert(data.error); return; }
    await loadPage();
  } catch(e) { alert('폴더 생성 오류: ' + e.message); }
}

async function renameFolderAction(folderId, currentName, e) {
  e.stopPropagation();
  const newName = prompt('새 폴더 이름:', currentName);
  if (!newName || !newName.trim() || newName.trim() === currentName) return;
  try {
    const res = await fetch(`/api/folders/${encodeURIComponent(folderId)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const data = await res.json();
    if (!data.success) { alert(data.error); return; }
    await loadPage();
  } catch(e) { alert('이름 변경 오류: ' + e.message); }
}

async function deleteFolderAction(folderId, folderName, e) {
  e.stopPropagation();
  if (!confirm(`"${folderName}" 폴더를 삭제하시겠습니까?\n폴더 안의 내담자들은 미배정 상태가 됩니다.`)) return;
  try {
    await fetch(`/api/folders/${encodeURIComponent(folderId)}`, { method: 'DELETE' });
    await loadPage();
  } catch(e) { alert('삭제 오류: ' + e.message); }
}

function enterFolder(folderId) {
  const f = allFolders.find(x => x.id === folderId);
  folderStack.push({ id: folderId, name: f ? f.name : folderId });
  currentFolder = folderId;
  // selectedIds 유지 — 다른 폴더 이동 시에도 선택 보존
  loadPage();
}

function goBack() {
  folderStack.pop();
  currentFolder = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : null;
  // selectedIds 유지 — 뒤로 가도 선택 보존
  loadPage();
}

function navigateToLevel(index) {
  // 브레드크럼 클릭: index=-1 이면 루트
  if (index < 0) {
    folderStack = [];
    currentFolder = null;
  } else {
    folderStack = folderStack.slice(0, index + 1);
    currentFolder = folderStack[index].id;
  }
  // selectedIds 유지 — 브레드크럼 이동 시에도 선택 보존
  loadPage();
}

// ── 폴더 이동 (폴더 → 다른 폴더) ────────────────────────────────
function getFolderDescendants(folderId) {
  // folderId의 모든 하위 폴더 ID 집합 반환
  const descendants = new Set();
  const queue = [folderId];
  while (queue.length > 0) {
    const id = queue.shift();
    allFolders.filter(f => (f.parent || null) === id).forEach(c => {
      descendants.add(c.id);
      queue.push(c.id);
    });
  }
  return descendants;
}

function showFolderMoveDropdown(folderId, e) {
  e.stopPropagation();
  const existing = document.getElementById('folderMoveDropdown');
  if (existing) { existing.remove(); return; }

  const dropdown = document.createElement('div');
  dropdown.id = 'folderMoveDropdown';
  dropdown.className = 'move-dropdown';
  // folder-card 안이 아니라 body에 붙여서 overflow·버블링 문제 방지
  dropdown.style.position = 'fixed';
  dropdown.style.zIndex = '9999';
  dropdown.style.minWidth = '180px';

  const movingFolder = allFolders.find(f => f.id === folderId);
  const currentParent = movingFolder ? (movingFolder.parent || null) : null;
  const descendants = getFolderDescendants(folderId);

  const items = [];

  // 루트로 이동 (현재 이미 루트가 아닐 때만)
  if (currentParent !== null) {
    items.push({ label: '📋 최상위(루트)로 이동', targetId: null });
  }

  // 다른 폴더들 (자기 자신, 자손, 현재 부모 제외)
  allFolders.forEach(f => {
    if (f.id !== folderId && !descendants.has(f.id) && f.id !== currentParent) {
      items.push({ label: `📁 ${f.name}`, targetId: f.id });
    }
  });

  if (items.length === 0) {
    dropdown.innerHTML = '<div style="padding:8px 12px;color:#999;font-size:13px">이동할 폴더가 없습니다</div>';
  } else {
    items.forEach(item => {
      const btn = document.createElement('button');
      btn.textContent = item.label;
      btn.onclick = (ev) => {
        ev.stopPropagation();  // 폴더 카드 클릭 버블링 방지
        moveFolderTo(folderId, item.targetId);
      };
      dropdown.appendChild(btn);
    });
  }

  // body에 append 후 버튼 위치 기준으로 좌표 설정
  document.body.appendChild(dropdown);
  const trigger = e.currentTarget;
  const rect = trigger.getBoundingClientRect();
  dropdown.style.top = (rect.bottom + 4) + 'px';
  dropdown.style.left = rect.left + 'px';

  // 화면 아래로 넘치면 위에 표시
  const ddRect = dropdown.getBoundingClientRect();
  if (ddRect.bottom > window.innerHeight) {
    dropdown.style.top = (rect.top - ddRect.height - 4) + 'px';
  }

  setTimeout(() => {
    document.addEventListener('click', function handler(ev) {
      if (!dropdown.contains(ev.target) && ev.target !== trigger) {
        dropdown.remove();
        document.removeEventListener('click', handler);
      }
    });
  }, 0);
}

async function moveFolderTo(folderId, targetFolderId) {
  document.getElementById('folderMoveDropdown')?.remove();
  try {
    const res = await fetch(`/api/folders/${encodeURIComponent(folderId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent: targetFolderId }),
    });
    const data = await res.json();
    if (!data.success) { alert(data.error); return; }
    await loadPage();
  } catch(e) { alert('폴더 이동 오류: ' + e.message); }
}

// ── 폴더 카드 렌더 ────────────────────────────────────────────
async function refreshFolders() {
  const res = await fetch('/api/folders');
  allFolders = await res.json();
}

function renderFolderCard(f) {
  const dateStr = f.created_at ? f.created_at.slice(0, 10) : '';
  const esc = (s) => s.replace(/'/g, "\\'");
  const subCount = allFolders.filter(x => (x.parent || null) === f.id).length;
  const selInFolder = [...selectedIds].filter(id => {
    const card = document.querySelector(`.client-card[data-id="${CSS.escape(id)}"]`);
    return !card; // 현재 뷰에 없는 선택된 카드 = 다른 폴더에 있음 (근사치)
  }).length;
  // 이 폴더의 내담자 중 선택된 수를 allClients 기준으로 계산 (전체보기 아닐 때 근사)
  const selectedHint = selInFolder > 0 ? ` · <span style="color:var(--accent);font-weight:bold">${selInFolder}명 선택됨</span>` : '';
  const countText = subCount > 0 ? `${f.count}명 · 폴더 ${subCount}개` : `${f.count}명`;
  return `<div class="folder-card" data-folder-id="${f.id}" onclick="enterFolder('${f.id}')">
    <div class="folder-icon">📁</div>
    <div class="folder-name">${f.name}</div>
    <div class="folder-meta">${dateStr}</div>
    <div class="folder-count">${countText}</div>
    <button class="folder-move-btn" onclick="showFolderMoveDropdown('${esc(f.id)}',event)" title="폴더 이동">📂</button>
    <button class="folder-rename-btn" onclick="renameFolderAction('${esc(f.id)}','${esc(f.name)}',event)" title="이름 변경">✏️</button>
    <button class="folder-delete-btn" onclick="deleteFolderAction('${esc(f.id)}','${esc(f.name)}',event)" title="폴더 삭제">✕</button>
  </div>`;
}

function renderClientCard(c) {
  const isLunar = !!c.lunar_date;
  const dateStr = isLunar
    ? `음력 ${formatBirthDate(c.lunar_date)}`
    : formatBirthDate(c.birth_date);
  const lunarBadge = isLunar
    ? `<span style="font-size:10px;background:#e8d5f5;color:#7b2d8b;border-radius:3px;padding:1px 5px;margin-left:5px;vertical-align:middle">음력</span>`
    : '';
  const timeStr = formatTime(c.birth_time);
  const isSelected = selectedIds.has(c.id);
  return `<div class="client-card${isSelected ? ' client-selected' : ''}" data-id="${c.id}" onclick="toggleSelect('${c.id}', this)">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div class="client-name">${c.name}${lunarBadge}</div>
      <button onclick="event.stopPropagation();openClientEdit('${c.id}')"
        style="font-size:11px;padding:2px 8px;background:var(--bg3);border:1px solid #ccc;border-radius:4px;cursor:pointer;white-space:nowrap;flex-shrink:0">✏️ 수정</button>
    </div>
    <div class="client-info">${dateStr} · ${timeStr} · ${c.gender||''} · ${c.career_type||''}</div>
    <div class="client-date">분석일: ${c.updated_at||c.created_at||''}</div>
  </div>`;
}

// ── 헤더 렌더 ─────────────────────────────────────────────────
function renderHeader() {
  const header = document.getElementById('clientsHeader');
  if (!header) return;

  // 브레드크럼 생성
  let breadcrumbHtml = `<span class="breadcrumb-item" onclick="navigateToLevel(-1)">📋 내담자 목록</span>`;
  folderStack.forEach((item, i) => {
    breadcrumbHtml += `<span class="breadcrumb-sep">›</span><span class="breadcrumb-item" onclick="navigateToLevel(${i})">📁 ${item.name}</span>`;
  });

  const viewAllBtn = `<button class="btn-view-all${viewAll ? ' active' : ''}" onclick="toggleViewAll()" title="${viewAll ? '폴더 보기로 돌아가기' : '전체 내담자 한 화면에 보기'}">${viewAll ? '📁 폴더보기' : '🔍 전체보기'}</button>`;
  const searchBar = `<div class="search-bar-wrap">
    <input type="text" id="clientSearchInput" class="client-search-input" placeholder="🔍 이름 또는 생년월일 검색..." value="${searchQuery}" oninput="onSearchInput(this.value)" autocomplete="off">
    ${searchQuery ? `<button class="search-clear-btn" onclick="clearSearch()">✕</button>` : ''}
  </div>`;

  if (viewAll) {
    header.innerHTML = `
      ${searchBar}
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <button class="btn-back" onclick="history.back()">← 뒤로</button>
        <div class="breadcrumb"><span class="breadcrumb-item">🔍 전체보기</span></div>
      </div>
      <div class="clients-actions">
        <span class="select-hint">카드를 클릭해서 선택 (최대 6명)</span>
        ${viewAllBtn}
        <button class="btn-delete" id="btnDelete" onclick="deleteSelected()" disabled>🗑️ 선택 삭제</button>
        <button class="btn-multi-analysis" id="btnMultiAnalysis" onclick="startMultiAnalysis()" disabled>📊 선택한 사람 사주팔자 보기</button>
        <button class="btn-goonghap" id="btnGoonghap" onclick="startGoonghap()" disabled style="display:none">💑 궁합 분석</button>
      </div>`;
  } else if (currentFolder === null) {
    header.innerHTML = `
      ${searchBar}
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <button class="btn-back" onclick="history.back()">← 뒤로</button>
        <div class="breadcrumb">${breadcrumbHtml}</div>
      </div>
      <div class="clients-actions">
        <span class="select-hint">카드를 클릭해서 선택 (최대 6명)</span>
        ${viewAllBtn}
        <button class="btn-new-folder" onclick="createFolder()">📁 새 폴더</button>
        <button class="btn-delete" id="btnDelete" onclick="deleteSelected()" disabled>🗑️ 선택 삭제</button>
        <div class="move-wrapper">
          <button class="btn-move" id="btnMove" onclick="showMoveDropdown()" disabled>📂 폴더로 이동 ▾</button>
        </div>
        <button class="btn-multi-analysis" id="btnMultiAnalysis" onclick="startMultiAnalysis()" disabled>📊 선택한 사람 사주팔자 보기</button>
        <button class="btn-goonghap" id="btnGoonghap" onclick="startGoonghap()" disabled style="display:none">💑 궁합 분석</button>
      </div>`;
  } else {
    header.innerHTML = `
      ${searchBar}
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <button class="btn-back" onclick="goBack()">← 상위로</button>
        <div class="breadcrumb">${breadcrumbHtml}</div>
      </div>
      <div class="clients-actions">
        <span class="select-hint">카드를 클릭해서 선택 (최대 6명)</span>
        ${viewAllBtn}
        <button class="btn-new-folder" onclick="createFolder()">📁 새 폴더</button>
        <button class="btn-delete" id="btnDelete" onclick="deleteSelected()" disabled>🗑️ 선택 삭제</button>
        <button class="btn-move-out" id="btnMoveOut" onclick="moveOutOfFolder()" disabled>📤 미배정으로 꺼내기</button>
        <div class="move-wrapper">
          <button class="btn-move" id="btnMove" onclick="showMoveDropdown()" disabled>📂 다른 폴더로 이동 ▾</button>
        </div>
        <button class="btn-multi-analysis" id="btnMultiAnalysis" onclick="startMultiAnalysis()" disabled>📊 선택한 사람 사주팔자 보기</button>
        <button class="btn-goonghap" id="btnGoonghap" onclick="startGoonghap()" disabled style="display:none">💑 궁합 분석</button>
      </div>`;
  }
}

// ── 검색 ──────────────────────────────────────────────────────
function onSearchInput(value) {
  searchQuery = value.trim();
  renderSearchResults();
  // X 버튼 토글
  const wrap = document.querySelector('.search-bar-wrap');
  if (!wrap) return;
  const existing = wrap.querySelector('.search-clear-btn');
  if (searchQuery && !existing) {
    const btn = document.createElement('button');
    btn.className = 'search-clear-btn';
    btn.textContent = '✕';
    btn.onclick = clearSearch;
    wrap.appendChild(btn);
  } else if (!searchQuery && existing) {
    existing.remove();
  }
}

function clearSearch() {
  searchQuery = '';
  const input = document.getElementById('clientSearchInput');
  if (input) input.value = '';
  const btn = document.querySelector('.search-clear-btn');
  if (btn) btn.remove();
  renderSearchResults();
}

async function renderSearchResults() {
  const container = document.getElementById('clientsList');
  if (!container) return;

  if (!searchQuery) {
    // 검색어 없으면 원래 뷰로
    loadPage();
    return;
  }

  // 전체 고객 불러와서 필터
  try {
    const res = await fetch('/api/clients');
    const allClients = await res.json();
    const q = searchQuery.toLowerCase();
    const filtered = allClients.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.birth_date || '').replace(/-/g, '.').includes(q)
    );

    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'clients-grid';

    if (filtered.length === 0) {
      grid.innerHTML = `<p class="empty-msg" style="color:#555;grid-column:1/-1">
        "<strong>${searchQuery}</strong>" 검색 결과가 없습니다.
      </p>`;
    } else {
      grid.innerHTML = filtered.map(renderClientCardWithFolder).join('');
      const hint = document.createElement('p');
      hint.style.cssText = 'color:#888;font-size:12px;margin:8px 0 0;grid-column:1/-1';
      hint.textContent = `전체 ${filtered.length}명`;
      grid.appendChild(hint);
    }
    container.appendChild(grid);
  } catch(e) {
    container.innerHTML = '<p style="color:#c62828">검색 중 오류가 발생했습니다.</p>';
  }
}

// ── 전체보기 ──────────────────────────────────────────────────
function toggleViewAll() {
  viewAll = !viewAll;
  loadPage();
}

function getFolderName(folderId) {
  if (!folderId) return '미배정';
  const f = allFolders.find(x => x.id === folderId);
  return f ? f.name : folderId;
}

function renderClientCardWithFolder(c) {
  const isLunar = !!c.lunar_date;
  const dateStr = isLunar
    ? `음력 ${formatBirthDate(c.lunar_date)}`
    : formatBirthDate(c.birth_date);
  const lunarBadge = isLunar
    ? `<span style="font-size:10px;background:#e8d5f5;color:#7b2d8b;border-radius:3px;padding:1px 5px;margin-left:5px;vertical-align:middle">음력</span>`
    : '';
  const folderBadge = `<span style="font-size:10px;background:#f0f0f0;color:#666;border-radius:3px;padding:1px 6px;margin-left:5px;vertical-align:middle">📁 ${getFolderName(c.folder)}</span>`;
  const timeStr = formatTime(c.birth_time);
  const isSelected = selectedIds.has(c.id);
  return `<div class="client-card${isSelected ? ' client-selected' : ''}" data-id="${c.id}" onclick="toggleSelect('${c.id}', this)">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div class="client-name">${c.name}${lunarBadge}${folderBadge}</div>
      <button onclick="event.stopPropagation();openClientEdit('${c.id}')"
        style="font-size:11px;padding:2px 8px;background:var(--bg3);border:1px solid #ccc;border-radius:4px;cursor:pointer;white-space:nowrap;flex-shrink:0">✏️ 수정</button>
    </div>
    <div class="client-info">${dateStr} · ${timeStr} · ${c.gender||''} · ${c.career_type||''}</div>
    <div class="client-date">분석일: ${c.updated_at||c.created_at||''}</div>
  </div>`;
}

async function loadPageAll() {
  renderHeader();
  updateBtns();
  const container = document.getElementById('clientsList');
  if (!container) return;
  container.innerHTML = '';
  try {
    const res = await fetch('/api/clients'); // 전체 조회 (folder 파라미터 없음)
    const clients = await res.json();
    const grid = document.createElement('div');
    grid.className = 'clients-grid';
    if (clients.length === 0) {
      grid.innerHTML = '<p class="empty-msg" style="color:#555;grid-column:1/-1">저장된 내담자가 없습니다.</p>';
    } else {
      grid.innerHTML = clients.map(renderClientCardWithFolder).join('');
    }
    container.appendChild(grid);
  } catch(e) {
    container.innerHTML = '<p style="color:#c62828">목록을 불러오는 중 오류가 발생했습니다.</p>';
  }
}

// ── 메인 로드 ─────────────────────────────────────────────────
async function loadPage() {
  await refreshFolders();

  // 전체보기 모드
  if (viewAll) { await loadPageAll(); return; }

  // 현재 레벨의 폴더만 표시 (parent === currentFolder)
  const currentLevelFolders = allFolders.filter(f => (f.parent || null) === currentFolder);

  renderHeader();
  updateBtns();

  const container = document.getElementById('clientsList');
  if (!container) return;
  container.innerHTML = '';

  try {
    // 하위 폴더 섹션 (있을 때만)
    if (currentLevelFolders.length > 0) {
      const folderGrid = document.createElement('div');
      folderGrid.className = 'folder-grid';
      folderGrid.innerHTML = currentLevelFolders.map(renderFolderCard).join('');
      container.appendChild(folderGrid);

      const divider = document.createElement('div');
      divider.className = 'folder-divider';
      divider.innerHTML = currentFolder === null ? '<span>폴더 미배정 내담자</span>' : '<span>내담자</span>';
      container.appendChild(divider);
    }

    // 내담자 섹션
    const url = currentFolder === null
      ? '/api/clients?folder=root'
      : `/api/clients?folder=${encodeURIComponent(currentFolder)}`;
    const res = await fetch(url);
    const clients = await res.json();
    const grid = document.createElement('div');
    grid.className = 'clients-grid';
    if (clients.length === 0 && currentLevelFolders.length === 0) {
      const msg = currentFolder === null ? '저장된 내담자가 없습니다.' : '이 폴더에 내담자가 없습니다.';
      grid.innerHTML = `<p class="empty-msg" style="color:#555;grid-column:1/-1">${msg}</p>`;
    } else if (clients.length === 0) {
      grid.innerHTML = '<p class="empty-msg" style="color:#999;grid-column:1/-1;font-size:13px">내담자가 없습니다.</p>';
    } else {
      grid.innerHTML = clients.map(renderClientCard).join('');
    }
    container.appendChild(grid);

  } catch(e) {
    container.innerHTML = '<p style="color:#c62828">목록을 불러오는 중 오류가 발생했습니다.</p>';
  }
}

// ── 내담자 편집 모달 ──────────────────────────────────────────
let _editingClientId = null;
let _editCalType = 'solar';

async function openClientEdit(id) {
  _editingClientId = id;
  _editCalType = 'solar';
  try {
    const res = await fetch(`/api/clients/${encodeURIComponent(id)}`);
    const c = await res.json();
    if (c.error) { alert('내담자 정보를 불러올 수 없습니다.'); return; }

    const careerOptions = ['직장인','사업가','프리랜서','연예인','운동선수','정치인','공인·전문직','학생','주부','타입없음']
      .map(v => `<option value="${v}"${c.career_type===v?' selected':''}>${v}</option>`).join('');

    const modal = document.getElementById('clientEditModal');
    modal.querySelector('#cem-name').value = c.name || '';
    modal.querySelector('#cem-time').value = c.birth_time || '';
    modal.querySelector('#cem-gender').value = c.gender || '여';
    modal.querySelector('#cem-career').innerHTML = careerOptions;
    modal.querySelector('#cem-leap').checked = false;

    // 음력으로 저장된 경우 → 음력 날짜 + 음력 토글 활성화
    if (c.lunar_date) {
      _editCalType = 'lunar';
      modal.querySelector('#cem-date').value = formatBirthDate(c.lunar_date);
      modal.querySelector('#cem-cal-solar').classList.remove('active');
      modal.querySelector('#cem-cal-lunar').classList.add('active');
      modal.querySelector('#cem-leap-row').style.display = 'flex';
    } else {
      _editCalType = 'solar';
      modal.querySelector('#cem-date').value = formatBirthDate(c.birth_date);
      modal.querySelector('#cem-cal-solar').classList.add('active');
      modal.querySelector('#cem-cal-lunar').classList.remove('active');
      modal.querySelector('#cem-leap-row').style.display = 'none';
    }
    document.getElementById('clientEditOverlay').style.display = 'flex';
  } catch(e) {
    alert('오류: ' + e.message);
  }
}

function closeClientEdit() {
  document.getElementById('clientEditOverlay').style.display = 'none';
  _editingClientId = null;
}

function toggleCemCal(type) {
  _editCalType = type;
  document.getElementById('cem-cal-solar').classList.toggle('active', type === 'solar');
  document.getElementById('cem-cal-lunar').classList.toggle('active', type === 'lunar');
  document.getElementById('cem-leap-row').style.display = type === 'lunar' ? 'flex' : 'none';
  if (type === 'solar') document.getElementById('cem-leap').checked = false;
}

async function saveClientEdit() {
  if (!_editingClientId) return;
  const modal = document.getElementById('clientEditModal');
  const nameVal   = modal.querySelector('#cem-name').value.trim();
  let   dateVal   = modal.querySelector('#cem-date').value.trim().replace(/\./g, '-');
  const timeVal   = modal.querySelector('#cem-time').value.trim();
  const genderVal = modal.querySelector('#cem-gender').value;
  const careerVal = modal.querySelector('#cem-career').value;
  const isLeap    = modal.querySelector('#cem-leap').checked;
  if (!nameVal || !dateVal) { alert('이름과 생년월일을 입력해주세요.'); return; }

  const saveBtn = document.getElementById('cem-save-btn');
  saveBtn.textContent = '저장 중...'; saveBtn.disabled = true;

  try {
    let lunarDateVal = null;
    if (_editCalType === 'lunar') {
      lunarDateVal = dateVal; // 음력 원본 저장
      const r = await fetch('/api/lunar-to-solar', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ birth_date: dateVal, is_leap: isLeap }),
      });
      const d = await r.json();
      if (!d.success) { alert('음력 변환 오류: ' + d.error); return; }
      dateVal = d.solar_date;
    }

    let hour = null, minute = null;
    if (timeVal && timeVal.includes(':')) { [hour, minute] = timeVal.split(':').map(Number); }
    const calcRes = await fetch('/api/calculate', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ birth_date: dateVal, hour, minute, gender: genderVal }),
    });
    const calcData = await calcRes.json();
    if (!calcData.success) { alert('계산 오류: ' + calcData.error); return; }

    const birthTime = hour != null ? `${String(hour).padStart(2,'0')}:${String(minute||0).padStart(2,'0')}` : null;
    const putRes = await fetch(`/api/clients/${encodeURIComponent(_editingClientId)}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name:nameVal, birth_date:dateVal, birth_time:birthTime, gender:genderVal, career_type:careerVal, saju:calcData.data, lunar_date:lunarDateVal }),
    });
    const putData = await putRes.json();
    if (!putData.success) throw new Error('저장 실패');

    const card = document.querySelector(`.client-card[data-id="${CSS.escape(_editingClientId)}"]`);
    if (card) {
      card.querySelector('.client-name').textContent = nameVal;
      card.querySelector('.client-info').textContent = `${formatBirthDate(dateVal)} · ${birthTime||'시간없음'} · ${genderVal} · ${careerVal}`;
    }
    closeClientEdit();
  } catch(e) {
    alert('오류: ' + e.message);
  } finally {
    saveBtn.textContent = '저장'; saveBtn.disabled = false;
  }
}

// ── 초기화 ────────────────────────────────────────────────────
window.addEventListener('pageshow', () => {
  selectedIds.clear();
  document.querySelectorAll('.client-card').forEach(c => c.classList.remove('client-selected'));
  updateBtns();
});

document.addEventListener('DOMContentLoaded', loadPage);
