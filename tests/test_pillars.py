from datetime import date
from saju.pillars import get_year_pillar, get_day_pillar, get_hour_pillar, get_month_pillar

def test_year_pillar_1981():
    gan, ji = get_year_pillar(1981)
    assert gan == '辛'
    assert ji == '酉'

def test_year_pillar_1988():
    gan, ji = get_year_pillar(1988)
    assert gan == '戊'
    assert ji == '辰'

def test_day_pillar_19810720():
    gan, ji = get_day_pillar(date(1981, 7, 20))
    assert gan == '己'
    assert ji == '亥'

def test_hour_pillar_11_40():
    # 일간 己(index=5), 시간 11:40 → 午時 → 庚午
    gan, ji = get_hour_pillar('己', 11, 40)
    assert gan == '庚'
    assert ji == '午'

def test_hour_unknown():
    gan, ji = get_hour_pillar('己', None, None)
    assert gan is None
    assert ji is None

def test_month_pillar_19810720():
    # 1981-07-20 = 소서(7/7) ~ 입추(8/7) 사이 → 未月
    # 辛년 → 月간 시작: 庚(寅月, index 6)
    # 未월(month_idx=5) → stem = (6 + 5) % 10 = 1 → 乙
    gan, ji = get_month_pillar(date(1981, 7, 20), '辛')
    assert gan == '乙'
    assert ji == '未'

def test_month_pillar_early_year():
    # 1981-02-01 = 소한(1/6) 이후 ~ 입춘(2/4) 이전 → 丑月 (전년도 기준)
    # 庚년(1980) 기준: 乙庚년 → 戊천간 시작 (index 4)
    # 丑月은 month_idx=11 (寅=0, ..., 丑=11)
    gan, ji = get_month_pillar(date(1981, 2, 1), '庚')
    assert ji == '丑'
