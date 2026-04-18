"""년주/일주/시주 계산 (Year/Day/Hour Pillar Calculation)."""

from datetime import date
from saju.constants import CHEONGAN, JIJI


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
