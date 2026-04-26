// static/js/display.js

let currentPersonIdx = 0;
let allAnalysisData = [];
let selectedDaeunAge = null;

const CG = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const JJ = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const OHENG_BG = { '木': '#2d9e4f', '火': '#e63946', '土': '#e8a020', '金': '#888888', '水': '#1565c0' };
const CHEONGAN_OHENG = { '甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水' };
const JIJI_OHENG = { '子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水' };
const CHEONGAN_EUYANG = { '甲':'양','乙':'음','丙':'양','丁':'음','戊':'양','己':'음','庚':'양','辛':'음','壬':'양','癸':'음' };
// 지지 음양 = 지장간 정기(正氣) 천간의 음양을 따름
// 양: 寅(甲)·辰(戊)·巳(丙)·申(庚)·戌(戊)·亥(壬)
// 음: 子(癸)·丑(己)·卯(乙)·午(丁)·未(己)·酉(辛)
const JIJI_EUYANG     = { '子':'음','丑':'음','寅':'양','卯':'음','辰':'양','巳':'양','午':'음','未':'음','申':'양','酉':'음','戌':'양','亥':'양' };
const JIJI_MAIN_GAN = { '子':'癸','丑':'己','寅':'甲','卯':'乙','辰':'戊','巳':'丙','午':'丁','未':'己','申':'庚','酉':'辛','戌':'戊','亥':'壬' };

// 살(殺) 지지 목록
const YEOKMA_JI = new Set(['寅','申','巳','亥']);
const DOHWA_JI  = new Set(['子','午','卯','酉']);
const HWAGAE_JI = new Set(['辰','戌','丑','未']);

// 12운성 한글 변환
const UNSEONG_KOR = {
  '長生':'장생','沐浴':'목욕','冠帶':'관대','臨官':'임관',
  '帝旺':'제왕','衰':'쇠','病':'병','死':'사',
  '墓':'묘','絶':'절','胎':'태','養':'양'
};

// 壬·癸(임수·계수), 子·亥(자수·해수)는 검정 배경
const CHEONGAN_BG_OVERRIDE = { '壬': '#1a1a1a', '癸': '#1a1a1a' };
const JIJI_BG_OVERRIDE    = { '子': '#1a1a1a', '亥': '#1a1a1a' };

// 대운·세운 천간/지지 td 셀 스타일 (사주표와 동일한 색상 체계, 金은 테두리 없이 흰 배경)
function ganTdStyle(gan, isCurrent) {
  if (isCurrent) return 'font-weight:bold';
  const fw = CHEONGAN_EUYANG[gan] === '양' ? 'bold' : 'normal';
  if (CHEONGAN_BG_OVERRIDE[gan]) return `background:#1a1a1a;color:white;font-weight:${fw}`;
  const oheng = CHEONGAN_OHENG[gan];
  if (!oheng) return `font-weight:${fw}`;
  if (oheng === '金') return `color:#333;font-weight:normal`;
  return `background:${OHENG_BG[oheng]};color:white;font-weight:${fw}`;
}

function jiTdStyle(ji, isCurrent) {
  if (isCurrent) return 'font-weight:bold';
  const fw = JIJI_EUYANG[ji] === '양' ? 'bold' : 'normal';
  if (JIJI_BG_OVERRIDE[ji]) return `background:#1a1a1a;color:white;font-weight:${fw}`;
  const oheng = JIJI_OHENG[ji];
  if (!oheng) return `font-weight:${fw}`;
  if (oheng === '金') return `color:#333;font-weight:normal`;
  return `background:${OHENG_BG[oheng]};color:white;font-weight:${fw}`;
}

const SAENG = {'木':'火','火':'土','土':'金','金':'水','水':'木'};
const GEUK  = {'木':'土','火':'金','土':'水','金':'木','水':'火'};

function getSipshin(ilgan, targetGan) {
  if (!ilgan || !targetGan) return '';
  const ilO = CHEONGAN_OHENG[ilgan];
  const tO  = CHEONGAN_OHENG[targetGan];
  const ilE = CHEONGAN_EUYANG[ilgan];
  const tE  = CHEONGAN_EUYANG[targetGan];
  const same = (ilE === tE);
  if (ilO === tO)              return same ? '비견' : '겁재';
  if (SAENG[ilO] === tO)       return same ? '식신' : '상관';
  if (GEUK[ilO] === tO)        return same ? '편재' : '정재';
  if (SAENG[tO] === ilO)       return same ? '편인' : '정인';
  if (GEUK[tO] === ilO)        return same ? '편관' : '정관';
  return '';
}

function getSipshinJiji(ilgan, jiji) {
  const mainGan = JIJI_MAIN_GAN[jiji];
  return mainGan ? getSipshin(ilgan, mainGan) : '';
}

function getYearPillar(year) {
  const idx60 = ((year - 4) % 60 + 60) % 60;
  return { gan: CG[idx60 % 10], ji: JJ[idx60 % 12] };
}

function ganCell(gan, size = 28) {
  if (!gan) return `<div class="saju-gan" style="background:#eee;color:#aaa;font-size:${size}px;font-weight:normal">?</div>`;
  if (CHEONGAN_BG_OVERRIDE[gan]) {
    // 壬·癸: 검정 배경, 양이면 bold
    const fw = CHEONGAN_EUYANG[gan] === '양' ? 'bold' : 'normal';
    return `<div class="saju-gan" style="background:${CHEONGAN_BG_OVERRIDE[gan]};color:white;font-size:${size}px;font-weight:${fw}">${gan}</div>`;
  }
  const oheng = CHEONGAN_OHENG[gan];
  const isYang = CHEONGAN_EUYANG[gan] === '양';
  if (oheng === '金') {
    // 금: 테두리 박스, bold 제거
    return `<div class="saju-gan" style="background:white;border:2px solid #333;color:#333;font-size:${size}px;font-weight:normal">${gan}</div>`;
  }
  const fw = isYang ? 'bold' : 'normal';
  return `<div class="saju-gan" style="background:${OHENG_BG[oheng]};color:white;font-size:${size}px;font-weight:${fw}">${gan}</div>`;
}

function jiCell(ji, size = 28) {
  if (!ji) return `<div class="saju-ji" style="background:#eee;color:#aaa;font-size:${size}px;font-weight:normal">?</div>`;
  if (JIJI_BG_OVERRIDE[ji]) {
    const fw = JIJI_EUYANG[ji] === '양' ? 'bold' : 'normal';
    return `<div class="saju-ji" style="background:${JIJI_BG_OVERRIDE[ji]};color:white;font-size:${size}px;font-weight:${fw}">${ji}</div>`;
  }
  const oheng = JIJI_OHENG[ji];
  const isYang = JIJI_EUYANG[ji] === '양';
  if (oheng === '金') {
    return `<div class="saju-ji" style="background:white;border:2px solid #333;color:#333;font-size:${size}px;font-weight:normal">${ji}</div>`;
  }
  const fw = isYang ? 'bold' : 'normal';
  return `<div class="saju-ji" style="background:${OHENG_BG[oheng]};color:white;font-size:${size}px;font-weight:${fw}">${ji}</div>`;
}

function renderSajuTable(sajuData) {
  const { pillars } = sajuData;
  const order = ['시주', '일주', '월주', '년주'];
  const labels = ['시', '일', '월', '년'];

  let html = `<table class="saju-table">`;

  html += '<tr><th></th>';
  labels.forEach(l => html += `<th>${l}</th>`);
  html += '</tr>';

  // 십신 (천간) 행
  html += '<tr><td style="color:#333;font-size:11px;font-weight:bold">십신</td>';
  order.forEach(k => {
    const p = pillars[k];
    html += `<td style="color:#333;font-size:11px;font-weight:bold">${p.sipshin_gan || ''}</td>`;
  });
  html += '</tr>';

  // 천간 행
  html += '<tr><td style="color:#333;font-size:11px;font-weight:bold">천간</td>';
  order.forEach(k => {
    const p = pillars[k];
    html += `<td>${ganCell(p.gan)}</td>`;
  });
  html += '</tr>';

  // 지지 행
  html += '<tr><td style="color:#333;font-size:11px;font-weight:bold">지지</td>';
  order.forEach(k => {
    const p = pillars[k];
    html += `<td>${jiCell(p.ji)}</td>`;
  });
  html += '</tr>';

  // 지지 십신 행
  html += '<tr><td style="color:#333;font-size:11px;font-weight:bold">지지십신</td>';
  order.forEach(k => {
    const p = pillars[k];
    html += `<td style="color:#333;font-size:11px;font-weight:bold">${p.sipshin_ji || ''}</td>`;
  });
  html += '</tr>';

  // 지장간 행
  html += '<tr><td style="color:#333;font-size:11px;font-weight:bold">지장간</td>';
  order.forEach(k => {
    const p = pillars[k];
    const jzg = (p.jijangan || []).map(j => `${j.gan}<span style="color:#777;font-size:11px">(${j.sipshin})</span>`).join('<br>');
    html += `<td style="font-size:12px;line-height:1.7">${jzg}</td>`;
  });
  html += '</tr>';

  // 12운성 행
  html += '<tr><td style="color:#333;font-size:11px;font-weight:bold">12운성</td>';
  order.forEach(k => {
    const p = pillars[k];
    const kor = UNSEONG_KOR[p.unseong] || p.unseong || '';
    html += `<td style="font-size:12px;color:#555">${kor}</td>`;
  });
  html += '</tr>';

  html += '</table>';
  return html;
}

function renderOhengDist(oheng, pillars) {
  const ORDER = ['木','火','土','金','水'];
  // 오행 배지 (목화토금수 순서 고정)
  let html = '<div class="oheng-dist">';
  ORDER.forEach(k => {
    const v = oheng[k] || 0;
    if (k === '金') {
      html += `<span class="oheng-badge" style="background:white;border:2px solid #333;color:#333">${k} ${v}</span>`;
    } else if (k === '水') {
      html += `<span class="oheng-badge" style="background:#1a1a1a;color:white">${k} ${v}</span>`;
    } else {
      html += `<span class="oheng-badge" style="background:${OHENG_BG[k]};color:white">${k} ${v}</span>`;
    }
  });
  html += '</div>';

  // 양·음 글자 수 (천간+지지 합산)
  let yangCnt = 0, yinCnt = 0;
  const PKEYS = ['시주','일주','월주','년주'];
  if (pillars) {
    PKEYS.forEach(k => {
      const p = pillars[k];
      if (!p) return;
      if (p.gan) { CHEONGAN_EUYANG[p.gan] === '양' ? yangCnt++ : yinCnt++; }
      if (p.ji)  { JIJI_EUYANG[p.ji]  === '양' ? yangCnt++ : yinCnt++; }
    });
  }
  html += `<div class="euyang-row">양(陽) <strong>${yangCnt}</strong>개 &nbsp;·&nbsp; 음(陰) <strong>${yinCnt}</strong>개</div>`;

  // 살(殺) — 지지 기준
  let yeokma = 0, dohwa = 0, hwagae = 0;
  if (pillars) {
    PKEYS.forEach(k => {
      const ji = pillars[k]?.ji;
      if (!ji) return;
      if (YEOKMA_JI.has(ji)) yeokma++;
      if (DOHWA_JI.has(ji))  dohwa++;
      if (HWAGAE_JI.has(ji)) hwagae++;
    });
  }
  html += `<div class="sal-row">역마살(驛馬) <strong>${yeokma}</strong> &nbsp;·&nbsp; 도화살(桃花) <strong>${dohwa}</strong> &nbsp;·&nbsp; 화개살(華蓋) <strong>${hwagae}</strong></div>`;

  return html;
}

function renderDaeunTable(sajuData, birthYear) {
  const { daeun: daeunRaw, daeun_start, daeun_direction, ilgan } = sajuData;
  const daeun = (daeunRaw || []).filter(d => d.age <= 100);
  const currentYear = new Date().getFullYear();

  // Find the current daeun age (현재 년도에 해당하는 대운)
  let currentDaeunAge = null;
  for (const d of daeun) {
    const personYear = birthYear + d.age;
    if (personYear <= currentYear && currentYear < personYear + 10) {
      currentDaeunAge = d.age;
      break;
    }
  }

  let label = `🔄 대운 (대운수 ${daeun_start || '?'}) · ${daeun_direction || ''}`;
  let html = `<div class="daeun-section">`;
  html += `<div class="daeun-label">${label}</div>`;
  html += `<div class="daeun-table-wrapper"><table class="daeun-table" id="daeunTableEl">`;

  // Helper function to add daeun-selected class for current year's daeun
  const daeunClass = (age) => (age === currentDaeunAge) ? ' daeun-selected' : '';

  // 나이 행
  html += '<tr><td>나이</td>';
  daeun.forEach(d => {
    html += `<td data-age="${d.age}" class="${daeunClass(d.age)}" onclick="selectDaeun(${d.age}, '${d.gan}', '${d.ji}', ${birthYear})">${d.age}</td>`;
  });
  html += '</tr>';

  // 십신(天) 행
  html += '<tr><td>십신(天)</td>';
  daeun.forEach(d => {
    const ss = d.sipshin_gan || getSipshin(ilgan, d.gan);
    html += `<td data-age="${d.age}" class="${daeunClass(d.age)}" style="font-size:10px;color:#333;font-weight:bold" onclick="selectDaeun(${d.age}, '${d.gan}', '${d.ji}', ${birthYear})">${ss}</td>`;
  });
  html += '</tr>';

  // 천간 행
  html += '<tr><td>천간</td>';
  daeun.forEach(d => {
    html += `<td data-age="${d.age}" class="${daeunClass(d.age)}" style="${ganTdStyle(d.gan, false)}" onclick="selectDaeun(${d.age}, '${d.gan}', '${d.ji}', ${birthYear})">${d.gan}</td>`;
  });
  html += '</tr>';

  // 지지 행
  html += '<tr><td>지지</td>';
  daeun.forEach(d => {
    html += `<td data-age="${d.age}" class="${daeunClass(d.age)}" style="${jiTdStyle(d.ji, false)}" onclick="selectDaeun(${d.age}, '${d.gan}', '${d.ji}', ${birthYear})">${d.ji}</td>`;
  });
  html += '</tr>';

  // 십신(地) 행
  html += '<tr><td>십신(地)</td>';
  daeun.forEach(d => {
    const ss = d.sipshin_ji || getSipshinJiji(ilgan, d.ji);
    html += `<td data-age="${d.age}" class="${daeunClass(d.age)}" style="font-size:10px;color:#333;font-weight:bold" onclick="selectDaeun(${d.age}, '${d.gan}', '${d.ji}', ${birthYear})">${ss}</td>`;
  });
  html += '</tr>';

  html += '</table></div></div>';
  return html;
}

function selectDaeun(startAge, daeunGan, daeunJi, birthYear) {
  selectedDaeunAge = startAge;

  // 이전 선택 해제
  document.querySelectorAll('#daeunTableEl td[data-age]').forEach(td => {
    td.classList.remove('daeun-selected');
  });

  // 선택한 열 전체 하이라이트
  document.querySelectorAll(`#daeunTableEl td[data-age="${startAge}"]`).forEach(td => {
    td.classList.add('daeun-selected');
  });

  const item = allAnalysisData[currentPersonIdx];
  renderSeunTable(startAge, birthYear, item.saju.ilgan);
}

function renderSeunTable(daeunStartAge, birthYear, ilgan) {
  const currentYear = new Date().getFullYear();
  const seunContainer = document.getElementById('seunSection');
  if (!seunContainer) return;

  const seunList = [];
  for (let i = 0; i < 10; i++) {
    const age = daeunStartAge + i;
    const year = birthYear + age - 1;  // 한국 나이(세는 나이) → 연도 변환
    const p = getYearPillar(year);
    seunList.push({
      age, year,
      gan: p.gan, ji: p.ji,
      sipshin_gan: getSipshin(ilgan, p.gan),
      sipshin_ji: getSipshinJiji(ilgan, p.ji),
    });
  }

  let html = `<div class="seun-section">`;
  html += `<div class="seun-label">📅 세운 (${daeunStartAge}세 대운)</div>`;
  html += `<div class="seun-table-wrapper"><table class="seun-table">`;

  // 나이 행
  html += '<tr><td>나이</td>';
  seunList.forEach(s => {
    html += `<td style="font-size:11px">${s.age}</td>`;
  });
  html += '</tr>';

  // 년도 행
  html += '<tr><td>년도</td>';
  seunList.forEach(s => {
    html += `<td style="font-size:10px;color:#333">${s.year}년</td>`;
  });
  html += '</tr>';

  // 십신(天) 행
  html += '<tr><td>십신(天)</td>';
  seunList.forEach(s => {
    html += `<td style="font-size:10px;color:#333;font-weight:bold">${s.sipshin_gan}</td>`;
  });
  html += '</tr>';

  // 천간 행
  html += '<tr><td>천간</td>';
  seunList.forEach(s => {
    html += `<td style="${ganTdStyle(s.gan, false)}">${s.gan}</td>`;
  });
  html += '</tr>';

  // 지지 행
  html += '<tr><td>지지</td>';
  seunList.forEach(s => {
    html += `<td style="${jiTdStyle(s.ji, false)}">${s.ji}</td>`;
  });
  html += '</tr>';

  // 지지 십신 행
  html += '<tr><td>십신(地)</td>';
  seunList.forEach(s => {
    html += `<td style="font-size:10px;color:#333;font-weight:bold">${s.sipshin_ji}</td>`;
  });
  html += '</tr>';

  html += '</table></div></div>';
  seunContainer.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
  const raw = sessionStorage.getItem('analysisData');
  if (!raw) return;
  allAnalysisData = JSON.parse(raw);

  // sessionStorage에서 AI 분석 결과 복원
  const saved = sessionStorage.getItem('docContents');
  if (saved) {
    try {
      window.docContents = JSON.parse(saved);
    } catch (e) {
      console.error('docContents 복원 실패:', e);
    }
  }

  const personTabs = document.getElementById('personResultTabs');
  if (!personTabs) return;

  allAnalysisData.forEach((item, idx) => {
    const btn = document.createElement('button');
    btn.className = `tab ${idx === 0 ? 'active' : ''}`;
    btn.textContent = item.person.name;
    btn.onclick = () => showPerson(idx);
    personTabs.appendChild(btn);
  });

  showPerson(0);
});

function showPerson(idx) {
  currentPersonIdx = idx;
  selectedDaeunAge = null;
  if (!allAnalysisData[idx]) return;
  document.querySelectorAll('#personResultTabs .tab').forEach((t, i) => t.classList.toggle('active', i === idx));
  const item = allAnalysisData[idx];

  // 저장된 문서가 있으면 표시
  if (item.documents) {
    [1, 2, 3].forEach(n => {
      const el = document.getElementById(`doc${n}`);
      if (el && item.documents[`doc${n}`]) {
        el.innerHTML = markdownToHtml(item.documents[`doc${n}`]);
      }
    });
  }

  // 인물 정보 표시
  const infoEl = document.getElementById('personInfo');
  if (infoEl) {
    const p = item.person;
    const dateStr = p.birth_date ? p.birth_date.replace(/-/g, '.') : '';
    let timeStr = '시간없음';
    if (p.hour !== null && p.hour !== undefined && p.hour !== '') {
      const h = parseInt(p.hour, 10);
      const m = parseInt(p.minute || 0, 10);
      if (!isNaN(h)) timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    }
    const genderStr = p.gender || '';
    const careerStr = p.career_type && p.career_type !== '타입없음' ? ` · ${p.career_type}` : '';
    // 나이 계산 (세는 나이)
    let ageStr = '';
    if (p.birth_date) {
      const bYear = parseInt(p.birth_date.slice(0, 4), 10);
      const age = new Date().getFullYear() - bYear + 1;
      ageStr = ` · ${age}세`;
    }
    infoEl.innerHTML = `<div class="person-info-bar">
      <span class="person-info-date">${dateStr}</span>
      <span class="person-info-time">${timeStr}</span>
      <span class="person-info-misc">${genderStr}${careerStr}${ageStr}</span>
    </div>`;
  }

  document.getElementById('sajuTable').innerHTML = renderSajuTable(item.saju);
  document.getElementById('ohengDist').innerHTML = renderOhengDist(item.saju.oheng, item.saju.pillars);
  const birthYear = parseInt(item.person.birth_date.split('-')[0]);
  document.getElementById('daeunTable').innerHTML = renderDaeunTable(item.saju, birthYear);

  // Clear 세운
  const seunSection = document.getElementById('seunSection');
  if (seunSection) seunSection.innerHTML = '<div style="color:#777;font-size:12px;padding:8px">대운을 클릭하면 세운이 표시됩니다.</div>';

  // Auto-select current 대운
  const currentYear = new Date().getFullYear();
  const daeun = item.saju.daeun || [];
  let currentDaeun = null;
  for (const d of daeun) {
    const personYear = birthYear + d.age;
    if (personYear <= currentYear && currentYear < personYear + 10) {
      currentDaeun = d;
      break;
    }
  }
  if (currentDaeun) {
    renderSeunTable(currentDaeun.age, birthYear, item.saju.ilgan);
  }

  // NO auto-streaming. AI analysis is on-demand via button.
}

function showDoc(docId) {
  document.querySelectorAll('.doc-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('onclick') && t.getAttribute('onclick').includes(docId));
  });
  document.querySelectorAll('.doc-content').forEach(c => {
    c.classList.toggle('active', c.id === docId);
    c.classList.toggle('hidden', c.id !== docId);
  });
}

function printDoc() {
  window.print();
}

async function saveClient() {
  const raw = sessionStorage.getItem('analysisData');
  if (!raw) return;
  const data = JSON.parse(raw)[currentPersonIdx];

  // 로딩 상태 표시
  const btn = document.querySelector('.btn-save');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ 저장 중...';

  try {
    const payload = {
      name: data.person.name,
      birth_date: data.person.birth_date,
      birth_time: data.person.hour != null ? `${data.person.hour}:${String(data.person.minute || 0).padStart(2,'0')}` : null,
      gender: data.person.gender,
      career_type: data.person.career_type,
      saju: data.saju,
      documents: {
        doc1: window.docContents ? window.docContents[1] : '',
        doc2: window.docContents ? window.docContents[2] : '',
        doc3: window.docContents ? window.docContents[3] : '',
      },
    };

    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      // 저장 완료 피드백
      btn.textContent = '✅ 저장됨';
      showSaveToast();

      // 2초 후 원래 텍스트로 복원
      setTimeout(() => {
        if (btn.textContent === '✅ 저장됨') {
          btn.textContent = originalText;
          btn.disabled = false;
        }
      }, 2000);
    } else {
      alert('저장 실패: 다시 시도해주세요.');
      btn.textContent = originalText;
      btn.disabled = false;
    }
  } catch (e) {
    alert('저장 중 오류 발생: ' + e.message);
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

function showSaveToast() {
  const toast = document.getElementById('saveToast');
  if (!toast) return;

  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

function startAiAnalysis() {
  const item = allAnalysisData[currentPersonIdx];
  if (!item) return;
  startStreaming(item.person, item.saju);
}
