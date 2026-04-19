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

def test_daeun_sunhaeng_for_yin_female():
    # 辛년(음년) + 여성 → 순행 (월주에서 순방향)
    # 월주 乙未 → 순행: 丙申, 丁酉, 戊戌...
    result = get_daeun(date(1981, 7, 20), '여', '辛', '酉', '乙', '未')
    assert result['direction'] == '순행'
    first = result['daeun'][0]
    assert first['gan'] == '丙'  # 乙(1) + 1 = 2 → 丙
    assert first['ji'] == '申'   # 未(7) + 1 = 8 → 申

def test_daeun_sunhaeng_for_yang_male():
    # 庚년(양년) + 남성 → 순행 (월주 己卯 기준)
    # 순행: 庚辰, 辛巳, 壬午...
    result = get_daeun(date(1980, 4, 2), '남', '庚', '申', '己', '卯')
    assert result['direction'] == '순행'
    assert result['start_age'] == 1
    first = result['daeun'][0]
    assert first['gan'] == '庚'  # 己(5) + 1 = 6 → 庚
    assert first['ji'] == '辰'   # 卯(3) + 1 = 4 → 辰

def test_daeun_returns_dict_with_keys():
    result = get_daeun(date(1980, 4, 2), '남', '庚', '申', '戊', '辰')
    assert 'start_age' in result
    assert 'direction' in result
    assert 'daeun' in result

def test_daeun_start_age_male_1980():
    # 1980-04-02 남성: 대운수 = 1
    result = get_daeun(date(1980, 4, 2), '남', '庚', '申', '戊', '辰')
    assert result['start_age'] == 1
