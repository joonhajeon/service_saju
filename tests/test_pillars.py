from datetime import date
from saju.pillars import get_year_pillar, get_day_pillar, get_hour_pillar

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
