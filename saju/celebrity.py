# saju/celebrity.py
"""유명인 생년월일 검색 — Claude AI 사용"""
import json
import re
import sys
import anthropic
from config import ANTHROPIC_API_KEY

_client = None

# 로그 파일 경로
LOG_FILE = 'celebrity_search.log'

def log_msg(msg):
    """터미널과 파일에 로그 기록"""
    print(msg)
    sys.stdout.flush()
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(msg + '\n')


def _get_client():
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    return _client


def _to_lunar(year: int, month: int, day: int) -> str | None:
    """양력 → 음력 변환 (korean-lunar-calendar 사용)"""
    try:
        from korean_lunar_calendar import KoreanLunarCalendar
        cal = KoreanLunarCalendar()
        cal.setSolarDate(year, month, day)
        leap = '(윤)' if cal.isLeapMonth else ''
        return f"{cal.LunarYear}년 {cal.LunarMonth}월{leap} {cal.LunarDay}일"
    except Exception:
        return None


def search_celebrity(query: str) -> list[dict]:
    """
    유명인 생년월일 검색 — 다중 소스 병렬 검색 + 자동 검증.
    query 예시: '손흥민', '축구선수 박지성', '쿨의 김성수', '가수 아이유'
    """
    # 로그 파일 초기화
    with open(LOG_FILE, 'w', encoding='utf-8') as f:
        f.write("")

    log_msg(f"\n[유명인 검색] '{query}' 시작")

    # 웹 검색 함수 import
    try:
        from saju.web_search import get_celebrity_with_validation
        log_msg(f"[import 성공] web_search 모듈 로드됨")
    except Exception as e:
        log_msg(f"[import 에러] web_search 모듈: {str(e)}")
        return []

    # 병렬 검색 + 검증
    try:
        validation = get_celebrity_with_validation(query)

        # 검증 결과 확인
        if not validation['preferred']:
            log_msg(f"[검색 실패] '{query}' - 웹 소스 결과 없음, Claude AI 폴백 시도...")
            return _search_with_claude(query)

        preferred = validation['preferred']
        confidence = validation['confidence']
        status = validation['status']

        log_msg(f"[검색 결과] 상태: {status}, 신뢰도: {confidence:.0%}")

        # 충돌 여부에 따라 설명 추가
        conflict_note = '⚠️ 출처 간 날짜 불일치' if status == 'conflict' else ''

        result = {
            'name': preferred.get('name', query),
            'birth_date': preferred.get('birth_date'),
            'gender': preferred.get('gender', ''),
            'career_type': preferred.get('career_type', '타입없음'),
            'description': preferred.get('description', ''),
            'source': preferred.get('source', 'web'),
            'confidence': confidence,
            'status': status,
            'conflicts': validation['conflicts'],
            'conflict_note': conflict_note,
        }

        # 생년월일이 있으면 음력 변환
        if result['birth_date']:
            try:
                parts = result['birth_date'].split('-')
                y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
                lunar = _to_lunar(y, m, d)
                result['birth_date_lunar'] = lunar
            except Exception:
                result['birth_date_lunar'] = None

        log_msg(f"[검색 성공] {result['name']}, 생년월일: {result['birth_date']}{' ('+conflict_note+')' if conflict_note else ''}")
        return [result]

    except Exception as e:
        log_msg(f"[검색 예외] {str(e)}")
        return []


def _search_with_claude(query: str) -> list[dict]:
    """Claude AI로 유명인 검색"""
    try:
        log_msg(f"[Claude] API 호출 중...")
        client = _get_client()
        prompt = f"""다음 인물의 정보를 알려주세요: {query}

동명이인이 있을 경우 가장 유명한 인물 기준으로 답변하세요.
직업이나 소속(그룹명, 팀명 등)이 포함된 경우 해당 인물을 특정해서 답변하세요.

반드시 아래 JSON 형식으로만 답변하세요 (다른 텍스트 없이):
{{
  "results": [
    {{
      "name": "인물 이름 (한국어)",
      "birth_date": "YYYY-MM-DD",
      "birth_country": "출생 국가 (한국어, 예: 대한민국, 미국, 영국)",
      "gender": "남 또는 여",
      "career_type": "다음 중 하나: 직장인, 사업가, 프리랜서, 연예인, 운동선수, 정치인, 공인·전문직, 학생, 주부, 타입없음",
      "description": "간단한 소개 (직업/소속, 10자 이내)"
    }}
  ]
}}

career_type 선택 기준:
- 가수/배우/아이돌/개그맨 → 연예인
- 운동선수/스포츠인/축구선수/야구선수/농구선수 → 운동선수
- 정치인/국회의원/대통령 → 정치인
- 사업가/CEO/기업인 → 사업가
- 의사/변호사/교수 등 전문직 → 공인·전문직
- 유튜버/방송인/크리에이터 → 연예인
- 나머지 → 타입없음

확실한 정보가 없으면 birth_date를 null로 설정하세요."""

        response = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}]
        )

        text = response.content[0].text.strip()
        log_msg(f"[Claude] API 응답 받음, 텍스트 길이: {len(text)}")

        match = re.search(r'\{.*\}', text, re.DOTALL)
        if not match:
            log_msg(f"[Claude] JSON 파싱 실패: JSON 패턴 없음")
            return []

        log_msg(f"[Claude] JSON 파싱 성공")
        data = json.loads(match.group())
        results = []

        for item in data.get('results', []):
            birth_date = item.get('birth_date')
            lunar = None

            # 생년월일 파싱 (있으면)
            if birth_date:
                try:
                    parts = birth_date.split('-')
                    y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
                    lunar = _to_lunar(y, m, d)
                except Exception:
                    pass

            # 생년월일이 없으면 이름만으로라도 반환 (사용자가 수동입력 가능)
            name = item.get('name', query)
            log_msg(f"[Claude] 결과: {name}, 생년월일: {birth_date}")

            results.append({
                'name': name,
                'birth_date': birth_date,  # null 가능
                'birth_date_lunar': lunar,
                'birth_country': item.get('birth_country', '대한민국'),
                'gender': item.get('gender', ''),
                'career_type': item.get('career_type', ''),
                'description': item.get('description', ''),
                'source': 'ai',
            })

        return results

    except json.JSONDecodeError as e:
        # AI 응답이 JSON 형식이 아닌 경우
        log_msg(f"[Claude] JSON 디코딩 에러: {str(e)}")
        return []
    except Exception as e:
        # 기타 에러 (API 통신 실패 등)
        log_msg(f"[Claude] 예외 발생: {str(e)}")
        return []
