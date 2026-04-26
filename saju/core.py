# saju/core.py
from datetime import date as Date
from saju.pillars import get_year_pillar, get_month_pillar, get_day_pillar, get_hour_pillar
from saju.analysis import (
    get_sipshin, get_sipshin_for_jiji, get_jijangan_with_sipshin,
    get_unseong, get_naeum, get_oheng_distribution
)
from saju.relations import get_all_relations
from saju.daeun import get_daeun
from saju.constants import CHEONGAN, JIJI, CHEONGAN_EUYANG, JIJI_EUYANG


def _solar_to_lunar(solar_date: Date) -> Date:
    """양력을 음력으로 변환"""
    try:
        from korean_lunar_calendar import KoreanLunarCalendar
        cal = KoreanLunarCalendar()
        cal.setSolarDate(solar_date.year, solar_date.month, solar_date.day)
        return Date(cal.lunarYear, cal.lunarMonth, cal.lunarDay)
    except Exception as e:
        # 변환 실패 시 입력된 날짜 그대로 반환 (fallback)
        return solar_date


def calculate_saju(
    birth_date: Date,
    hour: int | None,
    minute: int | None,
    gender: str,
) -> dict:
    """생년월일시 → 사주팔자 전체 데이터 반환

    주의: 입력은 양력이지만 사주 계산은 음력 기준으로 수행됨
    """
    # 양력을 음력으로 변환 (년주 계산용)
    lunar_date = _solar_to_lunar(birth_date)

    # 사주 계산:
    # - 년주: 음력 연도 기준
    # - 월주, 일주, 시주: 양력 기준 (절기 기준)
    year_gan, year_ji = get_year_pillar(lunar_date.year)
    day_gan, day_ji = get_day_pillar(birth_date)  # 양력 기준
    month_gan, month_ji = get_month_pillar(birth_date, year_gan)  # 양력 기준
    hour_gan, hour_ji = get_hour_pillar(day_gan, hour, minute)

    ilgan_idx = CHEONGAN.index(day_gan)

    def pillar_data(gan, ji, position):
        if gan is None:
            return {'gan': None, 'ji': None, 'sipshin_gan': None, 'sipshin_ji': None,
                    'jijangan': [], 'unseong': None, 'naeum': None,
                    'gan_euyang': None, 'ji_euyang': None}
        gan_idx = CHEONGAN.index(gan)
        ji_euyang = JIJI_EUYANG[JIJI.index(ji)] if ji else None
        return {
            'gan': gan, 'ji': ji,
            'gan_euyang': CHEONGAN_EUYANG[gan_idx],
            'ji_euyang': ji_euyang,
            'sipshin_gan': '일간(나)' if position == '일' else get_sipshin(ilgan_idx, gan_idx),
            'sipshin_ji': get_sipshin_for_jiji(ilgan_idx, ji) if ji else None,
            'jijangan': get_jijangan_with_sipshin(ilgan_idx, ji) if ji else [],
            'unseong': get_unseong(day_gan, ji) if ji else None,
            'naeum': get_naeum(gan, ji) if ji else None,
        }

    pillars = {
        '년주': pillar_data(year_gan, year_ji, '년'),
        '월주': pillar_data(month_gan, month_ji, '월'),
        '일주': pillar_data(day_gan, day_ji, '일'),
        '시주': pillar_data(hour_gan, hour_ji, '시'),
    }

    all_jiji = [p['ji'] for p in pillars.values() if p['ji']]
    oheng_dist = get_oheng_distribution([
        {'gan': p['gan'], 'ji': p['ji']} for p in pillars.values()
    ])
    relations = get_all_relations(all_jiji)

    # Get daeun result (now returns dict) - 양력 기준으로 대운 계산
    daeun_result = get_daeun(birth_date, gender, year_gan, year_ji, month_gan, month_ji)

    # Add sipshin to each daeun entry
    for d in daeun_result['daeun']:
        gan_idx = CHEONGAN.index(d['gan'])
        d['sipshin_gan'] = get_sipshin(ilgan_idx, gan_idx)
        d['sipshin_ji'] = get_sipshin_for_jiji(ilgan_idx, d['ji'])

    return {
        'pillars': pillars,
        'oheng': oheng_dist,
        'relations': relations,
        'daeun': daeun_result['daeun'],
        'daeun_start': daeun_result['start_age'],
        'daeun_direction': daeun_result['direction'],
        'year_gan': year_gan,
        'ilgan': day_gan,
    }
