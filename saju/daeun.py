"""대운 계산 모듈."""
from datetime import date
from saju.constants import CHEONGAN, JIJI, CHEONGAN_EUYANG


def _calc_daeun_start(birth_date: date) -> int:
    """대운수 계산: 생일 이후 다음 절기까지의 일수 ÷ 3 (반올림, 최소 1)"""
    from saju.pillars import _find_jeorin_date

    year = birth_date.year

    # Find the current month index (which 절기 period birth_date falls in)
    jeorin_dates = [_find_jeorin_date(year, i) for i in range(12)]

    current_month_idx = None
    for i in range(11, -1, -1):
        if birth_date >= jeorin_dates[i]:
            current_month_idx = i
            break

    if current_month_idx is None:
        # Before 입춘: check previous year's 소한
        prev_sohan = _find_jeorin_date(year - 1, 11)
        if birth_date >= prev_sohan:
            current_month_idx = 11
        else:
            current_month_idx = 10

    # Next 절기 date
    if current_month_idx < 11:
        next_jeorin = _find_jeorin_date(year, current_month_idx + 1)
    else:
        next_jeorin = _find_jeorin_date(year + 1, 0)

    days = (next_jeorin - birth_date).days
    start_age = max(1, round(days / 3))
    return start_age


def get_daeun(
    birth_date: date,
    gender: str,
    year_gan: str,
    year_ji: str,
    month_gan: str,
    month_ji: str,
) -> dict:
    """
    대운 계산 결과 반환.
    순행/역행: 양년+남성(陽年男命), 음년+여성(陰年女命) → 순행; 음년+남성, 양년+여성 → 역행

    Returns:
        {
            'start_age': int,      # 대운수
            'direction': str,      # '순행' or '역행'
            'daeun': list[dict],   # [{'age': N, 'gan': '甲', 'ji': '子'}, ...]
        }
    """
    year_gan_idx = CHEONGAN.index(year_gan)
    year_euyang = CHEONGAN_EUYANG[year_gan_idx]
    is_male = (gender == '남')
    forward = (year_euyang == '양' and is_male) or (year_euyang == '음' and not is_male)
    direction = '순행' if forward else '역행'

    month_gan_idx = CHEONGAN.index(month_gan)
    month_ji_idx = JIJI.index(month_ji)

    start_age = _calc_daeun_start(birth_date)

    daeun = []
    for i in range(1, 12):
        if forward:
            gan_idx = (month_gan_idx + i) % 10
            ji_idx = (month_ji_idx + i) % 12
        else:
            gan_idx = (month_gan_idx - i) % 10
            ji_idx = (month_ji_idx - i) % 12

        age = start_age + (i - 1) * 10
        daeun.append({
            'age': age,
            'gan': CHEONGAN[gan_idx],
            'ji': JIJI[ji_idx],
        })

    return {
        'start_age': start_age,
        'direction': direction,
        'daeun': daeun,
    }
