"""대운 계산 모듈."""
from datetime import date
from math import ceil
from saju.constants import CHEONGAN, JIJI, CHEONGAN_EUYANG


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
    순행/역행: 양년+남성, 음년+여성 → 순행; 양년+여성, 음년+남성 → 역행

    대운수:
      순행 → 다음 절입일까지의 날수 ÷ 3 (올림)
      역행 → 현재 월 절입일에서 생일까지의 날수 ÷ 3 (올림)
    최소 1세.
    """
    from saju.pillars import _find_jeorin_date

    year_gan_idx = CHEONGAN.index(year_gan)
    year_euyang = CHEONGAN_EUYANG[year_gan_idx]
    is_male = (gender == '남')
    forward = (year_euyang == '양' and is_male) or (year_euyang == '음' and not is_male)
    direction = '순행' if forward else '역행'

    # 해당 연도의 12개 절입일 계산
    year = birth_date.year
    jeorin_dates = [_find_jeorin_date(year, i) for i in range(12)]

    # 생일이 속한 월 절기 인덱스 찾기
    current_month_idx = None
    for i in range(11, -1, -1):
        if birth_date >= jeorin_dates[i]:
            current_month_idx = i
            break

    if current_month_idx is None:
        prev_sohan = _find_jeorin_date(year - 1, 11)
        if birth_date >= prev_sohan:
            current_month_idx = 11
        else:
            current_month_idx = 10

    # 대운수 계산
    if forward:
        # 순행: 다음 절입일까지의 날수
        if current_month_idx < 11:
            next_jeorin = _find_jeorin_date(year, current_month_idx + 1)
        else:
            next_jeorin = _find_jeorin_date(year + 1, 0)
        days = (next_jeorin - birth_date).days
    else:
        # 역행: 현재 월 절입일에서 생일까지의 날수
        # 소한(11)의 경우 특수 처리: prev_sohan 사용
        if current_month_idx == 11:
            current_jeorin = _find_jeorin_date(year - 1, 11)
        else:
            current_jeorin = jeorin_dates[current_month_idx]
        days = (birth_date - current_jeorin).days

    start_age = max(1, ceil(days / 3))  # 올림(ceil) 사용

    # 대운 목록 생성
    month_gan_idx = CHEONGAN.index(month_gan)
    month_ji_idx = JIJI.index(month_ji)

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
