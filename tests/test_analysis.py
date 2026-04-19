from saju.analysis import get_sipshin, get_sipshin_for_jiji, get_jijangan_with_sipshin, get_unseong, get_naeum, get_oheng_distribution

def test_sipshin_bigyeon():
    assert get_sipshin(0, 0) == '비견'   # 甲 vs 甲

def test_sipshin_gyeopjae():
    assert get_sipshin(0, 1) == '겁재'   # 甲 vs 乙

def test_sipshin_sikshin():
    assert get_sipshin(0, 2) == '식신'   # 甲 vs 丙 (甲生火, 같은 양)

def test_sipshin_sangwan():
    assert get_sipshin(0, 3) == '상관'   # 甲 vs 丁 (甲生火, 다른 음양)

def test_sipshin_pyeonjae():
    assert get_sipshin(0, 4) == '편재'   # 甲 vs 戊 (甲克土, 같은 양)

def test_sipshin_jeongjae():
    assert get_sipshin(0, 5) == '정재'   # 甲 vs 己 (甲克土, 다른 음양)

def test_sipshin_pyeongwan():
    assert get_sipshin(0, 6) == '편관'   # 甲 vs 庚 (金克木, 같은 양)

def test_sipshin_jeonggwan():
    assert get_sipshin(0, 7) == '정관'   # 甲 vs 辛 (金克木, 다른 음양)

def test_sipshin_pyeonin():
    assert get_sipshin(0, 8) == '편인'   # 甲 vs 壬 (水生木, 같은 양)

def test_sipshin_jeongin():
    assert get_sipshin(0, 9) == '정인'   # 甲 vs 癸 (水生木, 다른 음양)

def test_unseong_gap_at_ja():
    assert get_unseong('甲', '子') == '沐浴'

def test_naeum_gap_ja():
    # 甲子 → 海中金
    assert get_naeum('甲', '子') == '海中金'

def test_oheng_distribution():
    pillars = [
        {'gan': '辛', 'ji': '酉'},  # 년주
        {'gan': '乙', 'ji': '未'},  # 월주
        {'gan': '己', 'ji': '亥'},  # 일주
        {'gan': '庚', 'ji': '午'},  # 시주
    ]
    dist = get_oheng_distribution(pillars)
    assert dist['金'] == 3  # 辛, 酉, 庚
    assert dist['木'] == 1  # 乙
    assert dist['水'] == 1  # 亥
