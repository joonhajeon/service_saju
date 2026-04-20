# saju/celebrity.py
"""유명인 생년월일 검색 — Claude AI 사용"""
import json
import re
import anthropic
from config import ANTHROPIC_API_KEY

_client = None


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
    Claude AI로 유명인 생년월일 검색.
    query 예시: '손흥민', '축구선수 박지성', '쿨의 김성수', '가수 아이유'
    """
    if not ANTHROPIC_API_KEY:
        return []

    try:
        client = _get_client()
        prompt = f"""다음 인물의 생년월일과 출생 국가를 알려주세요: {query}

동명이인이 있을 경우 가장 유명한 인물 기준으로 답변하세요.
직업이나 소속(그룹명, 팀명 등)이 포함된 경우 해당 인물을 특정해서 답변하세요.

반드시 아래 JSON 형식으로만 답변하세요 (다른 텍스트 없이):
{{
  "results": [
    {{
      "name": "인물 이름 (한국어)",
      "birth_date": "YYYY-MM-DD",
      "birth_country": "출생 국가 (한국어, 예: 대한민국, 미국, 영국)",
      "description": "간단한 소개 (직업/소속, 10자 이내)"
    }}
  ]
}}

확실한 정보가 없으면 birth_date를 null로 설정하세요.
정보가 확실한 경우에만 포함하세요."""

        response = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}]
        )

        text = response.content[0].text.strip()
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if not match:
            return []

        data = json.loads(match.group())
        results = []

        for item in data.get('results', []):
            birth_date = item.get('birth_date')
            if not birth_date:
                continue

            # 날짜 파싱
            try:
                parts = birth_date.split('-')
                y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
            except Exception:
                continue

            lunar = _to_lunar(y, m, d)

            results.append({
                'name': item.get('name', query),
                'birth_date': birth_date,
                'birth_date_lunar': lunar,
                'birth_country': item.get('birth_country', '대한민국'),
                'description': item.get('description', ''),
                'source': 'ai',
            })

        return results

    except Exception as e:
        return []
