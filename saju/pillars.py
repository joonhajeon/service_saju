"""년주/일주/시주/월주 계산 (Year/Day/Hour/Month Pillar Calculation)."""

import math
from datetime import date, datetime, timedelta
from saju.constants import CHEONGAN, JIJI

import ephem


# 년주: 기준 (year - 4) % 60
def get_year_pillar(year: int) -> tuple:
    idx60 = (year - 4) % 60
    return CHEONGAN[idx60 % 10], JIJI[idx60 % 12]


# 일주: 기준일 1900-01-01 = 甲戌 (stem=0, branch=10)
_REF_DATE = date(1900, 1, 1)
_REF_STEM = 0    # 甲
_REF_BRANCH = 10  # 戌

def get_day_pillar(birth_date: date) -> tuple:
    days = (birth_date - _REF_DATE).days
    stem = (_REF_STEM + days) % 10
    branch = (_REF_BRANCH + days) % 12
    return CHEONGAN[stem], JIJI[branch]


# 시주: 시간 → 지지 매핑
_HOUR_JIJI = [
    (23, 1, '子'), (1, 3, '丑'), (3, 5, '寅'), (5, 7, '卯'),
    (7, 9, '辰'), (9, 11, '巳'), (11, 13, '午'), (13, 15, '未'),
    (15, 17, '申'), (17, 19, '酉'), (19, 21, '戌'), (21, 23, '亥'),
]

# 시주 시작 천간 (일간 기준)
_HOUR_STEM_START = {
    '甲': 0, '己': 0,   # 甲子시
    '乙': 2, '庚': 2,   # 丙子시
    '丙': 4, '辛': 4,   # 戊子시
    '丁': 6, '壬': 6,   # 庚子시
    '戊': 8, '癸': 8,   # 壬子시
}


def get_hour_jiji(hour: int) -> tuple:
    """시간(24h) → (지지, 지지_인덱스 0=子)"""
    for start, end, jiji_char in _HOUR_JIJI:
        if start == 23:  # 子時 23:00~01:00 special case
            if hour >= 23 or hour < 1:
                return jiji_char, 0
        elif start <= hour < end:
            ji_idx = JIJI.index(jiji_char)
            return jiji_char, ji_idx
    return '子', 0


def get_hour_pillar(ilgan: str, hour, minute) -> tuple:
    if hour is None:
        return None, None
    jiji_char, jiji_idx = get_hour_jiji(hour)
    stem_start = _HOUR_STEM_START.get(ilgan, 0)
    stem = (stem_start + jiji_idx) % 10
    return CHEONGAN[stem], jiji_char


# 월주 계산 (절기 기반)

# 절기 태양 황경 (월지지 인덱스 0=寅월부터)
# 입춘=315°, 경칩=345°, 청명=15°, 입하=45°, 망종=75°, 소서=105°
# 입추=135°, 백로=165°, 한로=195°, 입동=225°, 대설=255°, 소한=285°
_JEORIN_LON = [315, 345, 15, 45, 75, 105, 135, 165, 195, 225, 255, 285]

# 월지지 순서 (인월부터 시작: 寅卯辰巳午未申酉戌亥子丑)
_MONTH_JIJI_ORDER = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']

# 월간 시작 천간 인덱스 (년간 기준, 寅月의 천간)
_MONTH_STEM_START = {
    '甲': 2, '己': 2,   # 丙寅月부터 (丙=2)
    '乙': 4, '庚': 4,   # 戊寅月부터 (戊=4)
    '丙': 6, '辛': 6,   # 庚寅月부터 (庚=6)
    '丁': 8, '壬': 8,   # 壬寅月부터 (壬=8)
    '戊': 0, '癸': 0,   # 甲寅月부터 (甲=0)
}


def _get_solar_longitude(dt: datetime) -> float:
    """주어진 날짜의 태양 황경(도) 반환"""
    sun = ephem.Sun()
    sun.compute(dt.strftime('%Y/%m/%d'))
    return math.degrees(float(sun.hlong)) % 360


def _find_jeorin_date(year: int, month_idx: int) -> date:
    """month_idx (0=입춘, 11=소한)에 해당하는 절기 날짜 계산"""
    target_lon = _JEORIN_LON[month_idx]

    # 대략적인 시작 날짜 (월별 절기 대략 날짜)
    approx_months = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1]
    approx_days =   [4, 6, 5, 6, 6, 7,  8,  8,  8,  7,  7, 6]

    # 소한(month_idx=11)은 다음 해 1월
    if month_idx == 11:
        search_year = year + 1
    else:
        search_year = year

    try:
        approx = datetime(search_year, approx_months[month_idx], approx_days[month_idx])
    except ValueError:
        approx = datetime(search_year, approx_months[month_idx], 1)

    # ±15일 범위에서 태양 황경이 target_lon을 지나는 날 찾기
    for delta in range(-15, 20):
        d = approx + timedelta(days=delta)
        d_next = d + timedelta(days=1)
        lon = _get_solar_longitude(d)
        lon_next = _get_solar_longitude(d_next)

        # wrap-around 처리 (예: 315° 근처 입춘: 359°→1°)
        if lon > lon_next:
            # 날짜 경계에서 황경이 360°→0°로 wrap
            if target_lon >= lon or target_lon < lon_next:
                return d.date()
        else:
            if lon <= target_lon < lon_next:
                return d.date()

    return approx.date()


def get_month_pillar(birth_date: date, year_gan: str) -> tuple:
    """생일과 년간을 받아 월주(천간, 지지) 반환.

    year_gan은 입춘 기준으로 조정된 년간이어야 함 (caller가 처리).
    """
    year = birth_date.year

    # 해당 년도의 12개 절기 시작일 계산 (인월~축월)
    jeorin_dates = []
    for i in range(12):
        jd = _find_jeorin_date(year, i)
        jeorin_dates.append(jd)

    # birth_date가 어느 절기 구간에 속하는지 찾기
    # 뒤에서부터 탐색: 가장 최근에 지난 절기
    month_idx = None
    for i in range(11, -1, -1):
        if birth_date >= jeorin_dates[i]:
            month_idx = i
            break

    if month_idx is None:
        # 입춘(month_idx=0) 이전: 전년도의 丑月(month_idx=11)에 해당
        # 전년도 소한은 birth_date의 해(year) 1월에 위치
        prev_sohan = _find_jeorin_date(year - 1, 11)
        if birth_date >= prev_sohan:
            month_idx = 11
        else:
            # 전전년도 대설(month_idx=10)
            month_idx = 10

    jiji = _MONTH_JIJI_ORDER[month_idx]
    stem_start = _MONTH_STEM_START.get(year_gan, 0)
    stem = (stem_start + month_idx) % 10
    return CHEONGAN[stem], jiji
