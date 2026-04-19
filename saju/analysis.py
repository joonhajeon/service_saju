"""사주 분석 계산 모듈 — 십신, 지장간, 12운성, 납음, 오행분포."""
from saju.constants import (
    CHEONGAN, JIJI,
    CHEONGAN_OHENG, CHEONGAN_EUYANG,
    JIJI_OHENG,
    JIJI_MAIN_CHEONGAN,
    JIJANGAN, NAEUM, UNSEONG_TABLE,
    OHENG_ORDER, SAENG, GEUK,
)


def get_sipshin(ilgan_idx: int, target_idx: int) -> str:
    """
    일간(일주 천간) 인덱스와 대상 천간 인덱스를 받아 십신 반환.
    ilgan_idx, target_idx: 0=甲, 1=乙, ..., 9=癸
    """
    ilgan_oheng = CHEONGAN_OHENG[ilgan_idx]    # 예: '木'
    target_oheng = CHEONGAN_OHENG[target_idx]
    ilgan_euyang = CHEONGAN_EUYANG[ilgan_idx]  # '양' or '음'
    target_euyang = CHEONGAN_EUYANG[target_idx]
    same_polarity = (ilgan_euyang == target_euyang)

    if ilgan_oheng == target_oheng:
        return '비견' if same_polarity else '겁재'
    elif SAENG[ilgan_oheng] == target_oheng:   # 일간이 生하는 오행
        return '식신' if same_polarity else '상관'
    elif GEUK[ilgan_oheng] == target_oheng:    # 일간이 克하는 오행
        return '편재' if same_polarity else '정재'
    elif GEUK[target_oheng] == ilgan_oheng:    # 일간을 克하는 오행
        return '편관' if same_polarity else '정관'
    elif SAENG[target_oheng] == ilgan_oheng:   # 일간을 生하는 오행
        return '편인' if same_polarity else '정인'
    return ''


def get_sipshin_for_jiji(ilgan_idx: int, jiji: str) -> str:
    """지지의 대표 천간 기준으로 십신 계산."""
    target_idx = JIJI_MAIN_CHEONGAN[jiji]
    return get_sipshin(ilgan_idx, target_idx)


def get_jijangan_with_sipshin(ilgan_idx: int, jiji: str) -> list[dict]:
    """지장간 리스트 + 각 장간의 십신 반환."""
    result = []
    for gan, days in JIJANGAN.get(jiji, []):
        gan_idx = CHEONGAN.index(gan)
        result.append({
            'gan': gan,
            'days': days,
            'sipshin': get_sipshin(ilgan_idx, gan_idx),
        })
    return result


def get_unseong(ilgan: str, jiji: str) -> str:
    """12운성 반환. ilgan=일간 천간 문자, jiji=지지 문자."""
    jiji_idx = JIJI.index(jiji)
    return UNSEONG_TABLE[ilgan][jiji_idx]


def get_naeum(gan: str, ji: str) -> str:
    """납음오행 반환 — 60갑자 순서 기반 정확한 인덱스."""
    gan_idx = CHEONGAN.index(gan)
    ji_idx = JIJI.index(ji)
    for i in range(60):
        if i % 10 == gan_idx and i % 12 == ji_idx:
            return NAEUM[i]
    return ''


def get_oheng_distribution(pillars: list[dict]) -> dict:
    """
    4개 기둥의 오행 분포 계산 (천간 4 + 지지 4 = 총 8개).
    pillars: [{'gan': '甲', 'ji': '子'}, ...]
    """
    dist = {'木': 0, '火': 0, '土': 0, '金': 0, '水': 0}
    for p in pillars:
        if p.get('gan'):
            dist[CHEONGAN_OHENG[CHEONGAN.index(p['gan'])]] += 1
        if p.get('ji'):
            dist[JIJI_OHENG[JIJI.index(p['ji'])]] += 1
    return dist
