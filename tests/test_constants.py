from saju.constants import CHEONGAN, JIJI, OHENG_COLOR

def test_cheongan_length():
    assert len(CHEONGAN) == 10

def test_jiji_length():
    assert len(JIJI) == 12

def test_oheng_color_has_five():
    assert set(OHENG_COLOR.keys()) == {'木', '火', '土', '金', '水'}
