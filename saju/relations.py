"""형충회합, 신살 계산 모듈."""
from saju.constants import CHEONGAN, JIJI

# 육합 (六合)
YUKHAM_PAIRS = {
    frozenset(['子', '丑']): '土',
    frozenset(['寅', '亥']): '木',
    frozenset(['卯', '戌']): '火',
    frozenset(['辰', '酉']): '金',
    frozenset(['巳', '申']): '水',
    frozenset(['午', '未']): '土',
}

# 삼합 (三合)
SAMHAP = {
    frozenset(['申', '子', '辰']): '水',
    frozenset(['寅', '午', '戌']): '火',
    frozenset(['亥', '卯', '未']): '木',
    frozenset(['巳', '酉', '丑']): '金',
}

# 방합 (方合)
BANGHAP = {
    frozenset(['寅', '卯', '辰']): '木',
    frozenset(['巳', '午', '未']): '火',
    frozenset(['申', '酉', '戌']): '金',
    frozenset(['亥', '子', '丑']): '水',
}

# 충 (六冲) - 대충 6쌍
CHUNG_PAIRS = [
    ('子', '午'), ('丑', '未'), ('寅', '申'),
    ('卯', '酉'), ('辰', '戌'), ('巳', '亥'),
]

# 형 (刑) - 삼형살 + 자형
HYEONG = [
    frozenset(['寅', '巳', '申']),   # 무은지형
    frozenset(['丑', '戌', '未']),   # 지세지형
    frozenset(['子', '卯']),          # 무례지형
]
JAEHYEONG = ['辰', '午', '酉', '亥']  # 자형

# 파 (破)
PA_PAIRS = [
    ('子', '酉'), ('卯', '午'), ('寅', '亥'),
    ('巳', '申'), ('辰', '丑'), ('未', '戌'),
]

# 해 (害)
HAE_PAIRS = [
    ('子', '未'), ('丑', '午'), ('寅', '巳'),
    ('卯', '辰'), ('申', '亥'), ('酉', '戌'),
]

def get_yukham(jiji_list: list[str]) -> list[str]:
    jiji_set = set(jiji_list)
    result = []
    for pair, oheng in YUKHAM_PAIRS.items():
        if pair.issubset(jiji_set):
            a, b = sorted(pair, key=lambda x: JIJI.index(x))
            result.append(f'{a}{b}합({oheng})')
    return result

def get_samhap(jiji_list: list[str]) -> list[str]:
    jiji_set = set(jiji_list)
    result = []
    for group, oheng in SAMHAP.items():
        if group.issubset(jiji_set):
            members = ''.join(sorted(group, key=lambda x: JIJI.index(x)))
            result.append(f'{members} 삼합({oheng})')
    return result

def get_banghap(jiji_list: list[str]) -> list[str]:
    jiji_set = set(jiji_list)
    result = []
    for group, oheng in BANGHAP.items():
        if group.issubset(jiji_set):
            members = ''.join(sorted(group, key=lambda x: JIJI.index(x)))
            result.append(f'{members} 방합({oheng})')
    return result

def get_chung(jiji_list: list[str]) -> list[str]:
    jiji_set = set(jiji_list)
    result = []
    for a, b in CHUNG_PAIRS:
        if a in jiji_set and b in jiji_set:
            result.append(f'{a}{b}충')
    return result

def get_hyeong(jiji_list: list[str]) -> list[str]:
    jiji_set = set(jiji_list)
    result = []
    for group in HYEONG:
        if group.issubset(jiji_set):
            members = ''.join(sorted(group, key=lambda x: JIJI.index(x)))
            result.append(f'{members}형')
    for ji in JAEHYEONG:
        count = jiji_list.count(ji)
        if count >= 2:
            result.append(f'{ji}{ji}자형')
    return result

def get_pa(jiji_list: list[str]) -> list[str]:
    jiji_set = set(jiji_list)
    return [f'{a}{b}파' for a, b in PA_PAIRS if a in jiji_set and b in jiji_set]

def get_hae(jiji_list: list[str]) -> list[str]:
    jiji_set = set(jiji_list)
    return [f'{a}{b}해' for a, b in HAE_PAIRS if a in jiji_set and b in jiji_set]

def get_all_relations(pillars_jiji: list[str]) -> dict:
    """4개 지지의 모든 형충회합 계산."""
    return {
        'yukham': get_yukham(pillars_jiji),
        'samhap': get_samhap(pillars_jiji),
        'banghap': get_banghap(pillars_jiji),
        'chung': get_chung(pillars_jiji),
        'hyeong': get_hyeong(pillars_jiji),
        'pa': get_pa(pillars_jiji),
        'hae': get_hae(pillars_jiji),
    }
