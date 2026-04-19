// static/js/clients.js
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('clientsList');
  if (!container) return;

  try {
    const res = await fetch('/api/clients');
    const clients = await res.json();

    if (clients.length === 0) {
      container.innerHTML = '<p style="color:var(--text-dim)">저장된 내담자가 없습니다.</p>';
      return;
    }

    container.innerHTML = clients.map(c => `
      <div class="client-card" onclick="loadClient('${c.id}')">
        <div class="client-name">${c.name}</div>
        <div class="client-info">${c.birth_date} · ${c.gender || ''} · ${c.career_type || ''}</div>
        <div class="client-date">분석일: ${c.updated_at || c.created_at || ''}</div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = '<p style="color:var(--red)">목록을 불러오는 중 오류가 발생했습니다.</p>';
  }
});

async function loadClient(id) {
  try {
    const res = await fetch(`/api/clients/${id}`);
    const client = await res.json();
    const analysisData = [{
      person: {
        name: client.name,
        birth_date: client.birth_date,
        career_type: client.career_type,
        gender: client.gender,
        hour: null,
        minute: null,
      },
      saju: client.saju,
      documents: client.documents,
    }];
    sessionStorage.setItem('analysisData', JSON.stringify(analysisData));
    window.location.href = '/analysis';
  } catch (e) {
    alert('불러오기 오류: ' + e.message);
  }
}
