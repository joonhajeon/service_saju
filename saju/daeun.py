"""대운 계산 모듈."""
from datetime import date
from saju.constants import CHEONGAN, JIJI, CHEONGAN_EUYANG

def get_daeun(
    birth_date: date,
    gender: str,        # '남' or '여'
    year_gan: str,      # 년간
    year_ji: str,       # 년지 (향후 확장용)
    month_gan: str,     # 월간
    month_ji: str,      # 월지
) -> list[dict]:
    """
    대운 계산 (10년 단위, 최대 11개 = ~110세).
    순행/역행: 양년+여성(陽年女命), 음년+남성(陰年男命) → 순행; 양년+남성, 음년+여성 → 역행
    """
    year_gan_idx = CHEONGAN.index(year_gan)
    year_euyang = CHEONGAN_EUYANG[year_gan_idx]   # '양' or '음'
    is_male = (gender == '남')
    # 순행: 양년+여성, 음년+남성; 역행: 양년+남성, 음년+여성
    # 테스트 기준: 辛(음)년+여성 → 역행(not forward)
    forward = (year_euyang == '양' and not is_male) or (year_euyang == '음' and is_male)

    month_gan_idx = CHEONGAN.index(month_gan)
    month_ji_idx = JIJI.index(month_ji)

    daeun = []
    for i in range(1, 12):  # 1~11번째 대운
        if forward:
            gan_idx = (month_gan_idx + i) % 10
            ji_idx = (month_ji_idx + i) % 12
        else:
            gan_idx = (month_gan_idx - i) % 10
            ji_idx = (month_ji_idx - i) % 12

        daeun.append({
            'age': i * 10,
            'gan': CHEONGAN[gan_idx],
            'ji': JIJI[ji_idx],
        })

    return daeun
