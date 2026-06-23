"""Generate data/solar_terms_time.json — exact KST datetimes for 12 solar terms per year.
Usage: python scripts/generate_solar_terms_time.py > data/solar_terms_time.json
"""
import json, math, sys
from datetime import datetime, timedelta
import ephem

_JEORIN_LON    = [315, 345, 15, 45, 75, 105, 135, 165, 195, 225, 255, 285]
_APPROX_MONTHS = [  2,   3,  4,  5,  6,   7,   8,   9,  10,  11,  12,   1]
_APPROX_DAYS   = [  4,   6,  5,  6,  6,   7,   8,   8,   8,   7,   7,   6]


def find_jeorin_kst(year: int, month_idx: int) -> datetime:
    """Newton-Raphson으로 절기 교입 정확한 UTC 시각 계산 후 KST 반환."""
    target_lon = _JEORIN_LON[month_idx]
    search_year = year + 1 if month_idx == 11 else year
    approx = datetime(search_year, _APPROX_MONTHS[month_idx], _APPROX_DAYS[month_idx], 12)

    t = ephem.Date(approx)
    for _ in range(50):
        sun = ephem.Sun()
        sun.compute(t)
        lon = (math.degrees(float(sun.hlong)) + 180) % 360
        diff = target_lon - lon
        if diff > 180:  diff -= 360
        if diff < -180: diff += 360
        if abs(diff) < 1e-6:
            break
        t += diff / 360  # 태양은 하루에 ~1도 이동

    utc_dt = ephem.Date(t).datetime()
    return utc_dt + timedelta(hours=9)  # KST = UTC+9


result = {}
for year in range(1900, 2101):
    terms = []
    for idx in range(12):
        kst = find_jeorin_kst(year, idx)
        terms.append(kst.strftime('%Y-%m-%d %H:%M'))
    result[str(year)] = terms
    print(f'  {year} done', file=sys.stderr)

json.dump(result, sys.stdout, ensure_ascii=False, indent=None)
print()
