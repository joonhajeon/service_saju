# 합·충·형·파 시각화 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사주표 우측 상단 토글 버튼으로 합·충·형·파 관계를 사주표 셀 테두리 강조 + 요약 배지로 표시한다.

**Architecture:** `display.js`에 관계 데이터 상수와 `computeRelations(pillars)` 함수를 추가하고, `renderSajuTable()`을 수정해 버튼과 관계 표시를 통합한다. 토글 상태는 모듈 레벨 변수로 관리한다.

**Tech Stack:** 순수 JavaScript (ES6), HTML/CSS (inline style 기반 기존 패턴 유지)

## Global Constraints

- 기존 `ganCell()`, `jiCell()` 함수 시그니처 변경 없이 확장
- 셀 테두리는 기존 오행 배경색을 덮지 않고 테두리로만 표시 (box-shadow 또는 outline 사용)
- 관계 범위: 사주 4기둥(시주/일주/월주/년주)만. 대운·세운 제외
- 해(害)는 포함하지 않음
- 기존 `renderSajuTable()` 반환값은 문자열(HTML)이므로 동일한 패턴 유지

---

### Task 1: 관계 데이터 상수 추가

**Files:**
- Modify: `static/js/display.js` — 상단 상수 영역(line 22 근처)에 추가

**Interfaces:**
- Produces:
  - `HAP_CHEONGAN`: `Array<{a, b, oheng}>` — 천간합 5종
  - `HAP_YUKHAM`: `Array<{a, b, oheng}>` — 지지 육합 6종
  - `HAP_SAMHAP`: `Array<{set: Set<지지>, kukname: string}>` — 지지 삼합 4종
  - `HAP_BANGHAP`: `Array<{set: Set<지지>, oheng}>` — 지지 방합 4종
  - `CHUNG_JIJI`: `Array<[지지, 지지]>` — 지지충 6종
  - HYUNG_JIJI: `Array<지지[]>` — 지지형 (삼형/이형/자형 포함)
  - `PA_JIJI`: `Array<[지지, 지지]>` — 지지파 6종

- [ ] **Step 1: display.js 상단 상수 영역(line 48 아래)에 다음 상수를 추가한다**

```javascript
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
```

- [ ] **Step 2: 브라우저 콘솔에서 오타 없이 로드되는지 확인**

앱을 로드한 뒤 콘솔에서 `HAP_CHEONGAN[0]` 입력 → `{a:'甲', b:'己', oheng:'토'}` 반환 확인.

- [ ] **Step 3: 커밋**

```bash
git add static/js/display.js
git commit -m "feat: 합충형파 관계 데이터 상수 추가"
```

---

### Task 2: computeRelations 함수 구현

**Files:**
- Modify: `static/js/display.js` — `renderSajuTable()` 함수 바로 위에 추가

**Interfaces:**
- Consumes: `HAP_CHEONGAN`, `HAP_YUKHAM`, `HAP_SAMHAP`, `HAP_BANGHAP`, `CHUNG_JIJI`, `HYUNG_JIJI`, `PA_JIJI`
- Produces:
  - `computeRelations(pillars)` → `{ ganHighlight: Map<천간글자위치, {type, label}>, jiHighlight: Map<지지글자위치, {type, label}>, badges: string[] }`
  - 위치 키: `'시'|'일'|'월'|'년'`
  - type: `'hap'|'chung'|'hyung'|'pa'`

**우선순위 (한 셀에 여러 관계 충돌 시):** chung > hyung > pa > hap

- [ ] **Step 1: computeRelations 함수를 작성한다**

```javascript
function computeRelations(pillars) {
  const ORDER = ['시주','일주','월주','년주'];
  const LABEL = ['시','일','월','년'];
  const ganHighlight = {}; // key: '시'|'일'|'월'|'년', value: {type, label}
  const jiHighlight  = {};
  const badges = [];
  const PRIORITY = {chung:4, hyung:3, pa:2, hap:1};

  function setGan(pos, type, label) {
    if (!ganHighlight[pos] || PRIORITY[type] > PRIORITY[ganHighlight[pos].type]) {
      ganHighlight[pos] = {type, label};
    }
  }
  function setJi(pos, type, label) {
    if (!jiHighlight[pos] || PRIORITY[type] > PRIORITY[jiHighlight[pos].type]) {
      jiHighlight[pos] = {type, label};
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
```

- [ ] **Step 2: 콘솔 테스트**

앱 로드 후 콘솔에서 아래 실행 (子午충 케이스):
```javascript
computeRelations({
  '시주':{gan:'甲',ji:'子'}, '일주':{gan:'己',ji:'午'},
  '월주':{gan:'丙',ji:'寅'}, '년주':{gan:'壬',ji:'戌'}
})
```
기대값: `badges`에 `"시간-일간 甲己합(토)"`, `"시지-일지 子午충"` 포함 확인.

- [ ] **Step 3: 커밋**

```bash
git add static/js/display.js
git commit -m "feat: computeRelations 함수 구현"
```

---

### Task 3: renderSajuTable 수정 — 버튼 + 셀 강조 + 배지

**Files:**
- Modify: `static/js/display.js` — `renderSajuTable()` 함수 전체 수정

**Interfaces:**
- Consumes: `computeRelations(pillars)` → `{ganHighlight, jiHighlight, badges}`
- 모듈 레벨 변수 `let relationModeOn = false;` 추가
- `toggleRelationMode()` 함수 추가

**색상:**
| type | outline 색 |
|------|-----------|
| hap  | #2e7d32 (초록) |
| chung| #c62828 (빨강) |
| hyung| #e65100 (주황) |
| pa   | #757575 (회색) |

- [ ] **Step 1: 모듈 레벨에 상태 변수와 토글 함수 추가 (display.js 상단 변수 영역)**

```javascript
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
```

- [ ] **Step 2: renderSajuTable 함수 수정**

`renderSajuTable(sajuData)` 함수 전체를 아래로 교체한다:

```javascript
function renderSajuTable(sajuData) {
  const { pillars } = sajuData;
  const order = ['시주', '일주', '월주', '년주'];
  const labels = ['시', '일', '월', '년'];
  const REL_COLOR = {hap:'#2e7d32', chung:'#c62828', hyung:'#e65100', pa:'#757575'};

  const rel = relationModeOn ? computeRelations(pillars) : null;

  function ganCellRel(gan, posLabel) {
    if (!rel || !rel.ganHighlight[posLabel]) return ganCell(gan);
    const {type} = rel.ganHighlight[posLabel];
    const color = REL_COLOR[type];
    const inner = ganCell(gan);
    return `<div style="outline:3px solid ${color};outline-offset:2px;border-radius:4px;display:inline-block">${inner}</div>`;
  }
  function jiCellRel(ji, posLabel) {
    if (!rel || !rel.jiHighlight[posLabel]) return jiCell(ji);
    const {type} = rel.jiHighlight[posLabel];
    const color = REL_COLOR[type];
    const inner = jiCell(ji);
    return `<div style="outline:3px solid ${color};outline-offset:2px;border-radius:4px;display:inline-block">${inner}</div>`;
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
    // 배지 타입 추론: label에 포함된 키워드로 판별
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
```

- [ ] **Step 3: 앱 실행 후 버튼 클릭 → 셀 테두리와 배지 정상 표시 확인**

- 관계가 있는 사주 입력 (예: 甲일간 + 己월간 → 천간합 확인)
- 버튼 클릭 → 해당 셀 초록 테두리 + 배지 표시
- 버튼 재클릭 → 원래 상태 복원

- [ ] **Step 4: multi-display.js도 동일한 renderSajuTable 사용 중이므로 동작 확인**

`templates/multi-analysis.html` 로드 후 관계 모드 버튼 정상 작동 확인.

- [ ] **Step 5: 커밋**

```bash
git add static/js/display.js
git commit -m "feat: 합·충·형·파 토글 버튼 및 사주표 시각화 구현"
```
