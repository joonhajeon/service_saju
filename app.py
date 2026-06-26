# app.py
from flask import Flask, render_template, request, jsonify, Response
from datetime import date, datetime
import json
import os
from config import CLIENT_DATA_DIR

GOONGHAP_DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "goonghap")
os.makedirs(GOONGHAP_DATA_DIR, exist_ok=True)
FOLDERS_FILE = os.path.join(os.path.dirname(__file__), "data", "folders.json")
GOONGHAP_FOLDERS_FILE = os.path.join(os.path.dirname(__file__), "data", "goonghap_folders.json")

def load_folders():
    if os.path.exists(FOLDERS_FILE):
        with open(FOLDERS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_folders(folders):
    os.makedirs(os.path.dirname(FOLDERS_FILE), exist_ok=True)
    with open(FOLDERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(folders, f, ensure_ascii=False, indent=2)

def load_goonghap_folders():
    if os.path.exists(GOONGHAP_FOLDERS_FILE):
        with open(GOONGHAP_FOLDERS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_goonghap_folders(folders):
    os.makedirs(os.path.dirname(GOONGHAP_FOLDERS_FILE), exist_ok=True)
    with open(GOONGHAP_FOLDERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(folders, f, ensure_ascii=False, indent=2)
from saju.core import calculate_saju
from saju.constants import OHENG_COLOR

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analysis')
def analysis():
    return render_template('analysis.html')

@app.route('/multi-analysis')
def multi_analysis():
    return render_template('multi-analysis.html')

@app.route('/clients')
def clients_page():
    return render_template('clients.html')

@app.route('/goonghap')
def goonghap():
    return render_template('goonghap.html')

@app.route('/goonghap-history')
def goonghap_history():
    return render_template('goonghap-history.html')

@app.route('/api/goonghap-history', methods=['GET'])
def get_goonghap_history():
    folder_filter = request.args.get('folder', None)  # None=전체, 'root'=미배정, 그 외=폴더id
    records = []
    for fname in os.listdir(GOONGHAP_DATA_DIR):
        if fname.endswith('.json'):
            fpath = os.path.join(GOONGHAP_DATA_DIR, fname)
            try:
                with open(fpath, encoding='utf-8') as f:
                    data = json.load(f)
                records.append({
                    'id': data.get('id', fname[:-5]),
                    'name1': data.get('name1', ''),
                    'name2': data.get('name2', ''),
                    'created_at': data.get('created_at', ''),
                    'folder': data.get('folder', None),
                })
            except Exception:
                pass
    if folder_filter == 'root':
        records = [r for r in records if not r.get('folder')]
    elif folder_filter:
        records = [r for r in records if r.get('folder') == folder_filter]
    records.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    return jsonify(records)

@app.route('/api/goonghap-history/<path:goonghap_id>', methods=['GET'])
def get_goonghap_record(goonghap_id):
    fpath = os.path.join(GOONGHAP_DATA_DIR, f'{goonghap_id}.json')
    if not os.path.exists(fpath):
        return jsonify({'error': 'not found'}), 404
    with open(fpath, encoding='utf-8') as f:
        return jsonify(json.load(f))

@app.route('/api/goonghap-history/<path:goonghap_id>', methods=['DELETE'])
def delete_goonghap_record(goonghap_id):
    fpath = os.path.join(GOONGHAP_DATA_DIR, f'{goonghap_id}.json')
    if not os.path.exists(fpath):
        return jsonify({'error': 'not found'}), 404
    os.remove(fpath)
    return jsonify({'success': True})

@app.route('/api/lunar-to-solar', methods=['POST'])
def lunar_to_solar():
    from korean_lunar_calendar import KoreanLunarCalendar
    data = request.json
    birth_date = data.get('birth_date', '').replace('.', '-').replace('/', '-')
    is_leap = bool(data.get('is_leap', False))
    try:
        parts = birth_date.split('-')
        if len(parts) != 3:
            return jsonify({'success': False, 'error': '날짜 형식 오류 (YYYY.MM.DD)'}), 400
        y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
        cal = KoreanLunarCalendar()
        cal.setLunarDate(y, m, d, is_leap)
        solar = cal.SolarIsoFormat()
        if not solar:
            return jsonify({'success': False, 'error': '변환 불가 (지원 범위: 1900~2050)'}), 400
        return jsonify({'success': True, 'solar_date': solar})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/calculate', methods=['POST'])
def api_calculate():
    data = request.json
    try:
        birth_date = date.fromisoformat(data['birth_date'])
        hour = data.get('hour')
        minute = data.get('minute')
        gender = data.get('gender', '남')
        result = calculate_saju(birth_date, hour, minute, gender)
        result['oheng_color'] = OHENG_COLOR
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/celebrity-search')
def celebrity_search():
    from saju.celebrity import search_celebrity
    query = request.args.get('query', request.args.get('name', ''))
    results = search_celebrity(query)
    return jsonify(results)

@app.route('/api/analyze-stream', methods=['POST'])
def analyze_stream():
    from ai.analyzer import stream_analysis
    data = request.json
    return Response(
        stream_analysis(data['saju_data'], data['career_type'], data.get('person_name', '')),
        mimetype='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'}
    )

@app.route('/api/clients', methods=['GET'])
def get_clients():
    folder_filter = request.args.get('folder', None)  # None=전체, 'root'=미배정, 그 외=폴더id
    clients = []
    for fname in os.listdir(CLIENT_DATA_DIR):
        if fname.endswith('.json'):
            with open(os.path.join(CLIENT_DATA_DIR, fname), encoding='utf-8') as f:
                try:
                    clients.append(json.load(f))
                except Exception:
                    pass
    if folder_filter == 'root':
        clients = [c for c in clients if not c.get('folder')]
    elif folder_filter:
        clients = [c for c in clients if c.get('folder') == folder_filter]
    clients.sort(key=lambda x: x.get('updated_at', ''), reverse=True)
    return jsonify(clients)

# ── 폴더 API ─────────────────────────────────────────────────
@app.route('/api/folders', methods=['GET'])
def get_folders():
    folders = load_folders()
    # 각 폴더의 내담자 수 계산
    counts = {}
    for fname in os.listdir(CLIENT_DATA_DIR):
        if fname.endswith('.json'):
            try:
                with open(os.path.join(CLIENT_DATA_DIR, fname), encoding='utf-8') as f:
                    c = json.load(f)
                fid = c.get('folder')
                if fid:
                    counts[fid] = counts.get(fid, 0) + 1
            except Exception:
                pass
    for folder in folders:
        folder['count'] = counts.get(folder['id'], 0)
    return jsonify(folders)

@app.route('/api/folders', methods=['POST'])
def create_folder():
    data = request.json or {}
    name = data.get('name', '').strip()
    parent = data.get('parent', None)  # None = 루트
    if not name:
        return jsonify({'success': False, 'error': '폴더 이름을 입력하세요'}), 400
    folders = load_folders()
    if any(f['name'] == name for f in folders):
        return jsonify({'success': False, 'error': '이미 같은 이름의 폴더가 있습니다'}), 400
    folder = {'id': name, 'name': name, 'created_at': datetime.now().isoformat(), 'parent': parent}
    folders.append(folder)
    save_folders(folders)
    return jsonify({'success': True, 'folder': folder})

@app.route('/api/folders/<path:folder_id>', methods=['DELETE'])
def delete_folder(folder_id):
    folders = load_folders()
    folders = [f for f in folders if f['id'] != folder_id]
    save_folders(folders)
    # 해당 폴더 내 내담자를 미배정으로
    for fname in os.listdir(CLIENT_DATA_DIR):
        if not fname.endswith('.json'):
            continue
        fpath = os.path.join(CLIENT_DATA_DIR, fname)
        try:
            with open(fpath, 'r', encoding='utf-8') as f:
                client = json.load(f)
            if client.get('folder') == folder_id:
                client['folder'] = None
                with open(fpath, 'w', encoding='utf-8') as f:
                    json.dump(client, f, ensure_ascii=False, indent=2)
        except Exception:
            pass
    return jsonify({'success': True})

@app.route('/api/folders/<path:folder_id>', methods=['PATCH'])
def update_folder(folder_id):
    data = request.json or {}
    new_name = data.get('name', '').strip()
    # 'parent' 키가 있으면 부모 변경 (None = 루트로 이동)
    UNCHANGED = object()
    new_parent = data.get('parent', UNCHANGED)

    if not new_name and new_parent is UNCHANGED:
        return jsonify({'success': False, 'error': '변경할 내용이 없습니다'}), 400

    folders = load_folders()
    if new_name and any(f['name'] == new_name and f['id'] != folder_id for f in folders):
        return jsonify({'success': False, 'error': '이미 같은 이름의 폴더가 있습니다'}), 400

    for f in folders:
        if f['id'] == folder_id:
            if new_name:
                f['name'] = new_name
            if new_parent is not UNCHANGED:
                f['parent'] = new_parent  # None이면 루트
            break
    else:
        return jsonify({'success': False, 'error': '폴더를 찾을 수 없습니다'}), 404
    save_folders(folders)
    return jsonify({'success': True})

@app.route('/api/clients/bulk-move', methods=['POST'])
def bulk_move_clients():
    data = request.json or {}
    ids = data.get('ids', [])
    folder = data.get('folder')  # None이면 미배정
    for client_id in ids:
        fpath = os.path.join(CLIENT_DATA_DIR, f'{client_id}.json')
        if os.path.exists(fpath):
            try:
                with open(fpath, 'r', encoding='utf-8') as f:
                    client = json.load(f)
                client['folder'] = folder
                with open(fpath, 'w', encoding='utf-8') as f:
                    json.dump(client, f, ensure_ascii=False, indent=2)
            except Exception:
                pass
    return jsonify({'success': True})

@app.route('/api/clients', methods=['POST'])
def save_client():
    data = request.json
    client_id = data.get('id') or f"{data['name']}{data['birth_date'].replace('-', '')}"
    fpath = os.path.join(CLIENT_DATA_DIR, f'{client_id}.json')

    # 기존 데이터가 있으면 읽기
    if os.path.exists(fpath):
        with open(fpath, 'r', encoding='utf-8') as f:
            existing = json.load(f)
        # 기존 생성일 유지
        data['created_at'] = existing.get('created_at', str(date.today()))
        # 기존 documents가 있고 새 documents가 없으면 유지
        if 'documents' not in data and 'documents' in existing:
            data['documents'] = existing['documents']
    else:
        # 새 파일 생성
        data['created_at'] = str(date.today())

    data['id'] = client_id
    data['updated_at'] = datetime.now().isoformat()

    with open(fpath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return jsonify({'success': True, 'id': client_id})

@app.route('/api/clients/<client_id>', methods=['GET'])
def get_client(client_id):
    fpath = os.path.join(CLIENT_DATA_DIR, f'{client_id}.json')
    if not os.path.exists(fpath):
        return jsonify({'error': 'not found'}), 404
    with open(fpath, encoding='utf-8') as f:
        return jsonify(json.load(f))

@app.route('/api/clients/<path:client_id>', methods=['PUT'])
def update_client(client_id):
    fpath = os.path.join(CLIENT_DATA_DIR, f'{client_id}.json')
    if not os.path.exists(fpath):
        return jsonify({'error': 'not found'}), 404
    with open(fpath, 'r', encoding='utf-8') as f:
        existing = json.load(f)
    data = request.json
    for key in ['name', 'birth_date', 'birth_time', 'gender', 'career_type', 'saju', 'folder', 'lunar_date']:
        if key in data:
            existing[key] = data[key]
    existing['updated_at'] = datetime.now().isoformat()
    with open(fpath, 'w', encoding='utf-8') as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)
    return jsonify({'success': True, 'id': client_id})

@app.route('/api/clients/<path:client_id>', methods=['DELETE'])
def delete_client(client_id):
    fpath = os.path.join(CLIENT_DATA_DIR, f'{client_id}.json')
    if not os.path.exists(fpath):
        return jsonify({'error': 'not found'}), 404
    os.remove(fpath)
    return jsonify({'success': True})

# ── 궁합 폴더 API ─────────────────────────────────────────────────
@app.route('/api/goonghap-folders', methods=['GET'])
def get_goonghap_folders():
    folders = load_goonghap_folders()
    counts = {}
    for fname in os.listdir(GOONGHAP_DATA_DIR):
        if fname.endswith('.json'):
            try:
                with open(os.path.join(GOONGHAP_DATA_DIR, fname), encoding='utf-8') as f:
                    r = json.load(f)
                fid = r.get('folder')
                if fid:
                    counts[fid] = counts.get(fid, 0) + 1
            except Exception:
                pass
    for folder in folders:
        folder['count'] = counts.get(folder['id'], 0)
    return jsonify(folders)

@app.route('/api/goonghap-folders', methods=['POST'])
def create_goonghap_folder():
    data = request.json or {}
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'success': False, 'error': '폴더 이름을 입력하세요'}), 400
    folders = load_goonghap_folders()
    if any(f['name'] == name for f in folders):
        return jsonify({'success': False, 'error': '이미 같은 이름의 폴더가 있습니다'}), 400
    folder = {'id': name, 'name': name, 'created_at': datetime.now().isoformat()}
    folders.append(folder)
    save_goonghap_folders(folders)
    return jsonify({'success': True, 'folder': folder})

@app.route('/api/goonghap-folders/<path:folder_id>', methods=['DELETE'])
def delete_goonghap_folder(folder_id):
    folders = load_goonghap_folders()
    folders = [f for f in folders if f['id'] != folder_id]
    save_goonghap_folders(folders)
    # 해당 폴더 내 궁합을 미배정으로
    for fname in os.listdir(GOONGHAP_DATA_DIR):
        if not fname.endswith('.json'):
            continue
        fpath = os.path.join(GOONGHAP_DATA_DIR, fname)
        try:
            with open(fpath, 'r', encoding='utf-8') as f:
                rec = json.load(f)
            if rec.get('folder') == folder_id:
                rec['folder'] = None
                with open(fpath, 'w', encoding='utf-8') as f:
                    json.dump(rec, f, ensure_ascii=False, indent=2)
        except Exception:
            pass
    return jsonify({'success': True})

@app.route('/api/goonghap-folders/<path:folder_id>', methods=['PATCH'])
def update_goonghap_folder(folder_id):
    data = request.json or {}
    new_name = data.get('name', '').strip()
    if not new_name:
        return jsonify({'success': False, 'error': '폴더 이름을 입력하세요'}), 400
    folders = load_goonghap_folders()
    if any(f['name'] == new_name and f['id'] != folder_id for f in folders):
        return jsonify({'success': False, 'error': '이미 같은 이름의 폴더가 있습니다'}), 400
    for f in folders:
        if f['id'] == folder_id:
            f['name'] = new_name
            break
    else:
        return jsonify({'success': False, 'error': '폴더를 찾을 수 없습니다'}), 404
    save_goonghap_folders(folders)
    return jsonify({'success': True})

@app.route('/api/goonghap-history/bulk-move', methods=['POST'])
def bulk_move_goonghap():
    data = request.json or {}
    ids = data.get('ids', [])
    folder = data.get('folder')  # None이면 미배정
    for gid in ids:
        fpath = os.path.join(GOONGHAP_DATA_DIR, f'{gid}.json')
        if os.path.exists(fpath):
            try:
                with open(fpath, 'r', encoding='utf-8') as f:
                    rec = json.load(f)
                rec['folder'] = folder
                with open(fpath, 'w', encoding='utf-8') as f:
                    json.dump(rec, f, ensure_ascii=False, indent=2)
            except Exception:
                pass
    return jsonify({'success': True})

@app.route('/api/goonghap-save', methods=['POST'])
def goonghap_save():
    data = request.json
    name1 = data.get('name1', '1번')
    name2 = data.get('name2', '2번')
    result = data.get('result', '')
    today = date.today().strftime('%Y%m%d')
    file_id = f"{name1}_{name2}_{today}"
    fpath = os.path.join(GOONGHAP_DATA_DIR, f"{file_id}.json")
    payload = {
        'id': file_id,
        'name1': name1,
        'name2': name2,
        'person1': data.get('person1', {}),
        'person2': data.get('person2', {}),
        'result': result,
        'created_at': datetime.now().isoformat(),
    }
    with open(fpath, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    return jsonify({'success': True, 'id': file_id, 'path': fpath})

@app.route('/api/goonghap-stream', methods=['POST'])
def goonghap_stream():
    from ai.analyzer import stream_goonghap
    data = request.json
    relation_type = data.get('relation_type', '연인')
    return Response(
        stream_goonghap(data['person1'], data['person2'], relation_type),
        mimetype='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'}
    )

@app.route('/api/monthly-pillars/<int:year>')
def monthly_pillars(year):
    """해당 연도의 12개월 천간지지 + 절입일 반환"""
    from saju.pillars import _find_jeorin_date, get_year_pillar_by_year
    from saju.constants import CHEONGAN, JIJI

    # 오호둔월법: 년간 기준 寅월 시작 천간
    MONTH_STEM_START = {
        '甲': 2, '己': 2,
        '乙': 4, '庚': 4,
        '丙': 6, '辛': 6,
        '丁': 8, '壬': 8,
        '戊': 0, '癸': 0,
    }
    MONTH_JIJI = ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑']
    JEORIN_NAMES = ['입춘','경칩','청명','입하','망종','소서','입추','백로','한로','입동','대설','소한']

    # 년간 계산 (음력 연도 기준이지만 년간 결정에는 양력 연도로 근사 가능)
    # 정확히는 음력 변환 필요하나 세운/대운 표시용으로는 양력 기준 충분
    year_gan, year_ji = get_year_pillar_by_year(year)
    stem_start = MONTH_STEM_START.get(year_gan, 0)

    months = []
    for i in range(12):
        gan = CHEONGAN[(stem_start + i) % 10]
        ji  = MONTH_JIJI[i]
        jeorin_date = _find_jeorin_date(year, i)
        # 다음 절입일 (마지막 달은 다음 해 입춘)
        next_jeorin = _find_jeorin_date(year if i < 11 else year + 1, (i + 1) % 12)
        months.append({
            'idx': i,
            'jeorin_name': JEORIN_NAMES[i],
            'jeorin_date': str(jeorin_date),
            'next_jeorin_date': str(next_jeorin),
            'gan': gan,
            'ji': ji,
        })

    return jsonify({
        'year': year,
        'year_gan': year_gan,
        'year_ji': year_ji,
        'months': months,
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
