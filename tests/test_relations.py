from saju.relations import get_yukham, get_samhap, get_chung, get_all_relations

def test_yukham_ja_chuk():
    result = get_yukham(['子', '丑'])
    assert any('子丑합' in r for r in result)

def test_samhap_sin_ja_jin():
    result = get_samhap(['申', '子', '辰'])
    assert any('삼합(水)' in r for r in result)

def test_chung_ja_o():
    result = get_chung(['子', '午'])
    assert '子午충' in result

def test_no_relation():
    result = get_all_relations(['甲', '乙', '丙', '丁'])  # 천간 (지지 아닌 값)
    # 결과가 있어도 없어도 오류 없이 동작해야 함
    assert isinstance(result, dict)
    assert 'yukham' in result
    assert 'chung' in result
