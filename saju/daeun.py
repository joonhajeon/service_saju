"""대운 계산 모듈."""
from datetime import date, datetime
from math import floor
from saju.constants import CHEONGAN, JIJI, CHEONGAN_EUYANG


def get_daeun(
    birth_dt: datetime,
    gender: str,
    year_gan: str,
    year_ji: str,
    month_gan: str,
    month_ji: str,
) -> dict:
    """
    대운 계산 결과 반환.
    순행/역행: 년간(年干) 음양 기준
      양간년+남성, 음간년+여성 → 순행
      양간년+여성, 음간년+남성 → 역행

    대운수:
      순행 → 다음 절입일까지의 날수 ÷ 3 (반올림)
      역행 → 생일에서 현재 월 절입일까지의 날수 ÷ 3 (반올림)
    최소 1세.
    """
    from saju.pillars import _find_jeorin_datetime

    # 년간 음양 기준으로 순행/역행 결정
    year_gan_idx = CHEONGAN.index(year_gan)
    year_euyang = CHEONGAN_EUYANG[year_gan_idx]
    is_male = (gender == '남')
    forward = (year_euyang == '양' and is_male) or (year_euyang == '음' and not is_male)
    direction = '순행' if forward else '역행'

    # 해당 연도의 12개 절입 datetime 계산
    year = birth_dt.year
    jeorin_dts = [_find_jeorin_datetime(year, i) for i in range(12)]

    # 생일이 속한 월 절기 인덱스 찾기 (datetime 비교)
    current_month_idx = None
    prev_year_fallback = False  # 전년도 대설/소한월로 fallback 여부
    for i in range(11, -1, -1):
        if birth_dt >= jeorin_dts[i]:
            current_month_idx = i
            break

    if current_month_idx is None:
        # 입춘 이전: 전년도 대설(10) 또는 소한(11)월에 해당
        prev_sohan = _find_jeorin_datetime(year - 1, 11)
        prev_year_fallback = True
        if birth_dt >= prev_sohan:
            current_month_idx = 11
        else:
            current_month_idx = 10

    # 대운수 계산 — datetime 기반으로 분 단위 정밀 계산
    if forward:
        # 순행: 다음 절입 datetime까지의 날수
        if prev_year_fallback:
            if current_month_idx < 11:
                next_jeorin = _find_jeorin_datetime(year - 1, current_month_idx + 1)
            else:
                next_jeorin = _find_jeorin_datetime(year, 0)
        elif current_month_idx < 11:
            next_jeorin = _find_jeorin_datetime(year, current_month_idx + 1)
        else:
            # 소한월(11)의 다음 절기는 같은 해 입춘(0)
            next_jeorin = _find_jeorin_datetime(year, 0)
        days = (next_jeorin - birth_dt).days
    else:
        # 역행: 현재 월 절입 datetime에서 생일까지의 날수
        if prev_year_fallback:
            if current_month_idx == 11:
                # _find_jeorin_datetime(y, 11)은 내부적으로 y+1 소한을 반환하므로 year-1을 전달해야 당해 소한을 얻음
                current_jeorin = _find_jeorin_datetime(year - 1, 11)
            else:
                current_jeorin = _find_jeorin_datetime(year - 1, current_month_idx)
        elif current_month_idx == 11:
            # _find_jeorin_datetime(y, 11)은 내부적으로 y+1 소한을 반환하므로 year-1을 전달해야 당해 소한을 얻음
            current_jeorin = _find_jeorin_datetime(year - 1, 11)
        else:
            current_jeorin = jeorin_dts[current_month_idx]
        days = (birth_dt - current_jeorin).days

    start_age = max(1, floor(days / 3 + 0.5))  # 반올림: 1.333→1, 1.667→2, 6.333→6

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
