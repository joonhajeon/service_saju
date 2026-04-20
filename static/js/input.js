// static/js/input.js

let tabCount = 1;
let personData = [{}];

function addTab() {
  if (tabCount >= 6) { alert('최대 6명까지 입력 가능합니다.'); return; }
  const idx = tabCount++;
  personData.push({});

  const tab = document.createElement('button');
  tab.className = 'tab';
  tab.dataset.idx = idx;
  tab.textContent = `${idx + 1}번`;
  tab.onclick = () => switchTab(idx);
  document.getElementById('personTabs').appendChild(tab);

  const firstContent = document.querySelector('.tab-content[data-idx="0"]');
  const newContent = firstContent.cloneNode(true);
  newContent.dataset.idx = idx;
  newContent.classList.remove('active');
  newContent.querySelectorAll('input').forEach(el => el.value = '');
  newContent.querySelectorAll('select').forEach(el => el.selectedIndex = 0);
  newContent.querySelector('.mode-btn:first-child').onclick = () => setMode(idx, 'direct');
  newContent.querySelector('.mode-btn:last-child').onclick = () => setMode(idx, 'celebrity');
  newContent.querySelector('.btn-search').onclick = () => searchCelebrity(idx);
  newContent.querySelector('.celebrity-results').innerHTML = '';
  newContent.querySelector('.celebrity-search').classList.add('hidden');
  newContent.querySelector('.direct-input').classList.remove('hidden');
  document.getElementById('tabContents').appendChild(newContent);

  switchTab(idx);
}

function switchTab(idx) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', parseInt(t.dataset.idx) === idx));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', parseInt(c.dataset.idx) === idx));
}

function setMode(idx, mode) {
  const content = document.querySelector(`.tab-content[data-idx="${idx}"]`);
  content.querySelector('.celebrity-search').classList.toggle('hidden', mode !== 'celebrity');
  content.querySelector('.direct-input').classList.toggle('hidden', mode !== 'direct');
  content.querySelectorAll('.mode-btn').forEach((btn, i) => {
    btn.classList.toggle('active', (i === 0 && mode === 'direct') || (i === 1 && mode === 'celebrity'));
  });
}

async function searchCelebrity(idx) {
  const content = document.querySelector(`.tab-content[data-idx="${idx}"]`);
  const query = content.querySelector('.celebrity-input').value.trim();
  if (!query) return;

  const container = content.querySelector('.celebrity-results');
  container.innerHTML = '<div style="color:#999;font-size:12px">AI가 검색 중...</div>';

  const res = await fetch(`/api/celebrity-search?query=${encodeURIComponent(query)}`);
  const results = await res.json();

  container.innerHTML = '';
  if (results.length === 0) {
    container.innerHTML = '<div style="color:#c62828;font-size:12px">검색 결과가 없습니다. 직업+이름으로 다시 시도해보세요.</div>';
    return;
  }

  results.forEach(r => {
    const btn = document.createElement('button');
    btn.className = 'celebrity-result-btn';

    const lunarStr = r.birth_date_lunar ? ` / 음력 ${r.birth_date_lunar}` : '';
    const countryStr = r.birth_country && r.birth_country !== '대한민국' ? ` 🌏 ${r.birth_country}` : '';
    const descStr = r.description ? ` · ${r.description}` : '';

    btn.innerHTML = `
      <div style="font-weight:bold">${r.name}${descStr}${countryStr}</div>
      <div style="font-size:11px;color:#555;margin-top:2px">양력 ${r.birth_date}${lunarStr}</div>
    `;
    btn.onclick = () => {
      content.querySelector('.input-date').value = r.birth_date.replace(/-/g, '.');
      content.querySelector('.input-name').value = r.name;
      setMode(idx, 'direct');
    };
    container.appendChild(btn);
  });
}

function collectPersonData() {
  const people = [];
  document.querySelectorAll('.tab-content').forEach(content => {
    const rawDate = content.querySelector('.input-date').value.trim();
    if (!rawDate) return;
    const dateStr = rawDate.replace(/\./g, '-');

    const timeStr = content.querySelector('.input-time').value.trim();
    let hour = null, minute = null;
    if (timeStr && timeStr.includes(':')) {
      [hour, minute] = timeStr.split(':').map(Number);
    }

    people.push({
      name: content.querySelector('.input-name').value.trim() || '이름없음',
      birth_date: dateStr,
      hour,
      minute,
      gender: content.querySelector('.input-gender').value,
      career_type: content.querySelector('.input-career').value,
    });
  });
  return people;
}

async function startAnalysis() {
  const people = collectPersonData();
  if (people.length === 0) { alert('생년월일을 입력해주세요.'); return; }

  const btn = document.querySelector('.btn-analyze');
  btn.textContent = '계산 중...';
  btn.disabled = true;

  try {
    const results = [];
    for (const p of people) {
      const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      });
      const data = await res.json();
      if (data.success) {
        results.push({ person: p, saju: data.data });
      } else {
        alert(`계산 오류: ${data.error}`);
        return;
      }
    }

    sessionStorage.setItem('analysisData', JSON.stringify(results));
    window.location.href = '/analysis';
  } finally {
    btn.textContent = '⚡ 분석 시작';
    btn.disabled = false;
  }
}
