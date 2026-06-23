from datetime import datetime, date
from saju.kr_timezone import to_canonical_kst


def test_normal_period_no_change():
    # 1990년 3월 (정상 KST, DST 없음)
    dt = datetime(1990, 3, 15, 14, 0)
    assert to_canonical_kst(dt) == datetime(1990, 3, 15, 14, 0)


def test_dst_1988_summer_subtract_60min():
    # 1988-06-01: DST 기간 (1988-05-08~1988-10-09)
    # 기재 시각 02:00 → canonical 01:00
    dt = datetime(1988, 6, 1, 2, 0)
    result = to_canonical_kst(dt)
    assert result == datetime(1988, 6, 1, 1, 0)


def test_dst_1988_start_boundary():
    # 1988-05-08: DST 첫날 포함
    dt = datetime(1988, 5, 8, 10, 0)
    assert to_canonical_kst(dt) == datetime(1988, 5, 8, 9, 0)


def test_dst_1988_end_boundary():
    # 1988-10-10: DST 끝난 다음 날 → 보정 없음
    dt = datetime(1988, 10, 10, 10, 0)
    assert to_canonical_kst(dt) == datetime(1988, 10, 10, 10, 0)


def test_utc830_period_add_30min():
    # 1957-04-01: UTC+8:30 기간 (1954-03-21~1961-08-10)
    dt = datetime(1957, 4, 1, 10, 0)
    result = to_canonical_kst(dt)
    assert result == datetime(1957, 4, 1, 10, 30)


def test_utc830_end_boundary():
    # 1961-08-10: UTC+8:30 기간 종료일 → 보정 없음
    dt = datetime(1961, 8, 10, 10, 0)
    assert to_canonical_kst(dt) == datetime(1961, 8, 10, 10, 0)


def test_dst_during_utc830_period():
    # 1960-05-01: DST(-60) + UTC+8:30(+30) → net -30min
    dt = datetime(1960, 5, 1, 10, 0)
    result = to_canonical_kst(dt)
    assert result == datetime(1960, 5, 1, 9, 30)
