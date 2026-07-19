// static/js/multi-display.js
// display.js 가 base.html 에 이미 로드되어 있으므로 상수/함수 중복 선언 없이 재사용합니다.

// 대운/세운 모두 접기 · 펼치기
// type: 'daeun' | 'seun' | 'both'
function collapseAll(type) {
  const targets = [];
  if (type === 'daeun' || type === 'both') {
    document.querySelectorAll('.daeun-table-wrapper[id]').forEach(el => targets.push({ el, kind: 'daeun' }));
  }
  if (type === 'seun' || type === 'both') {
    document.querySelectorAll('.seun-table-wrapper[id]').forEach(el => targets.push({ el, kind: 'seun' }));
  }

  // 하나라도 열려있으면 → 전부 접기 / 모두 닫혀있으면 → 전부 펼치기
  const anyOpen = targets.some(({ el }) => el.style.display !== 'none');
  const nextState = anyOpen ? 'none' : '';
  const nextLabel = anyOpen ? '펼치기' : '접기';

  targets.forEach(({ el }) => {
    el.style.display = nextState;
    // 같은 섹션의 접기 버튼 텍스트도 동기화
    const label = el.closest('.daeun-section, .seun-section');
    if (label) {
      const btn = label.querySelector('.btn-collapse');
      if (btn) btn.textContent = nextLabel;
    }
    // 세운 접기 시 월별 천간지지 영역도 함께 처리
    if (el.id && el.id.endsWith('_wrap')) {
      const monthly = document.getElementById(el.id.replace(/_wrap$/, '_monthly'));
      if (monthly) monthly.style.display = nextState;
    }
  });

  // 툴바 버튼 텍스트도 전환
  const btnMap = { daeun: '대운', seun: '세운', both: '대운/세운' };
  const label = btnMap[type];
  document.querySelectorAll('.btn-collapse-all').forEach(btn => {
    if (btn.textContent.includes(label) || (type === 'both' && btn.classList.contains('btn-collapse-all--both'))) {
      btn.textContent = anyOpen ? `${label} 모두 펼치기` : `${label} 모두 접기`;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const raw = sessionStorage.getItem('analysisData');
  if (!raw) {
    document.getElementById('multiGrid').innerHTML =
      '<p style="color:#c62828;grid-column:1/-1">분석 데이터가 없습니다. 내담자 목록에서 선택해주세요.</p>';
    return;
  }

  let analysisData;
  try {
    analysisData = JSON.parse(raw);
  } catch(e) {
    document.getElementById('multiGrid').innerHTML =
      '<p style="color:#c62828;grid-column:1/-1">데이터를 불러오는 중 오류가 발생했습니다.</p>';
    return;
  }

  const titleEl = document.getElementById('multiTitle');
  if (titleEl) titleEl.textContent = `${analysisData.length}명 사주 명식 비교`;

  // 정확히 2명일 때만 궁합 버튼 표시
  const btnG = document.getElementById('btnGoonghapFromMulti');
  if (btnG && analysisData.length === 2) btnG.style.display = '';

  const grid = document.getElementById('multiGrid');
  if (!grid) return;

  analysisData.forEach((item, idx) => {
    const p = item.person;
    const saju = item.saju;

    const dateStr = (p.birth_date || '').replace(/-/g, '.');
    let timeStr = '시간없음';
    if (p.hour !== null && p.hour !== undefined && p.hour !== '') {
      const h = parseInt(p.hour, 10);
      const m = parseInt(p.minute || 0, 10);
      if (!isNaN(h)) timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    }
    const genderStr = p.gender || '';
    const careerStr = (p.career_type && p.career_type !== '타입없음') ? ` · ${p.career_type}` : '';

    // 출생연도 파싱
    const _bds = String(p.birth_date || '').replace(/[-\.]/g, '');
    const birthYear = _bds.length >= 4 ? parseInt(_bds.slice(0, 4), 10) : 0;

    // 나이 계산 (세는 나이)
    const ageStr = birthYear ? ` <span style="color:var(--accent);font-weight:bold">${new Date().getFullYear() - birthYear + 1}세</span>` : '';

    // 카드마다 고유 ID
    const daeunTableId   = `daeunTableEl-${idx}`;
    const seunContainerId = `seunSection-${idx}`;

    const card = document.createElement('div');
    card.className = 'multi-card';

    const sajuHtml  = saju ? renderSajuTable(saju)           : '<p style="color:#c62828">사주 데이터 없음</p>';
    const ohengHtml = saju ? renderOhengDist(saju.oheng, saju.pillars) : '';
    const daeunHtml = (saju && birthYear) ? renderDaeunTable(saju, birthYear, daeunTableId, seunContainerId) : '';

    const lunarBadge = p.lunar_date
      ? `<span style="font-size:11px;color:#888;margin-left:4px">(음력 ${String(p.lunar_date).replace(/-/g,'.')})</span>`
      : '';
    card.innerHTML = `
      <div class="multi-card-header">${p.name || '이름없음'}</div>
      <div class="person-info-bar" style="margin-bottom:10px">
        <span class="person-info-date">${dateStr}</span>${lunarBadge}
        <span class="person-info-time" style="margin-left:4px">${timeStr}</span>${ageStr}
        <span class="person-info-misc">${genderStr}${careerStr}</span>
      </div>
      <div>${sajuHtml}</div>
      <div style="margin-top:10px">${ohengHtml}</div>
      <div style="margin-top:10px">${daeunHtml}</div>
      <div id="${seunContainerId}" style="margin-top:6px"></div>
    `;
    grid.appendChild(card);

    // 현재 대운에 해당하는 세운 자동 렌더링
    if (saju && saju.daeun && birthYear) {
      const currentYear = new Date().getFullYear();
      const currentDaeun = saju.daeun.find(d => {
        const personYear = birthYear + d.age;
        return personYear <= currentYear && currentYear < personYear + 10;
      });
      if (currentDaeun) {
        // DOM이 추가된 이후 렌더링
        setTimeout(() => renderSeunTable(currentDaeun.age, birthYear, saju.ilgan, seunContainerId), 0);
      }
    }
  });
});

function goGoonghapFromMulti() {
  const raw = sessionStorage.getItem('analysisData');
  if (!raw) return;
  const data = JSON.parse(raw);
  if (data.length !== 2) return;
  // analysisData 형식을 goonghapData 형식으로 변환
  const people = data.map(item => ({
    name: item.person.name,
    birth_date: item.person.birth_date,
    birth_time: item.person.birth_time || null,
    gender: item.person.gender,
    career_type: item.person.career_type,
    hour: item.person.hour,
    minute: item.person.minute,
    saju: item.saju,
  }));
  sessionStorage.setItem('goonghapData', JSON.stringify(people));
  window.location.href = '/goonghap';
}
