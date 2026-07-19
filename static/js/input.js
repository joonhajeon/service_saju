// static/js/input.js

let tabCount = 1;
let personData = [{}];

// ── 양력/음력 토글 ──
function setCalType(idx, type) {
  const content = document.querySelector(`.tab-content[data-idx="${idx}"]`);
  if (!content) return;
  const btns = content.querySelectorAll('.cal-btn');
  btns.forEach((b, i) => b.classList.toggle('active', (i === 0 && type === 'solar') || (i === 1 && type === 'lunar')));
  const leapRow = content.querySelector('.lunar-leap-row');
  if (leapRow) leapRow.style.display = type === 'lunar' ? 'flex' : 'none';
  if (type === 'solar') {
    const leap = content.querySelector('.input-lunar-leap');
    if (leap) leap.checked = false;
  }
}

// 음력→양력 변환 (서버 API 호출)
async function convertLunarIfNeeded(p) {
  if (p.cal_type !== 'lunar') return p;
  const res = await fetch('/api/lunar-to-solar', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ birth_date: p.birth_date, is_leap: p.lunar_leap }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(`음력 변환 오류: ${data.error}`);
  // 음력 원본 날짜 보존, 양력으로 치환
  return { ...p, birth_date: data.solar_date, lunar_date: p.birth_date };
}

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
  newContent.querySelector('.celebrity-input').onkeydown = (e) => { if (e.key === 'Enter') searchCelebrity(idx); };
  newContent.querySelector('.celebrity-results').innerHTML = '';
  newContent.querySelector('.celebrity-search').classList.add('hidden');
  newContent.querySelector('.direct-input').classList.remove('hidden');
  // 음력 버튼 초기화
  const calBtns = newContent.querySelectorAll('.cal-btn');
  if (calBtns.length >= 2) {
    calBtns[0].onclick = () => setCalType(idx, 'solar');
    calBtns[1].onclick = () => setCalType(idx, 'lunar');
    calBtns[0].classList.add('active'); calBtns[1].classList.remove('active');
  }
  const leapRow = newContent.querySelector('.lunar-leap-row');
  if (leapRow) leapRow.style.display = 'none';
  const leapCheck = newContent.querySelector('.input-lunar-leap');
  if (leapCheck) leapCheck.checked = false;
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

  // 숨겨진 직접입력 필드에 값 채우기 (모드 전환 없이)
  const fillPerson = (r, btn) => {
    // 생년월일: null이면 경고 후 수동 입력 유도
    if (!r.birth_date) {
      content.querySelector('.input-date').value = '';
      alert(`${r.name}의 생년월일을 찾을 수 없습니다.\n직접 입력해주세요. (예: 1990.09.05)`);
    } else {
      content.querySelector('.input-date').value = r.birth_date.replace(/-/g, '.');
    }
    content.querySelector('.input-name').value = r.name;

    // 성별 설정
    if (r.gender === '남' || r.gender === '여') {
      content.querySelector('.input-gender').value = r.gender;
    }

    // 커리어 타입 설정
    const careerSelect = content.querySelector('.input-career');
    const validCareers = ['직장인','사업가','프리랜서','연예인','운동선수','정치인','공인·전문직','학생','주부','타입없음'];
    if (r.career_type && validCareers.includes(r.career_type)) {
      careerSelect.value = r.career_type;
    }

    // 선택된 카드 표시
    container.querySelectorAll('.celebrity-result-btn').forEach(b => b.classList.remove('selected'));
    if (btn) btn.classList.add('selected');
  };

  // 결과를 항상 카드로 표시 (1개든 여러 개든)
  results.forEach((r, i) => {
    const btn = document.createElement('button');
    btn.className = 'celebrity-result-btn';

    const lunarStr = r.birth_date_lunar ? `<br><span style="font-size:10px;opacity:0.85">음력 ${r.birth_date_lunar}</span>` : '';
    const countryStr = r.birth_country && r.birth_country !== '대한민국' ? ` 🌏 ${r.birth_country}` : '';
    const descStr = r.description ? ` · ${r.description}` : '';
    const dateDisplay = r.birth_date ? `양력 ${r.birth_date}` : '<span style="color:#c62828">생년월일 미상</span>';
    const conflictStr = r.conflict_note ? `<br><span style="font-size:10px;color:#e65100">${r.conflict_note}</span>` : '';

    btn.innerHTML = `
      <div style="font-weight:bold">${r.name}${descStr}${countryStr}</div>
      <div style="font-size:11px;margin-top:3px">${dateDisplay}${lunarStr}${conflictStr}</div>
    `;
    btn.onclick = () => fillPerson(r, btn);

    // 결과가 1개면 자동 선택
    if (results.length === 1) {
      fillPerson(r, btn);
    }

    container.appendChild(btn);
  });
}

function collectPersonData() {
  const people = [];
  document.querySelectorAll('.tab-content').forEach(content => {
    const rawDate = content.querySelector('.input-date').value.trim();
    if (!rawDate) return;
    // YYYY.MM.DD → YYYY-MM-DD, YYYYMMDD → YYYY-MM-DD
    let dateStr = rawDate.replace(/\./g, '-').replace(/\//g, '-');
    if (/^\d{8}$/.test(dateStr)) {
      dateStr = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
    }

    const timeStr = content.querySelector('.input-time').value.trim();
    let hour = null, minute = null;
    if (timeStr && timeStr.includes(':')) {
      [hour, minute] = timeStr.split(':').map(Number);
    }

    // 양력/음력 구분
    const lunarBtn = content.querySelector('.cal-btn:last-of-type');
    const calType = lunarBtn && lunarBtn.classList.contains('active') ? 'lunar' : 'solar';
    const lunarLeap = calType === 'lunar' && content.querySelector('.input-lunar-leap')?.checked;

    people.push({
      name: content.querySelector('.input-name').value.trim() || '이름없음',
      birth_date: dateStr,
      hour,
      minute,
      gender: content.querySelector('.input-gender').value,
      career_type: content.querySelector('.input-career').value,
      cal_type: calType,
      lunar_leap: lunarLeap,
    });
  });
  return people;
}

async function startAnalysis() {
  let people = collectPersonData();
  if (people.length === 0) { alert('생년월일을 입력해주세요.'); return; }

  const btn = document.querySelector('.btn-analyze');
  btn.textContent = '계산 중...';
  btn.disabled = true;

  try {
    // 음력 → 양력 변환
    try {
      people = await Promise.all(people.map(p => convertLunarIfNeeded(p)));
    } catch(e) { alert(e.message); return; }

    const results = [];
    for (const p of people) {
      let res, data;
      try {
        res = await fetch('/api/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p),
        });
      } catch (e) {
        alert('서버에 연결할 수 없습니다.\nVS Code 터미널에서 python app.py 를 실행하세요.');
        return;
      }
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        alert(`계산 오류: ${errJson.error || '날짜 형식을 확인하세요 (예: 1980.09.18)'}`);
        return;
      }
      data = await res.json();
      if (data.success) {
        results.push({ person: p, saju: data.data });

        // 자동 저장: DB에 기본 정보 저장
        try {
          const saveRes = await fetch('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: p.name,
              birth_date: p.birth_date,
              birth_time: p.hour != null ? `${String(p.hour).padStart(2,'0')}:${String(p.minute || 0).padStart(2,'0')}` : null,
              gender: p.gender,
              career_type: p.career_type,
              saju: data.data,
              lunar_date: p.lunar_date || null,   // 음력 원본 날짜 보존
            }),
          });
          const saveData = await saveRes.json();
          // 클라이언트 ID 보존 (편집 시 사용)
          if (saveData.id) results[results.length - 1]._clientId = saveData.id;
        } catch (e) {
          console.error('자동 저장 실패:', e);
        }
      } else {
        alert(`계산 오류: ${data.error}`);
        return;
      }
    }

    sessionStorage.setItem('analysisData', JSON.stringify(results));
    window.location.href = '/analysis';
  } finally {
    btn.textContent = '📊 사주팔자 보기';
    btn.disabled = false;
  }
}

async function saveOnly() {
  let people = collectPersonData();
  if (people.length === 0) { alert('생년월일을 입력해주세요.'); return; }
  const btn = document.querySelector('.btn-save-only');
  btn.textContent = '저장 중...'; btn.disabled = true;
  try {
    // 음력 → 양력 변환
    try {
      people = await Promise.all(people.map(p => convertLunarIfNeeded(p)));
    } catch(e) { alert(e.message); return; }

    let savedCount = 0;
    for (const p of people) {
      let res, data;
      try {
        res = await fetch('/api/calculate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(p) });
      } catch(e) {
        alert('서버에 연결할 수 없습니다.\nVS Code 터미널에서 python app.py 를 실행하세요.');
        return;
      }
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        alert(`계산 오류: ${errJson.error || '날짜 형식을 확인하세요 (예: 1980.09.18)'}`);
        return;
      }
      data = await res.json();
      if (!data.success) { alert(`오류: ${data.error}`); return; }
      const payload = {
        name: p.name, birth_date: p.birth_date,
        birth_time: (p.hour !== null && p.hour !== undefined) ? `${String(p.hour).padStart(2,'0')}:${String(p.minute||0).padStart(2,'0')}` : null,
        gender: p.gender, career_type: p.career_type, saju: data.data,
        lunar_date: p.lunar_date || null,
      };
      await fetch('/api/clients', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      savedCount++;
    }
    alert(`${savedCount}명이 내담자 목록에 저장되었습니다.`);
    clearForm();
  } catch(e) {
    alert('오류: ' + e.message);
  } finally {
    btn.textContent = '💾 저장하기'; btn.disabled = false;
  }
}

function clearForm() {
  // 탭이 여러 개면 1번 탭만 남기고 제거
  document.querySelectorAll('.tab:not([data-idx="0"])').forEach(t => t.remove());
  document.querySelectorAll('.tab-content:not([data-idx="0"])').forEach(c => c.remove());
  tabCount = 1;
  personData = [{}];

  // 1번 탭 초기화
  const content = document.querySelector('.tab-content[data-idx="0"]');
  content.querySelectorAll('input').forEach(el => el.value = '');
  content.querySelectorAll('select').forEach(el => el.selectedIndex = 0);
  content.querySelector('.celebrity-results').innerHTML = '';
  content.querySelector('.celebrity-search').classList.add('hidden');
  content.querySelector('.direct-input').classList.remove('hidden');
  content.querySelectorAll('.mode-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === 0);
  });

  // 1번 탭 활성화
  document.querySelector('.tab[data-idx="0"]').classList.add('active');
  content.classList.add('active');
}
