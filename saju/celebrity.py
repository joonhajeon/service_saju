# saju/celebrity.py
import requests
import re
from config import NAVER_CLIENT_ID, NAVER_CLIENT_SECRET


def search_celebrity(name: str) -> list[dict]:
    """이름으로 유명인 생년월일 검색. 네이버 API 우선, 실패 시 위키피디아 폴백."""
    results = _search_naver(name)
    if not results:
        results = _search_wikipedia(name)
    return results


def _search_naver(name: str) -> list[dict]:
    """네이버 검색 API로 생년월일 검색"""
    if not NAVER_CLIENT_ID:
        return []
    try:
        headers = {
            'X-Naver-Client-Id': NAVER_CLIENT_ID,
            'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
        }
        res = requests.get(
            'https://openapi.naver.com/v1/search/news.json',
            params={'query': f'{name} 생년월일', 'display': 5},
            headers=headers,
            timeout=5,
        )
        items = res.json().get('items', [])
        results = []
        for item in items:
            text = item.get('description', '') + item.get('title', '')
            birth = _extract_birth_date(text)
            if birth:
                results.append({'name': name, 'birth_date': birth, 'source': 'naver'})
        return results[:3]
    except Exception:
        return []


def _search_wikipedia(name: str) -> list[dict]:
    """위키피디아 API로 생년월일 검색"""
    try:
        res = requests.get(
            'https://ko.wikipedia.org/w/api.php',
            params={
                'action': 'query', 'list': 'search',
                'srsearch': name, 'format': 'json', 'srlimit': 3,
            },
            timeout=5,
        )
        items = res.json().get('query', {}).get('search', [])
        results = []
        for item in items:
            page_res = requests.get(
                'https://ko.wikipedia.org/w/api.php',
                params={
                    'action': 'query', 'prop': 'extracts',
                    'titles': item['title'], 'format': 'json', 'exintro': True,
                },
                timeout=5,
            )
            pages = page_res.json().get('query', {}).get('pages', {})
            for page in pages.values():
                text = page.get('extract', '')
                birth = _extract_birth_date(text)
                if birth:
                    results.append({'name': item['title'], 'birth_date': birth, 'source': 'wikipedia'})
        return results[:3]
    except Exception:
        return []


def _extract_birth_date(text: str) -> str | None:
    """텍스트에서 생년월일 추출 (YYYY-MM-DD 형식으로 반환)"""
    patterns = [
        r'(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일',
        r'(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})',
    ]
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            y, mo, d = m.groups()
            if 1900 <= int(y) <= 2010:
                return f'{y}-{int(mo):02d}-{int(d):02d}'
    return None
