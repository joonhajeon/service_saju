# app.py
from flask import Flask, render_template, request, jsonify, Response
from datetime import date
import json
import os
from config import CLIENT_DATA_DIR
from saju.core import calculate_saju
from saju.constants import OHENG_COLOR

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analysis')
def analysis():
    return render_template('analysis.html')

@app.route('/clients')
def clients_page():
    return render_template('clients.html')

@app.route('/goonghap')
def goonghap():
    return render_template('goonghap.html')

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
    clients = []
    for fname in os.listdir(CLIENT_DATA_DIR):
        if fname.endswith('.json'):
            with open(os.path.join(CLIENT_DATA_DIR, fname), encoding='utf-8') as f:
                try:
                    clients.append(json.load(f))
                except Exception:
                    pass
    clients.sort(key=lambda x: x.get('updated_at', ''), reverse=True)
    return jsonify(clients)

@app.route('/api/clients', methods=['POST'])
def save_client():
    data = request.json
    client_id = data.get('id') or f"{data['name']}{data['birth_date'].replace('-', '')}"
    data['id'] = client_id
    data['updated_at'] = str(date.today())
    if 'created_at' not in data:
        data['created_at'] = str(date.today())
    fpath = os.path.join(CLIENT_DATA_DIR, f'{client_id}.json')
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

@app.route('/api/goonghap-stream', methods=['POST'])
def goonghap_stream():
    from ai.analyzer import stream_goonghap
    data = request.json
    return Response(
        stream_goonghap(data['person1'], data['person2']),
        mimetype='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'}
    )

if __name__ == '__main__':
    app.run(debug=True, port=5000)
