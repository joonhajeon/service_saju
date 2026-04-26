# ai/analyzer.py
import anthropic
import json
from config import ANTHROPIC_API_KEY

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

DOC1_PROMPT = """당신은 전문 사주 분석가입니다. 아래 사주 데이터를 바탕으로 [Document 1: 사주 분석 리포트]를 작성하세요.

## 사주 데이터
{saju_json}

## 작성 지침
다음 항목을 순서대로 분석하세요:

1. **음양 비율 분석**:
   - 천간의 음양: 각 천간의 gan_euyang 값 확인 (양/음)
   - 지지의 음양: 각 지지의 ji_euyang 값 확인 (양/음)
   - 전체 양 개수 vs 음 개수 계산
   - 음양 불균형이 의미하는 기본 성향 해석

2. **신강(身强)/신약(身弱) 판단**: 일간의 힘 vs 월령/지지 세력

3. **조후(調候) 분석**: 계절 기운과 한열조습 밸런스

4. **용희신(用喜神)/기구신(忌仇神)**: 일간을 돕는/방해하는 오행

5. **十神 분석**: 각 십신의 의미와 사주에서의 역할

6. **12운성 단계**: 일주 12운성의 의미

7. **물상(物象) 분석**: 사주 전체의 자연 이미지

마크다운 표와 소제목을 활용해 A4 1장 분량으로 작성하세요."""

DOC2_PROMPT = """당신은 전문 사주 분석가입니다. 아래 사주 데이터를 바탕으로 [Document 2: 사주 전략 리포트]를 작성하세요.

## 사주 데이터
{saju_json}

## 분석 방법
- **음양 비율**: pillars의 각 항목에서 gan_euyang과 ji_euyang 확인
- **타고난 구조**: 음양 균형(양:음 비율)과 전체 오행 분포 해석

## 작성 형식 (마크다운 표)
| 항목 | 핵심 분석 내용 |
|------|------|
| **타고난 구조** | 음양 비율(양:음, gan과 ji 각각)과 사주 전체의 물상 |
| **강점** | 十神 기반 타고난 재능과 전문성 |
| **반복 패턴** | 유독 자주 겪는 인간관계나 심리적 패턴의 원인 |
| **현재 운** | 현재 대운이 요구하는 숙제와 키워드 |
| **올해 전략** | 용희신 기반 에너지 집중 방향 |
| **하지 말 것** | 기구신 기반 에너지 낭비 패턴 |

표 아래에 상담 마무리 Key Message를 한 줄로 작성하세요.
A4 1장 분량으로 작성하세요."""

DOC3_PROMPT = """당신은 전문 사주 분석가입니다. 아래 사주 데이터를 바탕으로 [Document 3: 테마별 심층 분석]을 작성하세요.

## 사주 데이터
{saju_json}

## 커리어 타입
{career_type}

## 분석 항목
### 💖 연애 및 결혼운
- **구조**: 관성(官星)/재성(財星)의 동태 및 일지(日支) 환경 분석
- **시기**: 현재 운에서의 이성 인연 발생 가능성
- **전략**: 관계 유지를 위해 조절해야 할 심리적 기제

### 💰 재물운
- **구조**: 식상생재형/관인소통형/군겁쟁재형 분류 및 현재 양상
- **전략**: 돈이 들어오는 통로 최적화
- **주의**: 리스크 시점 및 자산 관리 방식

### 💼 커리어 전략 ({career_type})
커리어 타입에 맞는 맞춤형 분석을 작성하세요.

A4 1-2장 분량으로 작성하세요."""

GOONGHAP_PROMPT = """두 사람의 사주를 비교하여 궁합 분석을 해주세요.

## {name1} 사주
{saju1_json}

## {name2} 사주
{saju2_json}

## 분석 항목
1. **합궁(合宮) 분석**: 두 사주의 일지 형충회합 관계
2. **오행 보완 관계**: 상대방이 내 부족한 오행을 채워주는가
3. **용신 관계**: 상대방이 내 용신을 도와주는가, 기신을 자극하는가
4. **십신 관계**: 서로에게 어떤 십신으로 작용하는가
5. **종합 궁합 평가**: 강점과 주의점
6. **관계 유지 전략**: 서로 조화롭게 지내는 방법"""


def stream_analysis(saju_data: dict, career_type: str, person_name: str):
    """Generator: Doc 1 → Doc 2 → Doc 3 순서로 SSE 스트리밍"""
    saju_json = json.dumps(saju_data, ensure_ascii=False, indent=2)

    for doc_num, prompt_template in [
        (1, DOC1_PROMPT),
        (2, DOC2_PROMPT),
        (3, DOC3_PROMPT),
    ]:
        yield f"data: {{\"type\":\"doc_start\",\"doc\":{doc_num}}}\n\n"

        prompt = prompt_template.format(saju_json=saju_json, career_type=career_type)
        if person_name:
            prompt = f"## 내담자: {person_name}\n\n" + prompt

        try:
            with client.messages.stream(
                model="claude-sonnet-4-6",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}],
                system="당신은 20년 경력의 전문 사주 컨설턴트입니다. 정확하고 실용적인 분석을 제공합니다.",
            ) as stream:
                for text in stream.text_stream:
                    escaped = text.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n').replace('\r', '')
                    yield f"data: {{\"type\":\"text\",\"doc\":{doc_num},\"text\":\"{escaped}\"}}\n\n"
        except Exception as e:
            yield f"data: {{\"type\":\"error\",\"doc\":{doc_num},\"message\":\"{str(e)}\"}}\n\n"

        yield f"data: {{\"type\":\"doc_end\",\"doc\":{doc_num}}}\n\n"

    yield "data: {\"type\":\"done\"}\n\n"


def stream_goonghap(person1: dict, person2: dict):
    """궁합 분석 스트리밍"""
    saju1_json = json.dumps(person1.get('saju', {}), ensure_ascii=False, indent=2)
    saju2_json = json.dumps(person2.get('saju', {}), ensure_ascii=False, indent=2)
    prompt = GOONGHAP_PROMPT.format(
        name1=person1.get('name', '1번'),
        saju1_json=saju1_json,
        name2=person2.get('name', '2번'),
        saju2_json=saju2_json,
    )
    yield "data: {\"type\":\"start\"}\n\n"
    try:
        with client.messages.stream(
            model="claude-sonnet-4-6",
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}],
            system="당신은 20년 경력의 전문 사주 컨설턴트입니다.",
        ) as stream:
            for text in stream.text_stream:
                escaped = text.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n').replace('\r', '')
                yield f"data: {{\"type\":\"text\",\"text\":\"{escaped}\"}}\n\n"
    except Exception as e:
        yield f"data: {{\"type\":\"error\",\"message\":\"{str(e)}\"}}\n\n"
    yield "data: {\"type\":\"done\"}\n\n"
