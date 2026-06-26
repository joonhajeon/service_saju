"""년주/일주/시주/월주 계산 v2 — datetime 기반, 절기 교입 정확 시각 사용.

주요 변경:
- 모든 함수가 date가 아닌 datetime을 인자로 받음
- 절기 교입 시각을 분 단위까지 비교 (하루 단위 오차 제거)
- 야자시 A 방식: 23:30~23:59 출생 = 오늘 일주 유지 + 子시
- 한국 역사 표준시 보정은 core.py에서 적용 후 전달
"""
import json
import math
import os
from datetime import date, datetime, timedelta
from functools import lru_cache

import ephem

from saju.constants import CHEONGAN, JIJI

_SOLAR_TERMS_TIME_PATH = os.path.join(
    os.path.dirname(__file__), '..', 'data', 'solar_terms_time.json'
)
_SOLAR_TERMS_TIME_DB: dict | None = None

_JEORIN_LON    = [315, 345, 15, 45, 75, 105, 135, 165, 195, 225, 255, 285]
_APPROX_MONTHS = [  2,   3,  4,  5,  6,   7,   8,   9,  10,  11,  12,   1]
_APPROX_DAYS   = [  4,   6,  5,  6,  6,   7,   8,   8,   8,   7,   7,   6]

_MONTH_JIJI_ORDER = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']

_MONTH_STEM_START = {
    '甲': 2, '己': 2,
    '乙': 4, '庚': 4,
    '丙': 6, '辛': 6,
    '丁': 8, '壬': 8,
    '戊': 0, '癸': 0,
}

_HOUR_STEM_START = {
    '甲': 0, '己': 0,
    '乙': 2, '庚': 2,
    '丙': 4, '辛': 4,
    '丁': 6, '壬': 6,
    '戊': 8, '癸': 8,
}

_REF_DATE   = date(1900, 1, 1)
_REF_STEM   = 0   # 甲
_REF_BRANCH = 10  # 戌


def _load_solar_terms_time() -> None:
    global _SOLAR_TERMS_TIME_DB
    if _SOLAR_TERMS_TIME_DB is None:
        try:
            with open(_SOLAR_TERMS_TIME_PATH, 'r', encoding='utf-8') as f:
                _SOLAR_TERMS_TIME_DB = json.load(f)
        except FileNotFoundError:
            _SOLAR_TERMS_TIME_DB = {}


def _find_jeorin_datetime_ephem(year: int, month_idx: int) -> datetime:
    """Newton-Raphson으로 절기 교입 UTC 시각 정밀 계산 후 KST 반환."""
    target_lon = _JEORIN_LON[month_idx]
    search_year = year + 1 if month_idx == 11 else year
    approx = datetime(search_year, _APPROX_MONTHS[month_idx], _APPROX_DAYS[month_idx], 12)

    t = ephem.Date(approx)
    for _ in range(50):
        sun = ephem.Sun()
        sun.compute(t)
        lon = (math.degrees(float(sun.hlong)) + 180) % 360
        diff = target_lon - lon
        if diff > 180:  diff -= 360
        if diff < -180: diff += 360
        if abs(diff) < 1e-6:
            break
        t += diff / 360

    utc_dt = ephem.Date(t).datetime()
    return utc_dt + timedelta(hours=9)


@lru_cache(maxsize=1024)
def _find_jeorin_datetime(year: int, month_idx: int) -> datetime:
    """절기 교입 KST datetime 반환. JSON DB 우선, 없으면 ephem 계산."""
    _load_solar_terms_time()
    db = _SOLAR_TERMS_TIME_DB
    if db and str(year) in db:
        return datetime.strptime(db[str(year)][month_idx], '%Y-%m-%d %H:%M')
    return _find_jeorin_datetime_ephem(year, month_idx)


def _find_jeorin_date(year: int, month_idx: int) -> date:
    """하위 호환 — _find_jeorin_datetime의 date 부분 반환. daeun.py에서 사용."""
    return _find_jeorin_datetime(year, month_idx).date()


def get_year_pillar(birth_dt: datetime) -> tuple:
    """출생 datetime 기준 년주 반환. 입춘 교입 시각이 년도 경계."""
    ipchun_dt = _find_jeorin_datetime(birth_dt.year, 0)
    year = birth_dt.year if birth_dt >= ipchun_dt else birth_dt.year - 1
    idx60 = (year - 4) % 60
    return CHEONGAN[idx60 % 10], JIJI[idx60 % 12]


def get_year_pillar_by_year(year: int) -> tuple:
    """연도 정수로 년주 반환. 세운/대운 표시 전용 — 입춘 보정 없음."""
    idx60 = (year - 4) % 60
    return CHEONGAN[idx60 % 10], JIJI[idx60 % 12]


def get_day_pillar(birth_dt: datetime) -> tuple:
    """일주 반환.

    야자시 A 방식: 23:30~23:59 출생은 오늘 일주를 그대로 사용.
    (날짜를 다음 날로 전진하지 않음)
    """
    days = (birth_dt.date() - _REF_DATE).days
    stem   = (_REF_STEM   + days) % 10
    branch = (_REF_BRANCH + days) % 12
    return CHEONGAN[stem], JIJI[branch]


def get_hour_jiji(hour: int, minute: int = 0) -> tuple:
    """시간(24h) + 분 → (지지, 지지인덱스 0=子). 반시법(30분 이동) 기준.

    子時: 23:30~01:29 / 丑時: 01:30~03:29 / ... / 亥時: 21:30~23:29
    """
    total = hour * 60 + minute
    if total < 90 or total >= 1410:  # 00:00~01:29 또는 23:30~23:59
        return '子', 0
    idx = (total - 90) // 120 + 1
    return JIJI[idx], idx


def get_hour_pillar(ilgan: str, birth_dt: datetime | None) -> tuple:
    """시주 반환. birth_dt가 None이면 시간 미입력으로 (None, None) 반환."""
    if birth_dt is None:
        return None, None
    jiji_char, jiji_idx = get_hour_jiji(birth_dt.hour, birth_dt.minute)
    stem_start = _HOUR_STEM_START.get(ilgan, 0)
    stem = (stem_start + jiji_idx) % 10
    return CHEONGAN[stem], jiji_char


def get_month_pillar(birth_dt: datetime, year_gan: str) -> tuple:
    """월주 반환. 절기 교입 datetime과 비교하여 정확한 월 경계 적용."""
    year = birth_dt.year
    jeorin_dts = [_find_jeorin_datetime(year, i) for i in range(12)]

    month_idx = None
    for i in range(11, -1, -1):
        if birth_dt >= jeorin_dts[i]:
            month_idx = i
            break

    if month_idx is None:
        # 입춘(month_idx=0) 이전: 전년도 소한(11) 또는 대설(10)
        prev_sohan_dt = _find_jeorin_datetime(year - 1, 11)
        month_idx = 11 if birth_dt >= prev_sohan_dt else 10

    jiji = _MONTH_JIJI_ORDER[month_idx]
    stem_start = _MONTH_STEM_START.get(year_gan, 0)
    stem = (stem_start + month_idx) % 10
    return CHEONGAN[stem], jiji
