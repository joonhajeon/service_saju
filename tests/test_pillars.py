"""사주 팔자 계산 v2 테스트 — datetime 기반."""
from datetime import date, datetime
import pytest

from saju.pillars import (
    get_year_pillar, get_year_pillar_by_year,
    get_day_pillar, get_hour_pillar, get_hour_jiji,
    get_month_pillar, _find_jeorin_datetime,
)


# ──────────────────────────────────────────────
# 년주
# ──────────────────────────────────────────────

def test_year_pillar_1981_summer():
    # 1981-07-20 → 1981년 입춘(2월 4일) 이후 → 辛酉년
    dt = datetime(1981, 7, 20, 12, 0)
    gan, ji = get_year_pillar(dt)
    assert gan == '辛'
    assert ji  == '酉'


def test_year_pillar_1988_summer():
    dt = datetime(1988, 7, 1, 12, 0)
    gan, ji = get_year_pillar(dt)
    assert gan == '戊'
    assert ji  == '辰'


def test_year_pillar_before_ipchun_uses_prev_year():
    # 입춘 교입 시각 확인 후 그 직전은 전년도 년주
    ipchun_2024 = _find_jeorin_datetime(2024, 0)   # 2024 입춘
    before_ipchun = datetime(ipchun_2024.year, ipchun_2024.month, ipchun_2024.day,
                             ipchun_2024.hour, ipchun_2024.minute - 1)
    gan, ji = get_year_pillar(before_ipchun)
    # 2023년 년주: (2023-4)%60=19 → 癸卯
    assert gan == '癸'
    assert ji  == '卯'


def test_year_pillar_after_ipchun_uses_current_year():
    ipchun_2024 = _find_jeorin_datetime(2024, 0)
    after_ipchun = ipchun_2024  # 교입 시각 정각 포함
    gan, ji = get_year_pillar(after_ipchun)
    # 2024년: (2024-4)%60=20 → 甲辰
    assert gan == '甲'
    assert ji  == '辰'


def test_year_pillar_by_year_no_ipchun_correction():
    # get_year_pillar_by_year 는 입춘 보정 없이 연도 그대로
    gan, ji = get_year_pillar_by_year(1981)
    assert gan == '辛'
    assert ji  == '酉'


# ──────────────────────────────────────────────
# 일주
# ──────────────────────────────────────────────

def test_day_pillar_19810720():
    dt = datetime(1981, 7, 20, 12, 0)
    gan, ji = get_day_pillar(dt)
    assert gan == '己'
    assert ji  == '亥'


def test_day_pillar_yajasi_same_day():
    # 야자시 A 방식: 23:45 출생 → 오늘 일주 유지 (날짜 전진 없음)
    dt_day   = datetime(1981, 7, 20, 12, 0)
    dt_night = datetime(1981, 7, 20, 23, 45)
    assert get_day_pillar(dt_day) == get_day_pillar(dt_night)


def test_day_pillar_midnight_is_next_day():
    # 00:00~01:29 은 子時이지만 날짜는 이미 다음 날
    dt_prev = datetime(1981, 7, 20, 23, 29)  # 亥時 마지막
    dt_next = datetime(1981, 7, 21, 0,   0)  # 다음 날 子時
    assert get_day_pillar(dt_prev) != get_day_pillar(dt_next)


# ──────────────────────────────────────────────
# 시주
# ──────────────────────────────────────────────

def test_hour_jiji_반시법_경계():
    # 01:30 = 丑時 시작
    ji, idx = get_hour_jiji(1, 30)
    assert ji == '丑'
    # 01:29 = 子時
    ji, idx = get_hour_jiji(1, 29)
    assert ji == '子'


def test_hour_jiji_yajasi():
    # 23:30~23:59 = 子時 (야자시)
    ji, idx = get_hour_jiji(23, 30)
    assert ji == '子'
    assert idx == 0
    ji, idx = get_hour_jiji(23, 59)
    assert ji == '子'


def test_hour_pillar_11_40():
    # 일간 己(index=5), 11:40 → 午時(idx=5) → (5+0+5)%10=10%10=0+stem_start
    # 己 stem_start=0, 午 idx=5 → stem=(0+5)%10=5 → 庚
    dt = datetime(1981, 7, 20, 11, 40)
    gan, ji = get_hour_pillar('己', dt)
    assert gan == '庚'
    assert ji  == '午'


def test_hour_pillar_none_when_no_time():
    gan, ji = get_hour_pillar('己', None)
    assert gan is None
    assert ji  is None


# ──────────────────────────────────────────────
# 월주 — 절기 교입 시각 기준
# ──────────────────────────────────────────────

def test_month_pillar_19810720():
    # 1981-07-20 = 소서(7/7경) ~ 입추(8/7경) 사이 → 未月
    # 辛년 → 庚 시작(idx 6) → 未(idx 5) → (6+5)%10=1 → 乙未
    dt = datetime(1981, 7, 20, 12, 0)
    gan, ji = get_month_pillar(dt, '辛')
    assert gan == '乙'
    assert ji  == '未'


def test_month_pillar_before_ipchun_is_축월():
    # 입춘(month_idx=0) 교입 직전 → 丑月(month_idx=11)
    ipchun_dt = _find_jeorin_datetime(1981, 0)
    before_ipchun = datetime(ipchun_dt.year, ipchun_dt.month, ipchun_dt.day,
                             ipchun_dt.hour, max(0, ipchun_dt.minute - 1))
    _, ji = get_month_pillar(before_ipchun, '庚')
    assert ji == '丑'


def test_month_pillar_after_ipchun_is_인월():
    # 입춘 교입 직후 → 寅月(month_idx=0)
    ipchun_dt = _find_jeorin_datetime(1981, 0)
    _, ji = get_month_pillar(ipchun_dt, '辛')
    assert ji == '寅'


def test_month_pillar_jeorin_day_before_time():
    # 절기 당일이라도 교입 시각 이전이면 이전 월
    # 소서 2024: _find_jeorin_datetime(2024, 5) 확인 후 1분 전 테스트
    soseo_dt = _find_jeorin_datetime(2024, 5)
    before = datetime(soseo_dt.year, soseo_dt.month, soseo_dt.day,
                      soseo_dt.hour, max(0, soseo_dt.minute - 1))
    _, ji_before = get_month_pillar(before, '甲')
    _, ji_after  = get_month_pillar(soseo_dt, '甲')
    assert ji_before != ji_after   # 절기 전후로 월지지가 바뀌어야 함


# ──────────────────────────────────────────────
# jeorin datetime 검증
# ──────────────────────────────────────────────

def test_jeorin_datetime_has_time_component():
    # DB에서 읽은 절기 시각이 분 단위까지 있어야 함
    ipchun_2000 = _find_jeorin_datetime(2000, 0)
    # 2000-02-04 12:03 KST 근처여야 함
    assert ipchun_2000.date() == date(2000, 2, 4)
    # 시각이 0:00이 아닌지 확인 (날짜만 있는 게 아님)
    assert not (ipchun_2000.hour == 0 and ipchun_2000.minute == 0)
