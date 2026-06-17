// static/js/display.js

function toggleCollapse(btn, wrapperId) {
  const wrapper = document.getElementById(wrapperId);
  if (!wrapper) return;
  const isCollapsed = wrapper.style.display === 'none';
  wrapper.style.display = isCollapsed ? '' : 'none';
  btn.textContent = isCollapsed ? '접기' : '펼치기';

  // 세운 접기 시 월별 천간지지 영역도 함께 처리
  if (wrapperId.endsWith('_wrap')) {
    const monthlyId = wrapperId.replace(/_wrap$/, '_monthly');
    const monthly = document.getElementById(monthlyId);
    if (monthly) monthly.style.display = isCollapsed ? '' : 'none';
  }
}

let currentPersonIdx = 0;
let allAnalysisData = [];
let selectedDaeunAge = null;
let relationModeOn = false;

function toggleRelationMode() {
  relationModeOn = !relationModeOn;
  const btn = document.getElementById('relationModeBtn');
  if (btn) btn.style.background = relationModeOn ? '#e8f5e9' : '';
  // 현재 표시 중인 사람의 사주 재렌더링
  if (allAnalysisData[currentPersonIdx]) {
    const item = allAnalysisData[currentPersonIdx];
    document.getElementById('sajuTable').innerHTML = renderSajuTable(item.saju);
  }
}

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
  '長生':'장생','沐浴':'목욕','冠帶':'관대','臨官':'건록',
  '帝旺':'제왕','衰':'쇠','病':'병','死':'사',
  '墓':'묘','絶':'절','胎':'태','養':'양'
};

// 壬·癸(임수·계수), 子·亥(자수·해수)는 검정 배경
const CHEONGAN_BG_OVERRIDE = { '壬': '#1a1a1a', '癸': '#1a1a1a' };
const JIJI_BG_OVERRIDE    = { '子': '#1a1a1a', '亥': '#1a1a1a' };

// 합충형파 데이터
const HAP_CHEONGAN = [
  {a:'甲',b:'己',oheng:'토'},{a:'乙',b:'庚',oheng:'금'},
  {a:'丙',b:'辛',oheng:'수'},{a:'丁',b:'壬',oheng:'목'},
  {a:'戊',b:'癸',oheng:'화'}
];
const HAP_YUKHAM = [
  {a:'子',b:'丑',oheng:'토'},{a:'寅',b:'亥',oheng:'목'},
  {a:'卯',b:'戌',oheng:'화'},{a:'辰',b:'酉',oheng:'금'},
  {a:'巳',b:'申',oheng:'수'},{a:'午',b:'未',oheng:'토'}
];
const HAP_SAMHAP = [
  {members:['寅','午','戌'],kukname:'화국'},
  {members:['申','子','辰'],kukname:'수국'},
  {members:['亥','卯','未'],kukname:'목국'},
  {members:['巳','酉','丑'],kukname:'금국'}
];
const HAP_BANGHAP = [
  {members:['寅','卯','辰'],oheng:'목'},
  {members:['巳','午','未'],oheng:'화'},
  {members:['申','酉','戌'],oheng:'금'},
  {members:['亥','子','丑'],oheng:'수'}
];
const CHUNG_JIJI = [
  ['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']
];
const HYUNG_JIJI = [
  ['寅','巳','申'], // 삼형
  ['丑','戌','未'], // 삼형
  ['子','卯'],      // 이형
  ['辰'],['午'],['酉'],['亥'] // 자형
];
const PA_JIJI = [
  ['子','酉'],['丑','辰'],['寅','亥'],['卯','午'],['巳','申'],['未','戌']
];

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

function computeRelations(pillars) {
  const ORDER = ['시주','일주','월주','년주'];
  const LABEL = ['시','일','월','년'];
  const ganHighlight = {}; // key: '시'|'일'|'월'|'년', value: {type, label}
  const jiHighlight  = {};
  const badges = [];
  const PRIORITY = {chung:4, hyung:3, pa:2, hap:1};

  function setGan(pos, type, label) {
    if (!ganHighlight[pos]) {
      ganHighlight[pos] = [{type, label}];
    } else {
      const arr = ganHighlight[pos];
      // don't duplicate same type
      if (arr.some(r => r.type === type)) return;
      arr.push({type, label});
      // sort by priority descending, keep top 2
      arr.sort((a, b) => PRIORITY[b.type] - PRIORITY[a.type]);
      if (arr.length > 2) arr.length = 2;
    }
  }
  function setJi(pos, type, label) {
    if (!jiHighlight[pos]) {
      jiHighlight[pos] = [{type, label}];
    } else {
      const arr = jiHighlight[pos];
      if (arr.some(r => r.type === type)) return;
      arr.push({type, label});
      arr.sort((a, b) => PRIORITY[b.type] - PRIORITY[a.type]);
      if (arr.length > 2) arr.length = 2;
    }
  }

  const gans = ORDER.map((k,i) => ({pos: LABEL[i], val: pillars[k]?.gan}));
  const jis  = ORDER.map((k,i) => ({pos: LABEL[i], val: pillars[k]?.ji}));

  // 천간합
  HAP_CHEONGAN.forEach(({a, b, oheng}) => {
    const pa = gans.find(g => g.val === a);
    const pb = gans.find(g => g.val === b);
    if (pa && pb) {
      const label = `${pa.pos}간-${pb.pos}간 ${a}${b}합(${oheng})`;
      setGan(pa.pos, 'hap', label);
      setGan(pb.pos, 'hap', label);
      badges.push(label);
    }
  });

  // 지지 육합
  HAP_YUKHAM.forEach(({a, b, oheng}) => {
    const pa = jis.find(j => j.val === a);
    const pb = jis.find(j => j.val === b);
    if (pa && pb) {
      const label = `${pa.pos}지-${pb.pos}지 ${a}${b}육합(${oheng})`;
      setJi(pa.pos, 'hap', label);
      setJi(pb.pos, 'hap', label);
      badges.push(label);
    }
  });

  // 지지 삼합 (2개 이상 있으면 반합으로 표시)
  HAP_SAMHAP.forEach(({members, kukname}) => {
    const found = jis.filter(j => members.includes(j.val));
    if (found.length >= 2) {
      const chars = found.map(f => f.val).join('');
      const suffix = found.length === 3 ? '삼합' : '반합';
      const label = `${found.map(f=>f.pos+'지').join('-')} ${chars}${suffix}(${kukname})`;
      found.forEach(f => setJi(f.pos, 'hap', label));
      badges.push(label);
    }
  });

  // 지지 방합 (2개 이상)
  HAP_BANGHAP.forEach(({members, oheng}) => {
    const found = jis.filter(j => members.includes(j.val));
    if (found.length >= 2) {
      const chars = found.map(f => f.val).join('');
      const label = `${found.map(f=>f.pos+'지').join('-')} ${chars}방합(${oheng})`;
      found.forEach(f => setJi(f.pos, 'hap', label));
      badges.push(label);
    }
  });

  // 지지충
  CHUNG_JIJI.forEach(([a, b]) => {
    const pa = jis.find(j => j.val === a);
    const pb = jis.find(j => j.val === b);
    if (pa && pb) {
      const label = `${pa.pos}지-${pb.pos}지 ${a}${b}충`;
      setJi(pa.pos, 'chung', label);
      setJi(pb.pos, 'chung', label);
      badges.push(label);
    }
  });

  // 지지형
  HYUNG_JIJI.forEach(group => {
    if (group.length === 1) {
      // 자형: 같은 지지 2개 이상
      const found = jis.filter(j => j.val === group[0]);
      if (found.length >= 2) {
        const label = `${found.map(f=>f.pos+'지').join('-')} ${group[0]}${group[0]}자형`;
        found.forEach(f => setJi(f.pos, 'hyung', label));
        badges.push(label);
      }
    } else {
      const found = jis.filter(j => group.includes(j.val));
      if (found.length >= 2) {
        const chars = found.map(f => f.val).join('');
        const suffix = group.length === 3 ? '삼형' : '형';
        const label = `${found.map(f=>f.pos+'지').join('-')} ${chars}${suffix}`;
        found.forEach(f => setJi(f.pos, 'hyung', label));
        badges.push(label);
      }
    }
  });

  // 지지파
  PA_JIJI.forEach(([a, b]) => {
    const pa = jis.find(j => j.val === a);
    const pb = jis.find(j => j.val === b);
    if (pa && pb) {
      const label = `${pa.pos}지-${pb.pos}지 ${a}${b}파`;
      setJi(pa.pos, 'pa', label);
      setJi(pb.pos, 'pa', label);
      badges.push(label);
    }
  });

  return {ganHighlight, jiHighlight, badges};
}

function renderSajuTable(sajuData) {
  const { pillars } = sajuData;
  const order = ['시주', '일주', '월주', '년주'];
  const labels = ['시', '일', '월', '년'];
  const REL_COLOR = {hap:'#2e7d32', chung:'#c62828', hyung:'#e65100', pa:'#757575'};

  const rel = relationModeOn ? computeRelations(pillars) : null;

  function ganCellRel(gan, posLabel) {
    if (!rel || !rel.ganHighlight[posLabel]) return ganCell(gan);
    const [primary, secondary] = rel.ganHighlight[posLabel];
    const inner = ganCell(gan);
    const outline = `outline:3px solid ${REL_COLOR[primary.type]};outline-offset:2px;`;
    const shadow = secondary ? `box-shadow:0 0 0 6px ${REL_COLOR[secondary.type]};` : '';
    return `<div style="${outline}${shadow}border-radius:4px;display:inline-block">${inner}</div>`;
  }
  function jiCellRel(ji, posLabel) {
    if (!rel || !rel.jiHighlight[posLabel]) return jiCell(ji);
    const [primary, secondary] = rel.jiHighlight[posLabel];
    const inner = jiCell(ji);
    const outline = `outline:3px solid ${REL_COLOR[primary.type]};outline-offset:2px;`;
    const shadow = secondary ? `box-shadow:0 0 0 6px ${REL_COLOR[secondary.type]};` : '';
    return `<div style="${outline}${shadow}border-radius:4px;display:inline-block">${inner}</div>`;
  }

  // 버튼 포함 헤더
  let html = `<div style="display:flex;justify-content:flex-end;margin-bottom:4px">
    <button id="relationModeBtn" onclick="toggleRelationMode()"
      style="font-size:12px;padding:3px 10px;border:1px solid #ccc;border-radius:4px;cursor:pointer;background:${relationModeOn?'#e8f5e9':''}">
      합·충·형·파
    </button>
  </div>`;

  html += `<table class="saju-table">`;

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
  order.forEach((k, i) => {
    const p = pillars[k];
    html += `<td>${ganCellRel(p.gan, labels[i])}</td>`;
  });
  html += '</tr>';

  // 지지 행
  html += '<tr><td style="color:#333;font-size:11px;font-weight:bold">지지</td>';
  order.forEach((k, i) => {
    const p = pillars[k];
    html += `<td>${jiCellRel(p.ji, labels[i])}</td>`;
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

  // 관계 요약 배지
  if (rel && rel.badges.length > 0) {
    const BADGE_BG = {hap:'#e8f5e9', chung:'#ffebee', hyung:'#fff3e0', pa:'#f5f5f5'};
    const BADGE_COLOR = {hap:'#2e7d32', chung:'#c62828', hyung:'#e65100', pa:'#757575'};
    function badgeType(label) {
      if (label.includes('충')) return 'chung';
      if (label.includes('형')) return 'hyung';
      if (label.includes('파')) return 'pa';
      return 'hap';
    }
    html += `<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px">`;
    rel.badges.forEach(b => {
      const t = badgeType(b);
      html += `<span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${BADGE_BG[t]};color:${BADGE_COLOR[t]};border:1px solid ${BADGE_COLOR[t]}">${b}</span>`;
    });
    html += `</div>`;
  }

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

function renderDaeunTable(sajuData, birthYear, daeunTableId, seunContainerId) {
  const { daeun: daeunRaw, daeun_start, daeun_direction, ilgan } = sajuData;
  const daeun = (daeunRaw || []).filter(d => d.age <= 100);
  const currentYear = new Date().getFullYear();
  const tableId = daeunTableId || 'daeunTableEl';
  const seunId  = seunContainerId || 'seunSection';

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
  const daeunWrapperId = `${tableId}_wrap`;
  let html = `<div class="daeun-section">`;
  html += `<div class="daeun-label" style="display:flex;align-items:center;justify-content:space-between">${label}<button class="btn-collapse" onclick="toggleCollapse(this,'${daeunWrapperId}')">접기</button></div>`;
  html += `<div id="${daeunWrapperId}" class="daeun-table-wrapper"><table class="daeun-table" id="${tableId}">`;

  // Helper function to add daeun-selected class for current year's daeun
  const daeunClass = (age) => (age === currentDaeunAge) ? ' daeun-selected' : '';

  const onclick = (d) => `selectDaeun(${d.age}, '${d.gan}', '${d.ji}', ${birthYear}, '${tableId}', '${seunId}', '${ilgan||''}')`;

  // 나이 행
  html += '<tr><td>나이</td>';
  daeun.forEach(d => {
    html += `<td data-age="${d.age}" class="${daeunClass(d.age)}" onclick="${onclick(d)}">${d.age}</td>`;
  });
  html += '</tr>';

  // 십신(天) 행
  html += '<tr><td>십신(天)</td>';
  daeun.forEach(d => {
    const ss = d.sipshin_gan || getSipshin(ilgan, d.gan);
    html += `<td data-age="${d.age}" class="${daeunClass(d.age)}" style="font-size:10px;color:#333;font-weight:bold" onclick="${onclick(d)}">${ss}</td>`;
  });
  html += '</tr>';

  // 천간 행
  html += '<tr><td>천간</td>';
  daeun.forEach(d => {
    html += `<td data-age="${d.age}" class="${daeunClass(d.age)}" style="${ganTdStyle(d.gan, false)}" onclick="${onclick(d)}">${d.gan}</td>`;
  });
  html += '</tr>';

  // 지지 행
  html += '<tr><td>지지</td>';
  daeun.forEach(d => {
    html += `<td data-age="${d.age}" class="${daeunClass(d.age)}" style="${jiTdStyle(d.ji, false)}" onclick="${onclick(d)}">${d.ji}</td>`;
  });
  html += '</tr>';

  // 십신(地) 행
  html += '<tr><td>십신(地)</td>';
  daeun.forEach(d => {
    const ss = d.sipshin_ji || getSipshinJiji(ilgan, d.ji);
    html += `<td data-age="${d.age}" class="${daeunClass(d.age)}" style="font-size:10px;color:#333;font-weight:bold" onclick="${onclick(d)}">${ss}</td>`;
  });
  html += '</tr>';

  html += '</table></div></div>';
  return html;
}

function selectDaeun(startAge, daeunGan, daeunJi, birthYear, daeunTableId, seunContainerId, ilgan) {
  const tableId = daeunTableId || 'daeunTableEl';
  const seunId  = seunContainerId || 'seunSection';
  selectedDaeunAge = startAge;

  // 이전 선택 해제
  document.querySelectorAll(`#${tableId} td[data-age]`).forEach(td => {
    td.classList.remove('daeun-selected');
  });

  // 선택한 열 전체 하이라이트
  document.querySelectorAll(`#${tableId} td[data-age="${startAge}"]`).forEach(td => {
    td.classList.add('daeun-selected');
  });

  // ilgan: 파라미터로 넘어오면 사용, 아니면 현재 분석 데이터에서 가져옴
  const resolvedIlgan = ilgan || (allAnalysisData[currentPersonIdx] && allAnalysisData[currentPersonIdx].saju.ilgan);
  renderSeunTable(startAge, birthYear, resolvedIlgan, seunId);
}

function renderSeunTable(daeunStartAge, birthYear, ilgan, seunContainerId) {
  const currentYear = new Date().getFullYear();
  const seunContainer = document.getElementById(seunContainerId || 'seunSection');
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

  const baseId = seunContainerId || 'seunSection';
  const seunWrapperId = `${baseId}_wrap`;
  const monthlyContainerId = `${baseId}_monthly`;

  let html = `<div class="seun-section">`;
  html += `<div class="seun-label" style="display:flex;align-items:center;justify-content:space-between">📅 세운 (${daeunStartAge}세 대운)<button class="btn-collapse" onclick="toggleCollapse(this,'${seunWrapperId}')">접기</button></div>`;
  html += `<div id="${seunWrapperId}" class="seun-table-wrapper"><table class="seun-table">`;

  // 나이 행
  html += '<tr><td>나이</td>';
  seunList.forEach(s => {
    html += `<td style="font-size:11px">${s.age}</td>`;
  });
  html += '</tr>';

  // 년도 행 — 클릭 시 월별 펼침
  html += '<tr><td>년도</td>';
  seunList.forEach(s => {
    const isCur = s.year === currentYear;
    const style = `font-size:10px;cursor:pointer;color:${isCur?'var(--accent)':'#333'};font-weight:${isCur?'bold':'normal'};text-decoration:underline dotted #aaa;`;
    html += `<td id="seun-year-td-${baseId}-${s.year}" style="${style}" onclick="toggleMonthlyPillars(${s.year},'${monthlyContainerId}','${baseId}',this)">${s.year}년</td>`;
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

  html += '</table></div>';
  // 월별 펼침 영역
  html += `<div id="${monthlyContainerId}" style="margin-top:6px"></div>`;
  html += '</div>';
  seunContainer.innerHTML = html;
}

// ── 월별 천간지지 펼침/접기 ──────────────────────────────────
let _monthlyCache = {};   // year → data
let _monthlyOpen = {};    // baseId → year (현재 열려있는 연도)

async function toggleMonthlyPillars(year, containerId, baseId, tdEl) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // 이미 같은 연도가 열려있으면 닫기
  if (_monthlyOpen[baseId] === year) {
    container.innerHTML = '';
    _monthlyOpen[baseId] = null;
    // 강조 해제
    document.querySelectorAll(`[id^="seun-year-td-${baseId}-"]`).forEach(el => el.style.background = '');
    return;
  }

  // 다른 연도 열기 — 기존 강조 해제
  document.querySelectorAll(`[id^="seun-year-td-${baseId}-"]`).forEach(el => el.style.background = '');
  tdEl.style.background = '#fff3e0';
  _monthlyOpen[baseId] = year;

  container.innerHTML = '<div style="color:#aaa;font-size:12px;padding:6px">월별 데이터 로딩 중...</div>';

  try {
    if (!_monthlyCache[year]) {
      const res = await fetch(`/api/monthly-pillars/${year}`);
      _monthlyCache[year] = await res.json();
    }
    const data = _monthlyCache[year];
    container.innerHTML = renderMonthlyTable(data, year, containerId, baseId);
  } catch(e) {
    container.innerHTML = `<div style="color:#c62828;font-size:12px">오류: ${e.message}</div>`;
  }
}

function closeMonthlyPillars(containerId, baseId, year) {
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = '';
  _monthlyOpen[baseId] = null;
  const td = document.getElementById(`seun-year-td-${baseId}-${year}`);
  if (td) td.style.background = '';
}

function renderMonthlyTable(data, year, containerId, baseId) {
  const months = data.months;

  let html = `<div style="background:#fafafa;border:1px solid #e0e0e0;border-radius:8px;padding:10px;margin-top:4px">`;
  html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">`;
  html += `<span style="font-size:12px;font-weight:bold;color:var(--accent)">📆 ${year}년 월별 천간지지</span>`;
  html += `<button onclick="closeMonthlyPillars('${containerId}','${baseId}',${year})" style="background:none;border:none;cursor:pointer;font-size:16px;color:#aaa;line-height:1;padding:0 4px" title="닫기">✕</button>`;
  html += `</div>`;
  html += `<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:11px;width:100%">`;

  // 헤더 행: 월 이름 (寅월~丑월)
  html += '<tr style="background:#f0f0f0">';
  html += '<td style="padding:4px 6px;border:1px solid #ddd;font-weight:bold;white-space:nowrap">구분</td>';
  months.forEach(m => {
    html += `<td style="padding:4px 6px;border:1px solid #ddd;text-align:center;font-weight:bold">${m.ji}월</td>`;
  });
  html += '</tr>';

  // 절입일 행
  html += '<tr>';
  html += '<td style="padding:4px 6px;border:1px solid #ddd;color:#888;white-space:nowrap">절입일</td>';
  months.forEach(m => {
    const d = m.jeorin_date.slice(5); // MM-DD
    html += `<td style="padding:3px 4px;border:1px solid #ddd;text-align:center;font-size:10px;color:#666">${d}<br><span style="color:#aaa">${m.jeorin_name}</span></td>`;
  });
  html += '</tr>';

  // 천간 행
  html += '<tr>';
  html += '<td style="padding:4px 6px;border:1px solid #ddd;color:#888;white-space:nowrap">천간</td>';
  months.forEach(m => {
    html += `<td style="padding:4px 6px;border:1px solid #ddd;text-align:center;${ganTdStyle(m.gan,false)}">${m.gan}</td>`;
  });
  html += '</tr>';

  // 지지 행
  html += '<tr>';
  html += '<td style="padding:4px 6px;border:1px solid #ddd;color:#888;white-space:nowrap">지지</td>';
  months.forEach(m => {
    html += `<td style="padding:4px 6px;border:1px solid #ddd;text-align:center;${jiTdStyle(m.ji,false)}">${m.ji}</td>`;
  });
  html += '</tr>';

  html += '</table></div></div>';
  return html;
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
    // 나이 계산 (세는 나이) - 시간 옆에 표시
    let ageStr = '';
    if (p.birth_date) {
      const bYear = parseInt(p.birth_date.slice(0, 4), 10);
      const age = new Date().getFullYear() - bYear + 1;
      ageStr = ` <span style="color:var(--accent);font-weight:bold">${age}세</span>`;
    }
    // 음력 날짜 표시 — 양력과 음력 모두 표시
    let dateDisplay = '';
    if (p.lunar_date) {
      const ld = String(p.lunar_date).replace(/-/g, '.');
      // 양력(변환) + 음력(원본) 둘 다 표시
      dateDisplay = `<span class="person-info-date">${dateStr}</span>`
        + `<span style="font-size:11px;color:#666;margin-left:5px">양력</span>`
        + `<span style="margin:0 6px;color:#ccc">|</span>`
        + `<span style="font-size:13px;font-weight:bold;color:var(--accent)">${ld}</span>`
        + `<span style="font-size:11px;color:#666;margin-left:5px">음력</span>`;
    } else {
      dateDisplay = `<span class="person-info-date">${dateStr}</span>`;
    }
    infoEl.innerHTML = `
      <div class="person-info-bar" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">
        <div>
          ${dateDisplay}
          <span class="person-info-time" style="margin-left:6px">${timeStr}</span>${ageStr}
          <span class="person-info-misc">${genderStr}${careerStr}</span>
        </div>
        <button onclick="openEditForm(${idx})" style="font-size:12px;padding:3px 10px;background:var(--bg3);border:1px solid #ccc;border-radius:4px;cursor:pointer;white-space:nowrap">✏️ 수정</button>
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

// ── 분석 화면 인라인 편집 ──────────────────────────────────────

function openEditForm(idx) {
  const item = allAnalysisData[idx];
  if (!item) return;
  const p = item.person;

  const dateVal = (p.birth_date || '').replace(/-/g, '.');
  const timeVal = (p.hour != null && p.hour !== '') ? `${String(p.hour).padStart(2,'0')}:${String(p.minute||0).padStart(2,'0')}` : '';
  const careerOptions = ['직장인','사업가','프리랜서','연예인','운동선수','정치인','공인·전문직','학생','주부','타입없음']
    .map(v => `<option value="${v}"${p.career_type===v?' selected':''}>${v}</option>`).join('');

  const infoEl = document.getElementById('personInfo');
  infoEl.innerHTML = `
    <div class="edit-inline">
      <div style="font-weight:bold;color:var(--accent);margin-bottom:10px;font-size:13px">✏️ 정보 수정</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div>
          <label style="font-size:11px;color:#666">이름</label>
          <input id="ei-name" class="form-input" value="${p.name||''}" style="margin-top:2px">
        </div>
        <div>
          <label style="font-size:11px;color:#666">생년월일</label>
          <div style="display:flex;gap:4px;margin-top:2px;margin-bottom:4px">
            <button type="button" id="ei-cal-solar" class="cal-btn active" onclick="toggleEditCal('solar')">양력</button>
            <button type="button" id="ei-cal-lunar" class="cal-btn" onclick="toggleEditCal('lunar')">음력</button>
            <label id="ei-leap-row" class="lunar-leap-row" style="display:none;font-size:11px">
              <input type="checkbox" id="ei-leap"> 윤달
            </label>
          </div>
          <input id="ei-date" class="form-input" value="${dateVal}" placeholder="YYYY.MM.DD">
        </div>
        <div>
          <label style="font-size:11px;color:#666">시간</label>
          <input id="ei-time" class="form-input" value="${timeVal}" placeholder="HH:MM" style="margin-top:2px">
        </div>
        <div>
          <label style="font-size:11px;color:#666">성별</label>
          <select id="ei-gender" class="form-input" style="margin-top:2px">
            <option value="여"${p.gender==='여'?' selected':''}>여</option>
            <option value="남"${p.gender==='남'?' selected':''}>남</option>
          </select>
        </div>
        <div style="grid-column:1/-1">
          <label style="font-size:11px;color:#666">커리어 타입</label>
          <select id="ei-career" class="form-input" style="margin-top:2px">${careerOptions}</select>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button onclick="saveEditForm(${idx})" style="flex:1;padding:7px;background:var(--accent);color:white;border:none;border-radius:5px;cursor:pointer;font-weight:bold;font-size:13px">저장 후 재계산</button>
        <button onclick="showPerson(${idx})" style="padding:7px 14px;background:var(--bg3);border:1px solid #ccc;border-radius:5px;cursor:pointer;font-size:13px">취소</button>
      </div>
    </div>`;
}

function toggleEditCal(type) {
  document.getElementById('ei-cal-solar').classList.toggle('active', type === 'solar');
  document.getElementById('ei-cal-lunar').classList.toggle('active', type === 'lunar');
  document.getElementById('ei-leap-row').style.display = type === 'lunar' ? 'flex' : 'none';
  if (type === 'solar') document.getElementById('ei-leap').checked = false;
}

async function saveEditForm(idx) {
  const nameVal    = document.getElementById('ei-name').value.trim();
  let   dateVal    = document.getElementById('ei-date').value.trim().replace(/\./g, '-');
  const timeVal    = document.getElementById('ei-time').value.trim();
  const genderVal  = document.getElementById('ei-gender').value;
  const careerVal  = document.getElementById('ei-career').value;
  const isLunar    = document.getElementById('ei-cal-lunar').classList.contains('active');
  const isLeap     = document.getElementById('ei-leap').checked;

  if (!dateVal) { alert('생년월일을 입력해주세요.'); return; }

  // 음력 변환
  if (isLunar) {
    try {
      const r = await fetch('/api/lunar-to-solar', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ birth_date: dateVal, is_leap: isLeap }),
      });
      const d = await r.json();
      if (!d.success) { alert('음력 변환 오류: ' + d.error); return; }
      dateVal = d.solar_date;
    } catch(e) { alert('음력 변환 실패'); return; }
  }

  let hour = null, minute = null;
  if (timeVal && timeVal.includes(':')) { [hour, minute] = timeVal.split(':').map(Number); }

  // 사주 재계산
  let saju;
  try {
    const r = await fetch('/api/calculate', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ birth_date: dateVal, hour, minute, gender: genderVal }),
    });
    const d = await r.json();
    if (!d.success) { alert('계산 오류: ' + d.error); return; }
    saju = d.data;
  } catch(e) { alert('계산 실패'); return; }

  // 메모리 업데이트
  const item = allAnalysisData[idx];
  item.person = { ...item.person, name: nameVal, birth_date: dateVal, hour, minute, gender: genderVal, career_type: careerVal };
  item.saju = saju;
  sessionStorage.setItem('analysisData', JSON.stringify(allAnalysisData));

  // DB 저장 (자동)
  const birthTime = hour != null ? `${String(hour).padStart(2,'0')}:${String(minute||0).padStart(2,'0')}` : null;
  const clientId = item._clientId;
  if (clientId) {
    // 기존 저장된 내담자 → PUT 업데이트
    await fetch(`/api/clients/${encodeURIComponent(clientId)}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name:nameVal, birth_date:dateVal, birth_time:birthTime, gender:genderVal, career_type:careerVal, saju }),
    });
  } else {
    // 새로 저장
    const r = await fetch('/api/clients', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name:nameVal, birth_date:dateVal, birth_time:birthTime, gender:genderVal, career_type:careerVal, saju }),
    });
    const d = await r.json();
    if (d.id) item._clientId = d.id;
  }

  // 탭 이름 업데이트
  const tabs = document.querySelectorAll('#personResultTabs .tab');
  if (tabs[idx]) tabs[idx].textContent = nameVal;

  // 화면 재렌더
  showPerson(idx);

  // 저장 토스트
  const toast = document.getElementById('saveToast');
  if (toast) { toast.classList.remove('hidden'); setTimeout(() => toast.classList.add('hidden'), 2500); }
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
