from datetime import date
from saju.daeun import get_daeun

def test_daeun_returns_11_entries():
    daeun = get_daeun(date(1981, 7, 20), '여', '辛', '酉', '乙', '未')
    assert len(daeun) == 11

def test_daeun_age_increments():
    daeun = get_daeun(date(1981, 7, 20), '여', '辛', '酉', '乙', '未')
    ages = [d['age'] for d in daeun]
    assert ages == list(range(10, 120, 10))

def test_daeun_has_gan_ji():
    daeun = get_daeun(date(1981, 7, 20), '여', '辛', '酉', '乙', '未')
    for d in daeun:
        assert 'gan' in d
        assert 'ji' in d
        assert d['gan'] in ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']

def test_daeun_yeokhaeng_for_yin_female():
    # 辛년(음년) + 여성 → 역행 (월주에서 역방향)
    # 월주 乙未 → 역행: 甲午, 癸巳, 壬辰...
    daeun = get_daeun(date(1981, 7, 20), '여', '辛', '酉', '乙', '未')
    first = daeun[0]
    assert first['gan'] == '甲'  # 乙(1) - 1 = 0 → 甲
    assert first['ji'] == '午'   # 未(7) - 1 = 6 → 午
