from datetime import date
from saju.daeun import get_daeun

def test_daeun_returns_11_entries():
    result = get_daeun(date(1981, 7, 20), '여', '辛', '酉', '乙', '未')
    assert len(result['daeun']) == 11

def test_daeun_age_increments():
    result = get_daeun(date(1981, 7, 20), '여', '辛', '酉', '乙', '未')
    daeun = result['daeun']
    start = result['start_age']
    ages = [d['age'] for d in daeun]
    expected = [start + i * 10 for i in range(11)]
    assert ages == expected

def test_daeun_has_gan_ji():
    result = get_daeun(date(1981, 7, 20), '여', '辛', '酉', '乙', '未')
    for d in result['daeun']:
        assert 'gan' in d
        assert 'ji' in d
        assert d['gan'] in ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']

def test_daeun_yeokhaeng_for_yin_female():
    # 辛년(음년) + 여성 → 역행 (월주에서 역방향)
    # 월주 乙未 → 역행: 甲午, 癸巳, 壬辰...
    result = get_daeun(date(1981, 7, 20), '여', '辛', '酉', '乙', '未')
    assert result['direction'] == '역행'
    first = result['daeun'][0]
    assert first['gan'] == '甲'  # 乙(1) - 1 = 0 → 甲
    assert first['ji'] == '午'   # 未(7) - 1 = 6 → 午

def test_daeun_returns_dict_with_keys():
    result = get_daeun(date(1980, 4, 2), '남', '庚', '申', '戊', '辰')
    assert 'start_age' in result
    assert 'direction' in result
    assert 'daeun' in result

def test_daeun_start_age_male_1980():
    # 1980-04-02 남성: 대운수 = 1
    result = get_daeun(date(1980, 4, 2), '남', '庚', '申', '戊', '辰')
    assert result['start_age'] == 1
