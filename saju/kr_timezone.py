"""한국 역사 표준시 보정 — 사주 계산용 canonical KST(UTC+9) 변환."""
from datetime import date, datetime, timedelta

# 역사적 DST(일광절약시간) 기간 (시작 포함, 종료 미포함)
_DST_PERIODS = [
    (date(1948, 6,  1),  date(1948, 9, 13)),
    (date(1949, 4,  3),  date(1949, 9, 11)),
    (date(1950, 4,  1),  date(1950, 9, 10)),
    (date(1951, 5,  6),  date(1951, 9, 10)),
    (date(1955, 5,  5),  date(1955, 9, 10)),
    (date(1956, 5, 20),  date(1956, 9, 30)),
    (date(1957, 5,  5),  date(1957, 9, 23)),
    (date(1958, 5,  4),  date(1958, 9, 22)),
    (date(1959, 5,  3),  date(1959, 9, 21)),
    (date(1960, 5,  1),  date(1960, 9, 19)),
    (date(1987, 5, 10),  date(1987, 10, 12)),
    (date(1988, 5,  8),  date(1988, 10, 10)),
]

# UTC+8:30 사용 기간 (동경 127.5도 기준, 자유당 정권)
_UTC830_START = date(1954, 3, 21)
_UTC830_END   = date(1961, 8, 10)


def to_canonical_kst(birth_dt: datetime) -> datetime:
    """출생증명서 기재 시각(당시 표준시) → canonical KST(UTC+9) 변환.

    - UTC+8:30 기간(1954-03-21~1961-08-10): 기재 시각에 +30분
    - DST 기간: 기재 시각에 -60분
    - 두 조건 동시: net -30분
    """
    d = birth_dt.date()
    delta_minutes = 0

    if _UTC830_START <= d < _UTC830_END:
        delta_minutes += 30

    for dst_start, dst_end in _DST_PERIODS:
        if dst_start <= d < dst_end:
            delta_minutes -= 60
            break

    return birth_dt + timedelta(minutes=delta_minutes)
