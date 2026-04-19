// static/js/display.js

let currentPersonIdx = 0;
let allAnalysisData = [];

const OHENG_BG = { '木': '#2d9e4f', '火': '#e63946', '土': '#e8a020', '金': '#aaa9ad', '水': '#1d3557' };
const CHEONGAN_OHENG = { '甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水' };
const JIJI_OHENG = { '子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水' };

function renderSajuTable(sajuData) {
  const { pillars } = sajuData;
  const order = ['시주', '일주', '월주', '년주'];
  const labels = ['시', '일', '월', '년'];

  let html = `<table class="saju-table">`;

  // 헤더
  html += '<tr><th></th>';
  labels.forEach(l => html += `<th>${l}</th>`);
  html += '</tr>';

  // 십신 (천간) 행
  html += '<tr><td style="color:var(--text-dim);font-size:11px">십신</td>';
  order.forEach(k => {
    const p = pillars[k];
    html += `<td style="color:var(--yellow);font-size:11px">${p.sipshin_gan || ''}</td>`;
  });
  html += '</tr>';

  // 천간 행
  html += '<tr><td style="color:var(--text-dim);font-size:11px">천간</td>';
  order.forEach(k => {
    const p = pillars[k];
    if (!p.gan) {
      html += '<td><div class="saju-gan" style="background:var(--bg2);color:var(--text-dim)">?</div></td>';
    } else {
      const oheng = CHEONGAN_OHENG[p.gan];
      const bg = OHENG_BG[oheng];
      html += `<td><div class="saju-gan" style="background:${bg};color:white">${p.gan}</div></td>`;
    }
  });
  html += '</tr>';

  // 지지 행
  html += '<tr><td style="color:var(--text-dim);font-size:11px">지지</td>';
  order.forEach(k => {
    const p = pillars[k];
    if (!p.ji) {
      html += '<td><div class="saju-ji" style="background:var(--bg2);color:var(--text-dim)">?</div></td>';
    } else {
      const oheng = JIJI_OHENG[p.ji];
      const bg = OHENG_BG[oheng];
      html += `<td><div class="saju-ji" style="background:${bg};color:white">${p.ji}</div></td>`;
    }
  });
  html += '</tr>';

  // 지지 십신 행
  html += '<tr><td style="color:var(--text-dim);font-size:11px">지지십신</td>';
  order.forEach(k => {
    const p = pillars[k];
    html += `<td style="color:var(--blue);font-size:11px">${p.sipshin_ji || ''}</td>`;
  });
  html += '</tr>';

  // 지장간 행
  html += '<tr><td style="color:var(--text-dim);font-size:11px">지장간</td>';
  order.forEach(k => {
    const p = pillars[k];
    const jzg = (p.jijangan || []).map(j => `${j.gan}<span style="color:var(--text-dim);font-size:9px">(${j.sipshin})</span>`).join('<br>');
    html += `<td style="font-size:10px;line-height:1.6">${jzg}</td>`;
  });
  html += '</tr>';

  // 12운성 행
  html += '<tr><td style="color:var(--text-dim);font-size:11px">12운성</td>';
  order.forEach(k => {
    const p = pillars[k];
    html += `<td style="font-size:10px;color:var(--text-dim)">${p.unseong || ''}</td>`;
  });
  html += '</tr>';

  // 납음 행
  html += '<tr><td style="color:var(--text-dim);font-size:11px">납음</td>';
  order.forEach(k => {
    const p = pillars[k];
    html += `<td style="font-size:10px;color:var(--text-dim)">${p.naeum || ''}</td>`;
  });
  html += '</tr>';

  html += '</table>';
  return html;
}

function renderOhengDist(oheng) {
  return Object.entries(oheng).map(([k, v]) =>
    `<span class="oheng-badge" style="background:${OHENG_BG[k]}">${k} ${v}</span>`
  ).join('');
}

function renderDaeunTable(daeun, birthYear) {
  const currentYear = new Date().getFullYear();
  let html = '<div style="color:var(--blue);font-weight:bold;margin-bottom:6px;font-size:13px">🔄 대운</div>';
  html += '<div class="daeun-table-wrapper"><table class="daeun-table"><tr>';
  html += '<td style="color:var(--text-dim);background:var(--bg2)">나이</td>';
  daeun.forEach(d => {
    const personYear = birthYear + d.age;
    const isCurrent = (personYear <= currentYear && currentYear < personYear + 10);
    html += `<td ${isCurrent ? 'class="daeun-current"' : ''}>${d.age}</td>`;
  });
  html += '</tr><tr>';
  html += '<td style="color:var(--text-dim);background:var(--bg2)">천간</td>';
  daeun.forEach(d => {
    const personYear = birthYear + d.age;
    const isCurrent = (personYear <= currentYear && currentYear < personYear + 10);
    const oheng = CHEONGAN_OHENG[d.gan];
    html += `<td ${isCurrent ? 'class="daeun-current"' : ''} style="color:${isCurrent ? '' : OHENG_BG[oheng] || ''}">${d.gan}</td>`;
  });
  html += '</tr><tr>';
  html += '<td style="color:var(--text-dim);background:var(--bg2)">지지</td>';
  daeun.forEach(d => {
    const personYear = birthYear + d.age;
    const isCurrent = (personYear <= currentYear && currentYear < personYear + 10);
    const oheng = JIJI_OHENG[d.ji];
    html += `<td ${isCurrent ? 'class="daeun-current"' : ''} style="color:${isCurrent ? '' : OHENG_BG[oheng] || ''}">${d.ji}</td>`;
  });
  html += '</tr></table></div>';
  return html;
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
  if (!allAnalysisData[idx]) return;
  document.querySelectorAll('#personResultTabs .tab').forEach((t, i) => t.classList.toggle('active', i === idx));
  const item = allAnalysisData[idx];

  // 저장된 문서가 있으면 표시 (내담자 목록에서 불러온 경우)
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
  document.getElementById('daeunTable').innerHTML = renderDaeunTable(item.saju.daeun, birthYear);

  if (!item.documents) {
    startStreaming(item.person, item.saju);
  }
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
