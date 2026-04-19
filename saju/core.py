# saju/core.py
from datetime import date as Date
from saju.pillars import get_year_pillar, get_month_pillar, get_day_pillar, get_hour_pillar
from saju.analysis import (
    get_sipshin, get_sipshin_for_jiji, get_jijangan_with_sipshin,
    get_unseong, get_naeum, get_oheng_distribution
)
from saju.relations import get_all_relations
from saju.daeun import get_daeun
from saju.constants import CHEONGAN

def calculate_saju(
    birth_date: Date,
    hour: int | None,
    minute: int | None,
    gender: str,
) -> dict:
    """생년월일시 → 사주팔자 전체 데이터 반환"""
    year_gan, year_ji = get_year_pillar(birth_date.year)
    day_gan, day_ji = get_day_pillar(birth_date)
    month_gan, month_ji = get_month_pillar(birth_date, year_gan)
    hour_gan, hour_ji = get_hour_pillar(day_gan, hour, minute)

    ilgan_idx = CHEONGAN.index(day_gan)

    def pillar_data(gan, ji, position):
        if gan is None:
            return {'gan': None, 'ji': None, 'sipshin_gan': None, 'sipshin_ji': None,
                    'jijangan': [], 'unseong': None, 'naeum': None}
        gan_idx = CHEONGAN.index(gan)
        return {
            'gan': gan, 'ji': ji,
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

    # Get daeun result (now returns dict)
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
