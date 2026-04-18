from saju.constants import CHEONGAN, JIJI, OHENG_COLOR, JIJANGAN

def test_cheongan_length():
    assert len(CHEONGAN) == 10

def test_jiji_length():
    assert len(JIJI) == 12

def test_oheng_color_has_five():
    assert set(OHENG_COLOR.keys()) == {'木', '火', '土', '金', '水'}

def test_jijangan_ja_has_two_stems():
    assert len(JIJANGAN['子']) == 2
    assert JIJANGAN['子'][0][0] == '壬'
    assert JIJANGAN['子'][1][0] == '癸'

def test_unseong_gap_at_ja():
    from saju.constants import UNSEONG_TABLE
    assert UNSEONG_TABLE['甲'][0] == '沐浴'

def test_saeng_is_string_keyed():
    from saju.constants import SAENG, GEUK
    assert SAENG['木'] == '火'
    assert GEUK['木'] == '土'
