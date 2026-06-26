# saju/core.py
from datetime import date as Date, datetime
from saju.pillars import get_year_pillar, get_month_pillar, get_day_pillar, get_hour_pillar
from saju.kr_timezone import to_canonical_kst
from saju.analysis import (
    get_sipshin, get_sipshin_for_jiji, get_jijangan_with_sipshin,
    get_unseong, get_naeum, get_oheng_distribution
)
from saju.relations import get_all_relations
from saju.daeun import get_daeun
from saju.constants import CHEONGAN, JIJI, CHEONGAN_EUYANG, JIJI_EUYANG


def calculate_saju(
    birth_date: Date,
    hour: int | None,
    minute: int | None,
    gender: str,
) -> dict:
    """생년월일시 → 사주팔자 전체 데이터 반환.

    입력 birth_date는 양력. hour/minute는 출생증명서 기재 시각.
    한국 역사 표준시 보정(DST, UTC+8:30)을 자동 적용.
    """
    has_time = hour is not None
    h = hour if has_time else 12   # 시간 미입력 시 정오로 가정
    m = minute if minute is not None else 0

    birth_dt_raw = datetime(birth_date.year, birth_date.month, birth_date.day, h, m)

    # 시간 미입력이면 시간대 보정 생략 (정오 기준으로 절기 경계 비교)
    birth_dt = to_canonical_kst(birth_dt_raw) if has_time else birth_dt_raw

    year_gan, year_ji   = get_year_pillar(birth_dt)
    day_gan,  day_ji    = get_day_pillar(birth_dt)
    month_gan, month_ji = get_month_pillar(birth_dt, year_gan)
    hour_gan, hour_ji   = get_hour_pillar(day_gan, birth_dt if has_time else None)

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
        '일주': pillar_data(day_gan,  day_ji,  '일'),
        '시주': pillar_data(hour_gan, hour_ji, '시'),
    }

    all_jiji = [p['ji'] for p in pillars.values() if p['ji']]
    oheng_dist = get_oheng_distribution([
        {'gan': p['gan'], 'ji': p['ji']} for p in pillars.values()
    ])
    relations = get_all_relations(all_jiji)

    daeun_result = get_daeun(birth_dt, gender, year_gan, year_ji, month_gan, month_ji)

    for d in daeun_result['daeun']:
        gan_idx = CHEONGAN.index(d['gan'])
        d['sipshin_gan'] = get_sipshin(ilgan_idx, gan_idx)
        d['sipshin_ji']  = get_sipshin_for_jiji(ilgan_idx, d['ji'])

    return {
        'pillars':         pillars,
        'oheng':           oheng_dist,
        'relations':       relations,
        'daeun':           daeun_result['daeun'],
        'daeun_start':     daeun_result['start_age'],
        'daeun_direction': daeun_result['direction'],
        'year_gan':        year_gan,
        'ilgan':           day_gan,
    }
