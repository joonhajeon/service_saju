// static/js/stream.js

window.docContents = { 1: '', 2: '', 3: '' };

function startStreaming(person, sajuData) {
  [1, 2, 3].forEach(n => {
    window.docContents[n] = '';
    const el = document.getElementById(`doc${n}`);
    if (el) el.innerHTML = '<div class="streaming-indicator">AI 분석 생성 중...</div>';
  });

  fetch('/api/analyze-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      saju_data: sajuData,
      career_type: person.career_type || '타입없음',
      person_name: person.name || '',
    }),
  }).then(res => {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    function read() {
      reader.read().then(({ done, value }) => {
        if (done) return;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop(); // keep incomplete chunk
        parts.forEach(chunk => {
          if (!chunk.startsWith('data: ')) return;
          try {
            const msg = JSON.parse(chunk.slice(6));
            handleStreamMessage(msg);
          } catch (e) {}
        });
        read();
      }).catch(err => console.error('Stream read error:', err));
    }
    read();
  }).catch(err => {
    console.error('Stream fetch error:', err);
    document.getElementById('doc1').innerHTML = '<div style="color:var(--red)">AI 분석 오류: ' + err.message + '</div>';
  });
}

function handleStreamMessage(msg) {
  if (msg.type === 'doc_start') {
    window.docContents[msg.doc] = '';
    const el = document.getElementById(`doc${msg.doc}`);
    if (el) el.innerHTML = '';
  } else if (msg.type === 'text') {
    window.docContents[msg.doc] += msg.text.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    const el = document.getElementById(`doc${msg.doc}`);
    if (el) el.innerHTML = markdownToHtml(window.docContents[msg.doc]);
  } else if (msg.type === 'error') {
    const el = document.getElementById(`doc${msg.doc}`);
    if (el) el.innerHTML = `<div style="color:var(--red)">오류: ${msg.message}</div>`;
  } else if (msg.type === 'done') {
    console.log('분석 완료');
    // AI 분석 결과를 sessionStorage에 저장
    sessionStorage.setItem('docContents', JSON.stringify(window.docContents));
  }
}

function markdownToHtml(md) {
  // Tables
  const lines = md.split('\n');
  const result = [];
  let inTable = false;
  let tableRows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('|') && line.trim().startsWith('|')) {
      if (!inTable) { inTable = true; tableRows = []; }
      // Skip separator rows (---|---)
      if (line.match(/^\s*\|[\s\-|]+\|\s*$/)) continue;
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      tableRows.push(cells);
    } else {
      if (inTable) {
        result.push('<table>' + tableRows.map(r => '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>').join('') + '</table>');
        inTable = false; tableRows = [];
      }
      result.push(line);
    }
  }
  if (inTable) {
    result.push('<table>' + tableRows.map(r => '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>').join('') + '</table>');
  }

  return result.join('\n')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}
