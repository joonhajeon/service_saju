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
const JIJI_MAIN_GAN = { '子':'癸','丑':'己','寅':'甲','卯':'乙','辰':'戊','巳':'丙','午':'丁','未':'己','申':'庚','酉':'辛','戌':'戊','亥':'壬' };

// 12운성 한글 변환
const UNSEONG_KOR = {
  '長生':'장생','沐浴':'목욕','冠帶':'관대','臨官':'임관',
  '帝旺':'제왕','衰':'쇠','病':'병','死':'사',
  '墓':'묘','絶':'절','胎':'태','養':'양'
};

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
  if (!gan) return `<div class="saju-gan" style="background:#eee;color:#aaa;font-size:${size}px">?</div>`;
  const oheng = CHEONGAN_OHENG[gan];
  if (oheng === '金') {
    return `<div class="saju-gan" style="background:white;border:2px solid #333;color:#333;font-size:${size}px">${gan}</div>`;
  }
  return `<div class="saju-gan" style="background:${OHENG_BG[oheng]};color:white;font-size:${size}px">${gan}</div>`;
}

function jiCell(ji, size = 28) {
  if (!ji) return `<div class="saju-ji" style="background:#eee;color:#aaa;font-size:${size}px">?</div>`;
  const oheng = JIJI_OHENG[ji];
  if (oheng === '金') {
    return `<div class="saju-ji" style="background:white;border:2px solid #333;color:#333;font-size:${size}px">${ji}</div>`;
  }
  return `<div class="saju-ji" style="background:${OHENG_BG[oheng]};color:white;font-size:${size}px">${ji}</div>`;
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
  html += '<tr><td style="color:#777;font-size:11px">십신</td>';
  order.forEach(k => {
    const p = pillars[k];
    html += `<td style="color:#e65100;font-size:11px;font-weight:bold">${p.sipshin_gan || ''}</td>`;
  });
  html += '</tr>';

  // 천간 행
  html += '<tr><td style="color:#777;font-size:11px">천간</td>';
  order.forEach(k => {
    const p = pillars[k];
    html += `<td>${ganCell(p.gan)}</td>`;
  });
  html += '</tr>';

  // 지지 행
  html += '<tr><td style="color:#777;font-size:11px">지지</td>';
  order.forEach(k => {
    const p = pillars[k];
    html += `<td>${jiCell(p.ji)}</td>`;
  });
  html += '</tr>';

  // 지지 십신 행
  html += '<tr><td style="color:#777;font-size:11px">지지십신</td>';
  order.forEach(k => {
    const p = pillars[k];
    html += `<td style="color:#1565c0;font-size:11px;font-weight:bold">${p.sipshin_ji || ''}</td>`;
  });
  html += '</tr>';

  // 지장간 행
  html += '<tr><td style="color:#777;font-size:11px">지장간</td>';
  order.forEach(k => {
    const p = pillars[k];
    const jzg = (p.jijangan || []).map(j => `${j.gan}<span style="color:#777;font-size:9px">(${j.sipshin})</span>`).join('<br>');
    html += `<td style="font-size:10px;line-height:1.6">${jzg}</td>`;
  });
  html += '</tr>';

  // 12운성 행
  html += '<tr><td style="color:#777;font-size:11px">12운성</td>';
  order.forEach(k => {
    const p = pillars[k];
    const kor = UNSEONG_KOR[p.unseong] || p.unseong || '';
    html += `<td style="font-size:10px;color:#555">${kor}</td>`;
  });
  html += '</tr>';

  // 납음 행
  html += '<tr><td style="color:#777;font-size:11px">납음</td>';
  order.forEach(k => {
    const p = pillars[k];
    html += `<td style="font-size:10px;color:#555">${p.naeum || ''}</td>`;
  });
  html += '</tr>';

  html += '</table>';
  return html;
}

function renderOhengDist(oheng) {
  return Object.entries(oheng).map(([k, v]) => {
    if (k === '金') {
      return `<span class="oheng-badge" style="background:white;border:2px solid #333;color:#333">${k} ${v}</span>`;
    }
    return `<span class="oheng-badge" style="background:${OHENG_BG[k]};color:white">${k} ${v}</span>`;
  }).join('');
}

function renderDaeunTable(sajuData, birthYear) {
  const { daeun, daeun_start, daeun_direction, ilgan } = sajuData;
  const currentYear = new Date().getFullYear();

  let label = `🔄 대운 (대운수 ${daeun_start || '?'}) · ${daeun_direction || ''}`;
  let html = `<div class="daeun-section">`;
  html += `<div class="daeun-label">${label}</div>`;
  html += `<div class="daeun-table-wrapper"><table class="daeun-table" id="daeunTableEl">`;

  // 천간 십신 행
  html += '<tr><td>십신(天)</td>';
  daeun.forEach(d => {
    const ss = d.sipshin_gan || getSipshin(ilgan, d.gan);
    html += `<td style="font-size:10px;color:#e65100">${ss}</td>`;
  });
  html += '</tr>';

  // 나이 행
  html += '<tr><td>나이</td>';
  daeun.forEach(d => {
    const personYear = birthYear + d.age;
    const isCurrent = (personYear <= currentYear && currentYear < personYear + 10);
    html += `<td class="${isCurrent ? 'daeun-current' : ''}" onclick="selectDaeun(${d.age}, '${d.gan}', '${d.ji}', ${birthYear})">${d.age}</td>`;
  });
  html += '</tr>';

  // 천간 행
  html += '<tr><td>천간</td>';
  daeun.forEach(d => {
    const personYear = birthYear + d.age;
    const isCurrent = (personYear <= currentYear && currentYear < personYear + 10);
    const oheng = CHEONGAN_OHENG[d.gan];
    const color = oheng === '金' ? '#333' : (OHENG_BG[oheng] || '#333');
    html += `<td class="${isCurrent ? 'daeun-current' : ''}" style="color:${isCurrent ? '' : color};font-weight:bold" onclick="selectDaeun(${d.age}, '${d.gan}', '${d.ji}', ${birthYear})">${d.gan}</td>`;
  });
  html += '</tr>';

  // 지지 행
  html += '<tr><td>지지</td>';
  daeun.forEach(d => {
    const personYear = birthYear + d.age;
    const isCurrent = (personYear <= currentYear && currentYear < personYear + 10);
    const oheng = JIJI_OHENG[d.ji];
    const color = oheng === '金' ? '#333' : (OHENG_BG[oheng] || '#333');
    html += `<td class="${isCurrent ? 'daeun-current' : ''}" style="color:${isCurrent ? '' : color};font-weight:bold" onclick="selectDaeun(${d.age}, '${d.gan}', '${d.ji}', ${birthYear})">${d.ji}</td>`;
  });
  html += '</tr>';

  // 지지 십신 행
  html += '<tr><td>십신(地)</td>';
  daeun.forEach(d => {
    const ss = d.sipshin_ji || getSipshinJiji(ilgan, d.ji);
    html += `<td style="font-size:10px;color:#1565c0">${ss}</td>`;
  });
  html += '</tr>';

  html += '</table></div></div>';
  return html;
}

function selectDaeun(startAge, daeunGan, daeunJi, birthYear) {
  selectedDaeunAge = startAge;

  // Highlight selected 대운 column
  document.querySelectorAll('#daeunTableEl td').forEach(td => {
    td.classList.remove('daeun-selected');
  });
  // Find and highlight all tds in that column
  const rows = document.querySelectorAll('#daeunTableEl tr');
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    cells.forEach(cell => {
      if (cell.textContent.trim() === String(startAge) || cell.getAttribute('onclick')?.includes(`selectDaeun(${startAge},`)) {
        // highlight the whole column by matching onclick attribute
      }
    });
  });

  const item = allAnalysisData[currentPersonIdx];
  const ilgan = item.saju.ilgan;
  renderSeunTable(startAge, birthYear, ilgan);
}

function renderSeunTable(daeunStartAge, birthYear, ilgan) {
  const currentYear = new Date().getFullYear();
  const seunContainer = document.getElementById('seunSection');
  if (!seunContainer) return;

  const seunList = [];
  for (let i = 0; i < 10; i++) {
    const age = daeunStartAge + i;
    const year = birthYear + age;
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

  // 천간 십신 행
  html += '<tr><td>십신(天)</td>';
  seunList.forEach(s => {
    html += `<td style="font-size:10px;color:#e65100">${s.sipshin_gan}</td>`;
  });
  html += '</tr>';

  // 나이/년도 행
  html += '<tr><td>나이·년도</td>';
  seunList.forEach(s => {
    const isCurrent = (s.year === currentYear);
    html += `<td class="${isCurrent ? 'seun-current' : ''}" style="font-size:10px">${s.age}<br><span style="color:#777;font-size:9px">${s.year}</span></td>`;
  });
  html += '</tr>';

  // 천간 행
  html += '<tr><td>천간</td>';
  seunList.forEach(s => {
    const isCurrent = (s.year === currentYear);
    const oheng = CHEONGAN_OHENG[s.gan];
    const color = oheng === '金' ? '#333' : OHENG_BG[oheng];
    if (oheng === '金') {
      html += `<td class="${isCurrent ? 'seun-current' : ''}" style="background:white;border:1px solid #333;color:#333;font-weight:bold">${s.gan}</td>`;
    } else {
      html += `<td class="${isCurrent ? 'seun-current' : ''}" style="color:${color};font-weight:bold">${s.gan}</td>`;
    }
  });
  html += '</tr>';

  // 지지 행
  html += '<tr><td>지지</td>';
  seunList.forEach(s => {
    const isCurrent = (s.year === currentYear);
    const oheng = JIJI_OHENG[s.ji];
    const color = oheng === '金' ? '#333' : OHENG_BG[oheng];
    if (oheng === '金') {
      html += `<td class="${isCurrent ? 'seun-current' : ''}" style="background:white;border:1px solid #333;color:#333;font-weight:bold">${s.ji}</td>`;
    } else {
      html += `<td class="${isCurrent ? 'seun-current' : ''}" style="color:${color};font-weight:bold">${s.ji}</td>`;
    }
  });
  html += '</tr>';

  // 지지 십신 행
  html += '<tr><td>십신(地)</td>';
  seunList.forEach(s => {
    html += `<td style="font-size:10px;color:#1565c0">${s.sipshin_ji}</td>`;
  });
  html += '</tr>';

  html += '</table></div></div>';
  seunContainer.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
  const raw = sessionStorage.getItem('analysisData');
  if (!raw) return;
  allAnalysisData = JSON.parse(raw);

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

  document.getElementById('sajuTable').innerHTML = renderSajuTable(item.saju);
  document.getElementById('ohengDist').innerHTML = renderOhengDist(item.saju.oheng);
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
  await fetch('/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  alert('저장되었습니다.');
}

function startAiAnalysis() {
  const item = allAnalysisData[currentPersonIdx];
  if (!item) return;
  startStreaming(item.person, item.saju);
}
