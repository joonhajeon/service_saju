"""웹 검색으로 유명인 생년월일 조회 — 나무위키 + 위키트리 + Google"""
import requests
import re
import sys
from datetime import datetime
from bs4 import BeautifulSoup

# 로그 파일 경로
LOG_FILE = 'celebrity_search.log'


def _extract_career_type(text: str) -> str:
    """나무위키 텍스트에서 직업 정보를 추출해서 career_type으로 분류"""
    # 직업 키워드 정의 (career_type으로 분류)
    career_keywords = {
        '연예인': [
            r'\b(?:가수|배우|아이돌|개그맨|유튜버|방송인|크리에이터|뮤지컬|성우|모델|댄서|음악가)\b',
            r'(?:영화배우|드라마배우|뮤지컬배우)',
            r'\b(?:방송제작자|PD|작가)\b',
        ],
        '운동선수': [
            r'\b(?:축구선수|야구선수|농구선수|배구선수|핸드볼선수|탁구선수|테니스선수|골프선수)\b',
            r'(?:피겨스케이터|피겨|올림픽)',
            r'\b(?:레슬러|보디빌더|격투기선수|복싱선수)\b',
        ],
        '정치인': [
            r'\b(?:정치인|국회의원|대통령|국무총리|장관|도지사|시장)\b',
        ],
        '사업가': [
            r'\b(?:사업가|CEO|기업인|회장|회사대표|창업자|기업가)\b',
        ],
        '공인·전문직': [
            r'\b(?:의사|변호사|교수|판사|검사|약사|엔지니어|건축가)\b',
            r'\b(?:과학자|연구원|학자|교사|강사)\b',
        ],
    }

    # 텍스트에서 직업 키워드 찾기
    for career_type, keywords in career_keywords.items():
        for keyword in keywords:
            if re.search(keyword, text, re.IGNORECASE):
                return career_type

    # 매칭되는 직업이 없으면 '타입없음' 반환
    return '타입없음'


def log_msg(msg):
    """터미널과 파일에 로그 기록"""
    print(msg)
    sys.stdout.flush()
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(msg + '\n')


def _clean_query_for_url(query: str) -> str:
    """
    나무위키 직접 URL에 맞게 쿼리에서 직업/직함 접두어를 제거.
    예: "배우 구교환" → "구교환", "가수 아이유" → "아이유"
    """
    prefixes = ['배우', '가수', '선수', '아이돌', '개그맨', '정치인', '국회의원',
                '감독', '작가', '유튜버', '방송인', '운동선수', '축구선수', '야구선수',
                '농구선수', '골프선수', '모델', '의사', '변호사', '교수', '기업인']
    cleaned = query.strip()
    for prefix in prefixes:
        if cleaned.startswith(prefix + ' ') or cleaned.startswith(prefix + ' '):
            cleaned = cleaned[len(prefix):].strip()
            break
    return cleaned


def search_namuwiki(query: str) -> dict | None:
    """
    나무위키에서 인물 정보 추출 (BeautifulSoup 사용).
    """
    try:
        # 직업 접두어 제거 후 URL 구성 (예: "배우 구교환" → "구교환")
        clean_query = _clean_query_for_url(query)
        url = f"https://namu.wiki/w/{clean_query}"
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

        log_msg(f"[나무위키] URL 요청: {url}")

        resp = requests.get(url, headers=headers, timeout=5)
        resp.encoding = 'utf-8'

        log_msg(f"[나무위키] {query} - 상태: {resp.status_code}")

        if resp.status_code != 200:
            log_msg(f"[나무위키] {query} - 페이지 없음")
            return None

        html = resp.text
        log_msg(f"[나무위키] HTML 크기: {len(html)} bytes")

        # BeautifulSoup으로 파싱
        soup = BeautifulSoup(html, 'html.parser')

        # 제목 추출
        title_tag = soup.find('title')
        name = title_tag.string.replace(' - 나무위키', '').strip() if title_tag else query

        # 텍스트만 추출해서 생년월일 찾기
        text = soup.get_text()

        # 생년월일 패턴 찾기 (여러 형식 지원)
        patterns = [
            r'출생\s*(?:일자)?[:\s]*(\d{4})[년\s.-]*(\d{1,2})[월\s.-]*(\d{1,2})',
            r'생년월일[:\s]*(\d{4})[년\s.-]*(\d{1,2})[월\s.-]*(\d{1,2})',
            r'생년\s*[:\s]*(\d{4})[년\s.-]*(\d{1,2})[월\s.-]*(\d{1,2})',
            r'탄생\s*[:\s]*(\d{4})[년\s.-]*(\d{1,2})[월\s.-]*(\d{1,2})',
            r'(?:Born|탄생)[:\s]*(\d{4})\s*년?\s*(\d{1,2})\s*월?\s*(\d{1,2})',
        ]

        birth_date = None
        for i, pattern in enumerate(patterns):
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                y, m, d = match.groups()
                birth_date = f"{y}-{int(m):02d}-{int(d):02d}"
                log_msg(f"[나무위키] {query} - 찾음: {birth_date} (패턴 {i})")
                break

        if not birth_date:
            log_msg(f"[나무위키] {query} - 생년월일 패턴 매칭 실패")
            return None

        # 성별은 나무위키에서 신뢰성 있게 추출하기 어렵므로 기본값 사용
        # Claude AI에서 정확한 성별 정보를 제공하므로 여기선 기본값만 사용
        gender = '남'  # 기본값: 남

        # 나무위키에서 성별 추론 (신뢰도 높은 순서대로 확인)
        # 1순위: 명시적 성별 표기 ("성별 : 여" 또는 "성별 : 남")
        if re.search(r'성별\s*[:：]\s*여(?![자성])', text, re.IGNORECASE):
            gender = '여'
            log_msg(f"[나무위키] 성별 (명시적): 여")
        elif re.search(r'성별\s*[:：]\s*남(?![자성])', text, re.IGNORECASE):
            gender = '남'
            log_msg(f"[나무위키] 성별 (명시적): 남")
        # 2순위: 직업/직함 (가장 신뢰도 높음 - 남배우, 여배우, 남가수, 여가수)
        elif re.search(r'\b여배우\b|\b여가수\b', text):
            gender = '여'
            log_msg(f"[나무위키] 성별 (직업): 여 - 여배우/여가수")
        elif re.search(r'\b남배우\b|\b남가수\b', text):
            gender = '남'
            log_msg(f"[나무위키] 성별 (직업): 남 - 남배우/남가수")
        # 3순위: "남자/여자 + 직업" 패턴
        elif re.search(r'여자\s*(?:배우|가수|선수|화가|감독|작가|운동선수|스케이터)', text):
            gender = '여'
            log_msg(f"[나무위키] 성별 (패턴): 여 - '여자 + 직업'")
        elif re.search(r'남자\s*(?:배우|가수|선수|화가|감독|작가|운동선수|스케이터)', text):
            gender = '남'
            log_msg(f"[나무위키] 성별 (패턴): 남 - '남자 + 직업'")
        else:
            log_msg(f"[나무위키] 성별: 기본값(남) 사용")

        # 직업 정보 추출
        career_type = _extract_career_type(text)
        log_msg(f"[나무위키] 직업: {career_type}")

        return {
            'name': name,
            'birth_date': birth_date,
            'gender': gender,
            'career_type': career_type,
            'description': '',
            'source': 'namuwiki'
        }

    except Exception as e:
        log_msg(f"[나무위키 에러] {query} - {str(e)}")
        return None


def search_wikitree(query: str) -> dict | None:
    """
    위키트리에서 인물 정보 추출.
    """
    try:
        url = f"https://www.wikitree.co.kr/main/Ab_List.php?q={query}"
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

        log_msg(f"[위키트리] URL 요청: {url}")

        resp = requests.get(url, headers=headers, timeout=5)
        resp.encoding = 'utf-8'

        log_msg(f"[위키트리] {query} - 상태: {resp.status_code}")

        if resp.status_code != 200:
            log_msg(f"[위키트리] {query} - 페이지 없음")
            return None

        text = resp.text
        log_msg(f"[위키트리] HTML 크기: {len(text)} bytes")

        # 생년월일 패턴 찾기
        patterns = [
            r'(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(?:출생|생)',
            r'생년월일[:\s]*(\d{4})[년\s.-]*(\d{1,2})[월\s.-]*(\d{1,2})',
            r'(?:출생|탄생)[:\s]*(\d{4})[년\s.-]*(\d{1,2})[월\s.-]*(\d{1,2})',
        ]

        for i, pattern in enumerate(patterns):
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                y, m, d = match.groups()
                birth_date = f"{y}-{int(m):02d}-{int(d):02d}"
                log_msg(f"[위키트리] {query} - 찾음: {birth_date} (패턴 {i})")
                return {
                    'name': query,
                    'birth_date': birth_date,
                    'description': '',
                    'source': 'wikitree'
                }

        log_msg(f"[위키트리] {query} - 생년월일 패턴 매칭 실패")
        return None

    except Exception as e:
        log_msg(f"[위키트리 에러] {query} - {str(e)}")
        return None


def search_google_for_birth(query: str) -> dict | None:
    """
    구글 검색 결과에서 생년월일 추출 (한국 유명인용).
    """
    try:
        search_url = "https://www.google.com/search"
        params = {
            'q': f"{query} 생년월일",
            'hl': 'ko'
        }
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }

        log_msg(f"[구글] {query} - 검색 시작")

        resp = requests.get(search_url, params=params, headers=headers, timeout=5)
        resp.encoding = 'utf-8'

        log_msg(f"[구글] {query} - 상태: {resp.status_code}")

        if resp.status_code != 200:
            log_msg(f"[구글] {query} - 요청 실패")
            return None

        text = resp.text
        log_msg(f"[구글] HTML 크기: {len(text)} bytes")

        # Google의 검색 결과 스니펫에서 생년월일 찾기
        patterns = [
            r'(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일',
            r'(?:출생|탄생)[:\s]*(\d{4})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})',
        ]

        for i, pattern in enumerate(patterns):
            match = re.search(pattern, text)
            if match:
                y, m, d = match.groups()
                birth_date = f"{y}-{int(m):02d}-{int(d):02d}"
                log_msg(f"[구글] {query} - 찾음: {birth_date} (패턴 {i})")
                return {
                    'name': query,
                    'birth_date': birth_date,
                    'description': '',
                    'source': 'google'
                }

        log_msg(f"[구글] {query} - 생년월일 패턴 매칭 실패")
        return None

    except Exception as e:
        log_msg(f"[구글 에러] {query} - {str(e)}")
        return None


def search_wikidata(query: str) -> dict | None:
    """
    Wikidata에서 인물 정보 추출.
    """
    try:
        search_url = "https://www.wikidata.org/w/api.php"
        search_params = {
            'action': 'query',
            'list': 'search',
            'srsearch': query,
            'srnamespace': 0,
            'srlimit': 5,
            'format': 'json'
        }

        log_msg(f"[Wikidata] {query} - 검색 중...")

        resp = requests.get(search_url, params=search_params, timeout=5)
        if resp.status_code != 200:
            log_msg(f"[Wikidata] 검색 요청 실패: {resp.status_code}")
            return None

        search_results = resp.json().get('query', {}).get('search', [])
        log_msg(f"[Wikidata] 검색 결과: {len(search_results)}개")

        if not search_results:
            log_msg(f"[Wikidata] {query} - 검색 결과 없음")
            return None

        for idx, result in enumerate(search_results):
            qid = result.get('title', '')
            if not qid.startswith('Q'):
                continue

            log_msg(f"[Wikidata] {qid} 조회 중...")

            entity_url = "https://www.wikidata.org/w/api.php"
            entity_params = {
                'action': 'wbgetentities',
                'ids': qid,
                'props': 'labels|descriptions|claims',
                'languages': 'ko|en',
                'format': 'json'
            }

            entity_resp = requests.get(entity_url, params=entity_params, timeout=5)
            if entity_resp.status_code != 200:
                continue

            entities = entity_resp.json().get('entities', {})
            entity = entities.get(qid, {})

            labels = entity.get('labels', {})
            name = labels.get('ko', {}).get('value') or labels.get('en', {}).get('value')
            if not name:
                continue

            claims = entity.get('claims', {})
            birth_claims = claims.get('P569', [])
            birth_date = None

            if birth_claims:
                birth_value = birth_claims[0].get('mainsnak', {}).get('datavalue', {}).get('value', {}).get('time', '')
                if birth_value:
                    match = re.search(r'(\d{4})-(\d{2})-(\d{2})', birth_value)
                    if match:
                        birth_date = f"{match.group(1)}-{match.group(2)}-{match.group(3)}"

            if birth_date:
                log_msg(f"[Wikidata] {name} - 찾음: {birth_date}")
                return {
                    'name': name,
                    'birth_date': birth_date,
                    'description': '',
                    'source': 'wikidata'
                }

        log_msg(f"[Wikidata] {query} - 생년월일 찾기 실패")
        return None

    except Exception as e:
        log_msg(f"[Wikidata 에러] {query} - {str(e)}")
        return None


def search_wikipedia_infobox(query: str) -> dict | None:
    """
    Wikipedia에서 인물 정보 추출.
    """
    try:
        wiki_url = "https://en.wikipedia.org/w/api.php"
        search_params = {
            'action': 'query',
            'list': 'search',
            'srsearch': query,
            'srlimit': 3,
            'format': 'json'
        }

        log_msg(f"[Wikipedia] {query} - 검색 중...")

        resp = requests.get(wiki_url, params=search_params, timeout=5)
        if resp.status_code != 200:
            log_msg(f"[Wikipedia] 검색 요청 실패: {resp.status_code}")
            return None

        search_results = resp.json().get('query', {}).get('search', [])
        log_msg(f"[Wikipedia] 검색 결과: {len(search_results)}개")

        if not search_results:
            log_msg(f"[Wikipedia] {query} - 검색 결과 없음")
            return None

        page_title = search_results[0].get('title', '')
        log_msg(f"[Wikipedia] 선택된 페이지: {page_title}")

        content_params = {
            'action': 'query',
            'titles': page_title,
            'prop': 'extracts',
            'explaintext': True,
            'format': 'json'
        }

        content_resp = requests.get(wiki_url, params=content_params, timeout=5)
        if content_resp.status_code != 200:
            log_msg(f"[Wikipedia] 페이지 로드 실패: {content_resp.status_code}")
            return None

        pages = content_resp.json().get('query', {}).get('pages', {})
        page_text = list(pages.values())[0].get('extract', '')

        if not page_text:
            log_msg(f"[Wikipedia] {page_title} - 페이지 텍스트 없음")
            return None

        log_msg(f"[Wikipedia] 페이지 텍스트 크기: {len(page_text)} bytes")

        patterns = [
            r'born[:\s]+(?:on\s+)?([A-Za-z]+\s+\d{1,2},\s+\d{4})',
            r'([A-Za-z]+\s+\d{1,2},\s+\d{4})[,\.]',
            r'(\d{4})-(\d{2})-(\d{2})',
        ]

        birth_date_str = None
        for i, pattern in enumerate(patterns):
            match = re.search(pattern, page_text, re.IGNORECASE)
            if match:
                birth_date_str = match.group(1) if ',' in match.group(0) else match.group(0)
                log_msg(f"[Wikipedia] 패턴 {i} 매칭됨: {birth_date_str}")
                break

        if not birth_date_str:
            log_msg(f"[Wikipedia] {page_title} - 생년월일 패턴 매칭 실패")
            return None

        try:
            if re.match(r'\d{4}-\d{2}-\d{2}', birth_date_str):
                log_msg(f"[Wikipedia] 찾음: {birth_date_str}")
                return {
                    'name': page_title,
                    'birth_date': birth_date_str,
                    'description': '',
                    'source': 'wikipedia'
                }

            dt = datetime.strptime(birth_date_str, "%B %d, %Y")
            birth_date = dt.strftime("%Y-%m-%d")
            log_msg(f"[Wikipedia] 찾음: {birth_date}")

            return {
                'name': page_title,
                'birth_date': birth_date,
                'description': '',
                'source': 'wikipedia'
            }
        except Exception as e:
            log_msg(f"[Wikipedia] 날짜 파싱 실패: {str(e)}")
            return None

    except Exception as e:
        log_msg(f"[Wikipedia 에러] {query} - {str(e)}")
        return None


def search_claude_ai(query: str) -> dict | None:
    """Claude AI를 사용해 유명인 생년월일 조회."""
    try:
        import anthropic
        client = anthropic.Anthropic()

        log_msg(f"[Claude AI] {query} - 검색 중...")

        message = client.messages.create(
            model="claude-opus-4-1",
            max_tokens=200,
            messages=[
                {
                    "role": "user",
                    "content": f"한국의 유명인 '{query}'의 생년월일(YYYY-MM-DD 형식), 성별(남/여), 직업을 정확히 알려주세요. 존재하지 않으면 'NOT_FOUND'라고 답변해주세요."
                }
            ]
        )

        response_text = message.content[0].text.strip()
        log_msg(f"[Claude AI] {query} - 응답: {response_text[:100]}")

        if 'NOT_FOUND' in response_text:
            return None

        # 응답에서 생년월일 추출
        match = re.search(r'(\d{4})-(\d{2})-(\d{2})', response_text)
        if not match:
            log_msg(f"[Claude AI] {query} - 생년월일 파싱 실패")
            return None

        birth_date = match.group(0)

        # 성별 추출
        gender = '남'
        if '여' in response_text or 'female' in response_text.lower():
            gender = '여'

        log_msg(f"[Claude AI] {query} - 찾음: {birth_date} ({gender})")

        return {
            'name': query,
            'birth_date': birth_date,
            'gender': gender,
            'description': '',
            'source': 'claude_ai'
        }

    except Exception as e:
        log_msg(f"[Claude AI 에러] {query} - {str(e)}")
        return None


def normalize_birth_date(date_str: str) -> str:
    """
    다양한 날짜 형식을 통일된 형식(YYYY-MM-DD)으로 변환.
    예: "1993년 7월 3일" → "1993-07-03"
    """
    if not date_str:
        return None

    date_str = str(date_str).strip()

    # 이미 YYYY-MM-DD 형식이면 그대로 반환
    if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
        return date_str

    # 한글 날짜 형식: 1993년 7월 3일
    match = re.search(r'(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일', date_str)
    if match:
        y, m, d = match.groups()
        return f"{y}-{int(m):02d}-{int(d):02d}"

    # 다른 형식들도 처리
    try:
        # 2024-01-01 형식
        if re.match(r'^\d{4}[./-]\d{1,2}[./-]\d{1,2}$', date_str):
            parts = re.split(r'[./-]', date_str)
            y, m, d = parts[0], parts[1], parts[2]
            return f"{y}-{int(m):02d}-{int(d):02d}"
    except:
        pass

    log_msg(f"[normalize_birth_date] 형식 변환 실패: {date_str}")
    return None


def compare_dates(date1: str, date2: str) -> bool:
    """두 날짜가 일치하는지 확인."""
    if not date1 or not date2:
        return False

    normalized1 = normalize_birth_date(date1)
    normalized2 = normalize_birth_date(date2)

    return normalized1 == normalized2 if normalized1 and normalized2 else False


def validate_celebrity_search(name: str, results: dict) -> dict:
    """
    여러 소스의 검색 결과를 검증하고 충돌을 감지.

    입력:
    - name: 검색한 유명인 이름
    - results: {source: {name, birth_date, gender, job, ...}, ...}

    출력:
    {
        'confidence': 0.0~1.0,
        'status': 'match' | 'partial' | 'conflict',
        'preferred': {name, birth_date, gender, ...},
        'sources': {source: {...}, ...},
        'conflicts': [{field, values, sources}, ...],
        'notes': '...'
    }
    """

    # 유효한 결과만 필터링
    valid_results = {source: data for source, data in results.items() if data}

    if not valid_results:
        return {
            'confidence': 0.0,
            'status': 'no_match',
            'preferred': None,
            'sources': results,
            'conflicts': [],
            'notes': '검색 결과를 찾을 수 없습니다.'
        }

    # 생년월일 일치도 계산
    normalized_dates = {}
    for source, data in valid_results.items():
        if data and data.get('birth_date'):
            normalized = normalize_birth_date(data['birth_date'])
            if normalized:
                normalized_dates[source] = normalized

    # 생년월일 충돌 감지
    birth_date_conflicts = []
    unique_dates = set(normalized_dates.values()) if normalized_dates else set()
    if normalized_dates and len(unique_dates) > 1:
        log_msg(f"[validate] {name} - 생년월일 충돌: {unique_dates}")
        for date in unique_dates:
            sources_with_date = [s for s, d in normalized_dates.items() if d == date]
            birth_date_conflicts.append({
                'field': 'birth_date',
                'value': date,
                'sources': sources_with_date
            })

    # 성별 일치도 계산
    genders = [data.get('gender') for data in valid_results.values() if data and data.get('gender')]
    unique_genders = set(genders) if genders else set()
    if len(unique_genders) > 1:
        log_msg(f"[validate] {name} - 성별 충돌: {unique_genders}")

    # 신뢰도 점수 계산
    total_sources = len(valid_results)
    conflict_count = len(birth_date_conflicts) + (1 if len(unique_genders) > 1 else 0)
    confidence = max(0.0, 1.0 - (conflict_count / total_sources * 0.5)) if total_sources > 0 else 0.0

    # 선호 데이터 선택 — 나무위키 우선, 없으면 다수결
    SOURCE_PRIORITY = ['namuwiki', 'wikidata', 'wikipedia', 'wikitree', 'google']
    preferred = None
    if normalized_dates:
        # 우선순위 소스에 날짜가 있으면 그걸 사용
        for priority_source in SOURCE_PRIORITY:
            if priority_source in normalized_dates:
                preferred = valid_results[priority_source].copy()
                preferred['birth_date'] = normalized_dates[priority_source]
                break
        # 우선순위 소스 없으면 다수결
        if not preferred:
            most_common_date = max(set(normalized_dates.values()),
                                   key=list(normalized_dates.values()).count)
            preferred_source = next(s for s, d in normalized_dates.items() if d == most_common_date)
            preferred = valid_results[preferred_source].copy()
            preferred['birth_date'] = most_common_date
    else:
        # 날짜는 없지만 소스가 있으면 첫 번째 사용
        preferred = next(iter(valid_results.values())).copy()

    # 상태 결정
    if len(unique_dates) <= 1 and len(unique_genders) <= 1:
        status = 'match'
    elif len(unique_dates) <= 1:
        status = 'partial'
    else:
        status = 'conflict'

    # 메시지 생성
    if status == 'match':
        notes = f"모든 소스가 일치합니다. 신뢰도: {confidence*100:.0f}%"
    elif status == 'partial':
        notes = f"대부분의 소스가 일치합니다. 신뢰도: {confidence*100:.0f}%"
    else:
        notes = f"소스 간 정보 불일치가 있습니다. 신뢰도: {confidence*100:.0f}%"

    return {
        'confidence': confidence,
        'status': status,
        'preferred': preferred,
        'sources': valid_results,
        'conflicts': birth_date_conflicts,
        'notes': notes
    }


def get_celebrity_with_validation(name: str) -> dict:
    """
    여러 소스에서 검색 후 자동 검증.

    반환:
    - validate_celebrity_search 결과
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed

    search_functions = {
        'namuwiki': search_namuwiki,
        'wikitree': search_wikitree,
        'google': search_google_for_birth,
        'wikidata': search_wikidata,
        'wikipedia': search_wikipedia_infobox,
        # claude_ai 제거 — 환각 위험, celebrity.py에서 폴백으로만 사용
    }

    results = {}

    log_msg(f"[get_celebrity_with_validation] {name} - 병렬 검색 시작")

    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {
            source: executor.submit(search_func, name)
            for source, search_func in search_functions.items()
        }

        for source, future in futures.items():
            try:
                result = future.result(timeout=10)
                results[source] = result
                if result:
                    log_msg(f"[get_celebrity_with_validation] {source} - 성공")
            except Exception as e:
                log_msg(f"[get_celebrity_with_validation] {source} - 실패: {str(e)}")
                results[source] = None

    # 검증
    validation = validate_celebrity_search(name, results)
    log_msg(f"[get_celebrity_with_validation] {name} - 검증 완료: {validation['status']} (신뢰도: {validation['confidence']:.0%})")

    return validation
