#!/usr/bin/env python3
"""Build data/elements.json and data/elements.js for 星尘编年史.

Editorial facts live in this file. Visible wavelengths live in data/spectra.json,
curated from the NIST Handbook of Basic Atomic Spectroscopic Data.
Electron configurations live in data/configs.json.

Do not hand-edit the generated files. Change this script (or the inputs) and rerun:
    python3 tools/build_elements.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

ZH_MAIN = (
    "氢 氦 锂 铍 硼 碳 氮 氧 氟 氖 钠 镁 铝 硅 磷 硫 氯 氩 钾 钙 "
    "钪 钛 钒 铬 锰 铁 钴 镍 铜 锌 镓 锗 砷 硒 溴 氪 铷 锶 钇 锆 "
    "铌 钼 锝 钌 铑 钯 银 镉 铟 锡 锑 碲 碘 氙 铯 钡 镧 铈 镨 钕 "
    "钷 钐 铕 钆 铽 镝 钬 铒 铥 镱 镥 铪 钽 钨 铼 锇 铱 铂 金 汞 "
    "铊 铅 铋 钋 砹 氡 钫 镭 锕 钍 镤 铀 镎 钚 镅 锔 锫 锎 锿 镄 "
    "钔 锘 铹"
).split()

ZH_SUPER = {
    104: "\u946a",       # 鑪
    105: "\U000289c0",  # 𨧀
    106: "\U00028b4e",  # 𨭎
    107: "\U00028a0f",  # 𨨏
    108: "\U00028b46",  # 𨭆
    109: "\u4951",       # 䥑
    110: "\u943d",       # 鐽
    111: "\u9300",       # 錀
    112: "\u93b6",       # 鎶
    113: "\u9268",       # 鉨
    114: "\u9207",       # 鈇
    115: "\u9546",       # 镆
    116: "\u925d",       # 鉝
    117: "\u9fec",       # 鿬
    118: "\u9feb",       # 鿫
}

READING = {
    104: "lú",
    105: "dù",
    106: "xǐ",
    107: "bō",
    108: "hēi",
    109: "mài",
    110: "dá",
    111: "lún",
    112: "gē",
    113: "nǐ",
    114: "fū",
    115: "mò",
    116: "lì",
    117: "tián",
    118: "ào",
}

EN = (
    "hydrogen helium lithium beryllium boron carbon nitrogen oxygen fluorine neon "
    "sodium magnesium aluminium silicon phosphorus sulfur chlorine argon potassium calcium "
    "scandium titanium vanadium chromium manganese iron cobalt nickel copper zinc "
    "gallium germanium arsenic selenium bromine krypton rubidium strontium yttrium zirconium "
    "niobium molybdenum technetium ruthenium rhodium palladium silver cadmium indium tin "
    "antimony tellurium iodine xenon caesium barium lanthanum cerium praseodymium neodymium "
    "promethium samarium europium gadolinium terbium dysprosium holmium erbium thulium ytterbium "
    "lutetium hafnium tantalum tungsten rhenium osmium iridium platinum gold mercury "
    "thallium lead bismuth polonium astatine radon francium radium actinium thorium "
    "protactinium uranium neptunium plutonium americium curium berkelium californium "
    "einsteinium fermium mendelevium nobelium lawrencium rutherfordium dubnium seaborgium "
    "bohrium hassium meitnerium darmstadtium roentgenium copernicium nihonium flerovium "
    "moscovium livermorium tennessine oganesson"
).split()

# CIAAW abridged standard atomic weights, as published on ciaaw.org (table dated 2024,
# based on the Atomic Weights 2021 report, including the 2024 revisions of Zr, Gd, Lu).
# Interval is present only when the standard atomic weight itself is an interval.
ABRIDGED_RAW = """
1 1.0080 ± 0.0002 | [1.00784, 1.00811]
2 4.0026 ± 0.0001 |
3 6.94 ± 0.06 | [6.938, 6.997]
4 9.0122 ± 0.0001 |
5 10.81 ± 0.02 | [10.806, 10.821]
6 12.011 ± 0.002 | [12.0096, 12.0116]
7 14.007 ± 0.001 | [14.00643, 14.00728]
8 15.999 ± 0.001 | [15.99903, 15.99977]
9 18.998 ± 0.001 |
10 20.180 ± 0.001 |
11 22.990 ± 0.001 |
12 24.305 ± 0.002 | [24.304, 24.307]
13 26.982 ± 0.001 |
14 28.085 ± 0.001 | [28.084, 28.086]
15 30.974 ± 0.001 |
16 32.06 ± 0.02 | [32.059, 32.076]
17 35.45 ± 0.01 | [35.446, 35.457]
18 39.95 ± 0.16 | [39.792, 39.963]
19 39.098 ± 0.001 |
20 40.078 ± 0.004 |
21 44.956 ± 0.001 |
22 47.867 ± 0.001 |
23 50.942 ± 0.001 |
24 51.996 ± 0.001 |
25 54.938 ± 0.001 |
26 55.845 ± 0.002 |
27 58.933 ± 0.001 |
28 58.693 ± 0.001 |
29 63.546 ± 0.003 |
30 65.38 ± 0.02 |
31 69.723 ± 0.001 |
32 72.630 ± 0.008 |
33 74.922 ± 0.001 |
34 78.971 ± 0.008 |
35 79.904 ± 0.003 | [79.901, 79.907]
36 83.798 ± 0.002 |
37 85.468 ± 0.001 |
38 87.62 ± 0.01 |
39 88.906 ± 0.001 |
40 91.222 ± 0.003 |
41 92.906 ± 0.001 |
42 95.95 ± 0.01 |
43 — |
44 101.07 ± 0.02 |
45 102.91 ± 0.01 |
46 106.42 ± 0.01 |
47 107.87 ± 0.01 |
48 112.41 ± 0.01 |
49 114.82 ± 0.01 |
50 118.71 ± 0.01 |
51 121.76 ± 0.01 |
52 127.60 ± 0.03 |
53 126.90 ± 0.01 |
54 131.29 ± 0.01 |
55 132.91 ± 0.01 |
56 137.33 ± 0.01 |
57 138.91 ± 0.01 |
58 140.12 ± 0.01 |
59 140.91 ± 0.01 |
60 144.24 ± 0.01 |
61 — |
62 150.36 ± 0.02 |
63 151.96 ± 0.01 |
64 157.25 ± 0.01 |
65 158.93 ± 0.01 |
66 162.50 ± 0.01 |
67 164.93 ± 0.01 |
68 167.26 ± 0.01 |
69 168.93 ± 0.01 |
70 173.05 ± 0.02 |
71 174.97 ± 0.01 |
72 178.49 ± 0.01 |
73 180.95 ± 0.01 |
74 183.84 ± 0.01 |
75 186.21 ± 0.01 |
76 190.23 ± 0.03 |
77 192.22 ± 0.01 |
78 195.08 ± 0.02 |
79 196.97 ± 0.01 |
80 200.59 ± 0.01 |
81 204.38 ± 0.01 | [204.382, 204.385]
82 207.2 ± 1.1 | [206.14, 207.94]
83 208.98 ± 0.01 |
84 — |
85 — |
86 — |
87 — |
88 — |
89 — |
90 232.04 ± 0.01 |
91 231.04 ± 0.01 |
92 238.03 ± 0.01 |
93 — |
94 — |
95 — |
96 — |
97 — |
98 — |
99 — |
100 — |
101 — |
102 — |
103 — |
104 — |
105 — |
106 — |
107 — |
108 — |
109 — |
110 — |
111 — |
112 — |
113 — |
114 — |
115 — |
116 — |
117 — |
118 — |
"""

# Qualitative flame colors used in teaching labs and classical analysis.
# swatch is a display stand-in, not a measured chromaticity.
FLAME = {
    3: ("胭脂红", "#d23b4a", "锂盐。中学与定性分析里最常演示的焰色之一。"),
    5: ("亮绿", "#3cbf45", "挥发性硼化合物，例如硼酸酯。不是把单质硼丢进火里那么简单。"),
    11: ("亮黄", "#f2d34b", "钠。D 线极强，痕量钠就能把别的颜色盖住。"),
    19: ("浅紫", "#c9a4dc", "钾。常要隔着钴玻璃看，否则会被钠的黄线淹没。"),
    20: ("砖红", "#e06a3a", "钙。眼睛看到的橙红，很大一部分来自 CaOH 等分子带。"),
    29: ("蓝绿", "#2fbfae", "铜的卤化物常见蓝绿；不含卤素的二价铜盐可能更偏绿。"),
    37: ("紫红", "#b14b8a", "铷。本生和基尔霍夫当年就是靠这条颜色把它找出来的。"),
    38: ("猩红", "#d4253c", "锶。焰火里的红色常用锶盐，颜色同样受分子带影响。"),
    49: ("靛蓝", "#3d4db5", "铟。早期光谱学里，这条蓝线很显眼。"),
    55: ("蓝紫", "#6d63d6", "铯。和铷一起，在 1860 年前后靠焰色与光谱被发现。"),
    56: ("苹果绿色", "#8fce45", "钡。颜色偏淡，很容易被钠掩盖。可溶钡盐有毒。"),
    81: ("纯绿", "#1ea84a", "铊。只记录文献中的焰色，不提供任何实验步骤。铊盐剧毒。"),
}

SPECTRUM_NOTES = {
    1: "可见区这几条是巴耳末系。空气波长，来自 NIST 强线表，不是全部谱线。",
    11: "黄色几乎来自紧挨着的两条 D 线。图上会叠在一起，所以下面把波长分开写。",
    19: "浅紫色来自紫端谱线和近红端谱线一起进入眼睛。表上的相对强度不等于视亮度。",
    20: "砖红焰色主要来自分子带。下面这些是原子或离子的强线，不是那条色带本身。",
    29: "蓝绿焰色多与 CuCl 等分子带有关。强线表在可见区最强的一批是 Cu II，所以色带不一定是绿的。",
    38: "猩红焰色很大程度来自分子带。原子强线里反而有很亮的蓝线。",
    56: "绿焰色和 BaOH 等分子带有关，553.5 nm 附近也有一条强的中性原子线。",
}

BODY = {
    1: "水，以及几乎所有有机分子里都有氢。",
    6: "有机分子的骨架。",
    7: "蛋白质、核酸里的氮。",
    8: "水的一部分。按质量计，也是人体里最多的元素。",
    11: "细胞外液里的主要阳离子之一。",
    12: "骨骼里有镁，许多酶也需要它。",
    15: "骨骼、ATP 和核酸。",
    16: "半胱氨酸、甲硫氨酸一类含硫分子。",
    17: "体液里的氯离子。",
    19: "细胞内的主要阳离子。",
    20: "骨骼和牙齿里的钙，也参与细胞信号。",
    26: "血红蛋白里的铁。按质量只是微量，但没有它，氧运不走。",
    29: "多种酶需要微量的铜。",
    30: "多种酶需要微量的锌。",
    34: "硒是必需微量元素，量很小。",
    53: "甲状腺激素需要碘。",
}

CAUTION = {
    4: "铍和可溶性铍化合物有毒，粉尘尤其危险。",
    24: "不锈钢里的铬是常见材料。六价铬化合物有毒，不要把两者混成一件事。",
    33: "许多砷化合物有毒。",
    48: "镉有毒，不少传统用途已被限制。",
    76: "四氧化锇剧毒。金属锇本身不是日用品。",
    80: "汞有毒。体温计、牙科汞齐一类用途正在退出日常。",
    81: "铊盐剧毒。",
    82: "铅有毒。油漆和汽油里的历史用途已被严格限制。",
    84: "钋剧毒。",
    92: "铀既有化学毒性，也有放射性。",
    94: "钚有化学毒性，并且放射性很强。",
}

USES = {
    1: "合成氨、炼油加氢、燃料电池，以及作为火箭燃料的液氢。",
    2: "给磁共振的超导磁体降温，也用作深潜呼吸混合气和气相色谱的载气。",
    3: "锂电池，特种玻璃和润滑脂。一些锂盐在严格监护下用于治疗双相情感障碍。",
    4: "航空航天里的铍合金，以及 X 射线窗。用量不大，但很难被替代。",
    5: "硼硅玻璃、洗涤剂里的硼砂，以及反应堆里吸收中子的材料。",
    6: "有机化学和生命的骨架。石墨、金刚石、碳纤维，还有钢铁里的碳，都是它。",
    7: "合成氨和化肥，液氮制冷。蛋白质和核酸也以氮为原料。",
    8: "呼吸、炼钢、医疗用氧，以及水的组成。",
    9: "含氟聚合物、牙膏和饮水氟化中使用的氟化物。单质氟腐蚀性极强。",
    10: "霓虹灯、氦氖激光，以及低温制冷。",
    11: "食盐、纯碱、烧碱，还有橙色的钠灯。",
    12: "轻质合金。燃烧时发出刺眼白光，也因此用在烟火里。叶绿素的中心是镁。",
    13: "轻质结构、包装箔、导线和门窗。地壳里很富，但要靠电解才能大规模得到。",
    14: "芯片和太阳能电池，也是玻璃、混凝土和石英的主角。",
    15: "磷肥。磷酸、阻燃剂和火柴的历史都与它有关。生命里它在 ATP 和核酸中。",
    16: "硫酸工业的原料，橡胶硫化，也出现在火药和许多矿物里。",
    17: "饮用水消毒、聚氯乙烯，以及食盐电解制得的氯气。",
    18: "焊接保护气，也填充白炽灯和中空玻璃。",
    19: "钾肥。人体的神经和肌肉依赖钾离子，但那是离子，不是金属钾。",
    20: "水泥、石灰、石膏。骨骼的矿物部分主要是钙的磷酸盐。",
    21: "铝钪合金让结构更强。金属卤化物灯里也能见到钪。",
    22: "航空零件和骨植入常用钛合金。白色颜料里的二氧化钛更常见。",
    23: "炼钢时加入的合金元素。硫酸工业里，五氧化二钒是经典催化剂。",
    24: "不锈钢和镀铬。",
    25: "炼钢时用来脱氧、脱硫。干电池里常见二氧化锰。",
    26: "钢铁。血液把氧送走，靠的是血红蛋白里的铁。",
    27: "锂离子电池的正极材料、高温合金。维生素 B12 的中心是钴。",
    28: "不锈钢、硬币合金、电镀和加氢催化剂。",
    29: "电线、电机、黄铜和青铜。",
    30: "镀锌防锈、黄铜，以及人体需要的微量锌。",
    31: "砷化镓一类半导体，还有熔点低到可以握在手里融化的镓合金。",
    32: "光纤、红外光学。早期晶体管也曾用锗。",
    33: "半导体掺杂。木材防腐是它声名狼藉的历史用途，许多地方已经禁止。",
    34: "玻璃脱色，以及光伏材料。人体只需要微量的硒。",
    35: "阻燃剂和卤化银感光材料。单质溴是红棕色液体。",
    36: "一些高端中空玻璃和灯，以及准分子激光。",
    37: "原子钟和特种玻璃的研究材料。没有大规模的日用金属市场。",
    38: "焰火的红色。老式阴极射线管玻璃里曾大量使用锶。",
    39: "钇铝石榴石激光晶体，红色荧光粉里也有钇。",
    40: "核燃料的锆合金包壳，以及氧化锆陶瓷。",
    41: "超导磁体里的铌钛、铌锡合金，也加进高强度钢。",
    42: "合金钢，炼油加氢脱硫催化剂。固氮酶需要钼。",
    43: "没有稳定同位素。核医学显像广泛使用锝-99m。",
    44: "硬质电触点和一些催化剂。用量小，价格高。",
    45: "汽车尾气催化剂，以及反光好的镀层。",
    46: "汽车催化剂、电子浆料和加氢反应。牙科合金里也有钯。",
    47: "导体、首饰、感光历史材料。银离子也被用在一些抗菌涂层里。",
    48: "镍镉电池和某些颜料是它的历史主场，正在退场。",
    49: "触摸屏上的铟锡氧化物，以及低熔点焊料。",
    50: "焊锡、镀锡钢板和青铜。",
    51: "阻燃剂里的氧化锑，铅酸电池的合金。",
    52: "热电材料和合金添加剂。碲化镉薄膜太阳能是另一条工业线，其中的镉有毒。",
    53: "消毒碘伏，甲状腺激素，以及卤化银感光。",
    54: "闪光灯、一部分汽车大灯、离子推进器。麻醉研究里也用过氙。",
    55: "原子钟。钻井液里会用到甲酸铯。",
    56: "医学造影用的硫酸钡几乎不溶，所以能吞服。可溶的钡盐则有毒。也用于钻井泥浆和绿色焰火。",
    57: "高折射率光学玻璃，镍氢电池的合金。",
    58: "抛光粉、汽车尾气催化剂，以及打火石合金。",
    59: "稀土永磁和特种玻璃的着色。",
    60: "钕铁硼永磁体，也用于激光晶体。",
    61: "没有稳定同位素。夜光涂料和微型核电池是它日渐退出的历史用途。",
    62: "钐钴磁体。核反应堆里也用钐吸收中子。",
    63: "红色和蓝色荧光粉里的铕。",
    64: "一些钆配合物用作磁共振造影剂，使用受严格规范。也用来吸收中子。",
    65: "绿色荧光粉，以及磁致伸缩材料。",
    66: "加进钕铁硼磁体，让它在更高温度下仍保持磁性。",
    67: "钬激光和特种磁性材料。工业用量很小。",
    68: "光纤放大器里的铒，让光信号在石英纤维里被重新放大。",
    69: "便携设备里的小众激光和放射源。没有大众消费品级的金属市场。",
    70: "光纤激光，以及少量不锈钢添加剂。",
    71: "PET 探测器里的硅酸镥一类晶体。用量小，但很关键。",
    72: "核反应堆控制棒和高温合金。它总是和锆埋在一起，分开它们很费劲。",
    73: "手机等设备里的钽电容器，以及耐腐蚀的化工设备。",
    74: "白炽灯灯丝和硬质合金刀具。熔点在金属里名列前茅。",
    75: "航空发动机的高温合金，石油重整催化剂。",
    76: "极密、极硬。少数电触点用它。显微染色用的是它的四氧化物，那是另一回事。",
    77: "坩埚、火花塞尖端。米和千克的历史原器里有铂铱合金。",
    78: "汽车催化剂、首饰和实验室器皿。抗癌药顺铂里也有铂。",
    79: "首饰和储备，电子工业里的触点与键合线。",
    80: "温度计、气压计、牙科汞齐和氯碱工业是它的历史角色。",
    81: "曾用于红外光学。杀虫则是它最危险的历史用途。",
    82: "铅酸电池仍是主要去处。焊料、汽油和油漆中的铅已经不再是正当的日常用法。",
    83: "低熔点合金、无铅焊料，以及某些胃药里的铋盐。",
    84: "静电消除等场合的放射源。没有安全的日用场景。",
    85: "没有日常或工业用途。从未获得过看得见的一块样品，性质多半来自推测。",
    86: "不是工业原料。室内氡气是环境辐射里被认真对待的一项，不是一种产品。",
    87: "没有用途。半衰期太短，得不到可称量的样品。",
    88: "夜光涂料和早期放疗是它的历史。这些用途已经退出日常生活。",
    89: "研究用。没有日用品。",
    90: "气灯纱罩曾用硝酸钍。钍基核燃料主要仍停留在研究和少量实践。",
    91: "没有工业用途。",
    92: "核电站的燃料。釉料着色是已经放弃的历史用法。",
    93: "研究用，也出现在钚-238 的生产链上。没有日用。",
    94: "核燃料与核武器中的钚-239。航天器放射性同位素电池使用钚-238。",
    95: "许多烟雾报警器里有微量的镅-241。",
    96: "研究用放射源。没有日用。",
    97: "几乎只为合成更重的元素而制备。没有日用。",
    98: "小型中子源，用于测井和研究。",
    99: "没有工业用途。只在研究中制备过极少量。",
}

SERIES_NOTE = {
    57: "本表按常见教材，把镧放在主表第 3 族。第 3 族究竟包括镧和锕，还是镥和铹，学术界还没有统一裁定。",
    71: "镥常被算进镧系的末尾。也有周期表把镥放进第 3 族、让镧系从镧排到镱。",
    89: "本表按常见教材，把锕放在主表第 3 族。这是排版选择，不是已关闭的学术结论。",
    103: "也有周期表把铹放进第 3 族。本表仍按教材习惯，把铹留在锕系末尾。",
}

CAT_ZH = {
    "alkali": "碱金属",
    "alkaline": "碱土金属",
    "transition": "过渡金属",
    "post": "贫金属",
    "metalloid": "类金属",
    "nonmetal": "非金属",
    "halogen": "卤素",
    "noble": "稀有气体",
    "lanthanide": "镧系",
    "actinide": "锕系",
}


def parse_weights():
    out = {}
    for line in ABRIDGED_RAW.strip().splitlines():
        z_s, rest = line.split(" ", 1)
        z = int(z_s)
        value, _, interval = rest.partition("|")
        value = value.strip()
        interval = interval.strip()
        out[z] = (None if value == "—" else value, interval or None)
    return out


def shells_of(config: str) -> list[int]:
    counts: dict[int, int] = {}
    for n, _sub, e in re.findall(r"(\d)([spdf])(\d+)", config):
        counts[int(n)] = counts.get(int(n), 0) + int(e)
    if not counts:
        raise ValueError(config)
    return [counts.get(i, 0) for i in range(1, max(counts) + 1)]


def positions() -> dict[int, tuple[int, int]]:
    pos: dict[int, tuple[int, int]] = {}

    def put(z: int, row: int, col: int) -> None:
        if (row, col) in pos.values():
            raise SystemExit(f"collision at {row},{col}")
        pos[z] = (row, col)

    put(1, 1, 1)
    put(2, 1, 18)
    side = [1, 2, 13, 14, 15, 16, 17, 18]
    for z, col in zip(range(3, 11), side):
        put(z, 2, col)
    for z, col in zip(range(11, 19), side):
        put(z, 3, col)
    for i, z in enumerate(range(19, 37)):
        put(z, 4, i + 1)
    for i, z in enumerate(range(37, 55)):
        put(z, 5, i + 1)
    main6 = [55, 56, 57] + list(range(72, 87))
    main7 = [87, 88, 89] + list(range(104, 119))
    if len(main6) != 18 or len(main7) != 18:
        raise SystemExit("main row length")
    for i, z in enumerate(main6):
        put(z, 6, i + 1)
    for i, z in enumerate(main7):
        put(z, 7, i + 1)
    for i, z in enumerate(range(58, 72)):
        put(z, 9, 4 + i)
    for i, z in enumerate(range(90, 104)):
        put(z, 10, 4 + i)
    if len(pos) != 118:
        raise SystemExit(len(pos))
    return pos


def category_of(z: int) -> str:
    if z in {3, 11, 19, 37, 55, 87}:
        return "alkali"
    if z in {4, 12, 20, 38, 56, 88}:
        return "alkaline"
    if 57 <= z <= 71:
        return "lanthanide"
    if 89 <= z <= 103:
        return "actinide"
    if z in {5, 14, 32, 33, 51, 52}:
        return "metalloid"
    if z in {9, 17, 35, 53, 85, 117}:
        return "halogen"
    if z in {2, 10, 18, 36, 54, 86, 118}:
        return "noble"
    if z in {1, 6, 7, 8, 15, 16, 34}:
        return "nonmetal"
    if z in {13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116}:
        return "post"
    return "transition"


def block_of(z: int, cat: str) -> str:
    if z == 1 or cat in {"alkali", "alkaline"} or z == 2:
        return "s"
    if z == 103:
        return "p"
    if z in {57, 71, 89, 90}:
        return "d"
    if cat in {"lanthanide", "actinide"}:
        return "f"
    if cat == "transition":
        return "d"
    return "p"


def phase_of(z: int) -> tuple[str | None, str, str | None]:
    """Return phase key, status, note. phase key is gas/liquid/solid/None."""
    if z in {85, 87} or z >= 100:
        return None, "unknown", "没有可称量的宏观样品，常温常压下的物态不作定论。超重元素的液态或固态预测不写进这格。"
    if z in {1, 2, 7, 8, 9, 10, 17, 18, 36, 54, 86}:
        return "gas", "measured", None
    if z in {35, 80}:
        return "liquid", "measured", None
    note = None
    if z >= 93 or z in {43, 61, 84, 88, 89, 91}:
        note = "放射性元素。这里的「固体」指已经制得的宏观样品，不是说它稳定。"
    if z == 99:
        note = "只制备过极少量金属，但可以确认是固体。"
    return "solid", "measured", note


PHASE_ZH = {"gas": "气体", "liquid": "液体", "solid": "固体"}


def shorten(z: int, config: str, configs: dict[int, str], symbols: dict[int, str]) -> str:
    for nz in (86, 54, 36, 18, 10, 2):
        if nz >= z:
            continue
        prefix = configs[nz]
        if config == prefix:
            return config
        if config.startswith(prefix + " "):
            rest = config[len(prefix) + 1 :]
            parts = sorted(rest.split(), key=lambda p: (int(p[0]), "spdf".index(p[1])))
            return f"[{symbols[nz]}] " + " ".join(parts)
    return config


def config_meta(z: int) -> tuple[str, str | None]:
    if z == 103:
        return (
            "calculated",
            "铹的基态常写成 7s2 7p1，而不是早年按族外推的 6d1。这一写法主要来自计算，并有电离能实验的间接支持。",
        )
    if z >= 104:
        return "predicted", "超重元素的基态多为理论预测。不同计算可能把最外层电子放在 6d 或 7s、7p，这里只采用一种常见写法。"
    if z >= 100:
        return "predicted", "从镄往后，基态组态主要来自计算，不是像轻元素那样逐条测完的光谱。"
    return "accepted", None


def main() -> None:
    if len(ZH_MAIN) != 103 or len(EN) != 118:
        raise SystemExit(f"name count zh={len(ZH_MAIN)} en={len(EN)}")
    weights = parse_weights()
    if set(weights) != set(range(1, 119)):
        raise SystemExit("weights incomplete")
    configs = {row["z"]: row["config"] for row in json.loads((DATA / "configs.json").read_text(encoding="utf-8"))}
    spectra = json.loads((DATA / "spectra.json").read_text(encoding="utf-8"))
    pos = positions()
    symbols = {z: EN[z - 1][:1].upper() + EN[z - 1][1:] for z in range(1, 119)}
    # Real symbols, not capitalised English names.
    symbol_by_z = {}
    # Pull symbols from a fixed list paired with EN order via the conventional symbol table.
    conventional = (
        "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn "
        "Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce "
        "Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn "
        "Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl "
        "Mc Lv Ts Og"
    ).split()
    if len(conventional) != 118:
        raise SystemExit("symbols")
    for z, sym in enumerate(conventional, start=1):
        symbol_by_z[z] = sym

    elements = []
    for z in range(1, 119):
        name_zh = ZH_MAIN[z - 1] if z <= 103 else ZH_SUPER[z]
        config = configs[z]
        shell = shells_of(config)
        if sum(shell) != z:
            raise SystemExit(f"electron count {z}: {shell} {config}")
        cat = category_of(z)
        row, col = pos[z]
        weight, interval = weights[z]
        phase, phase_status, phase_note = phase_of(z)
        cfg_status, cfg_note = config_meta(z)
        if z >= 104:
            use = f"没有日常或工业用途。{name_zh}由加速器合成，至今只得到过极少的原子。已有的化学实验非常有限。"
        elif z >= 100:
            use = "没有日常或工业用途。只在核物理实验里得到过极少的原子。"
        else:
            use = USES[z]
        flame = None
        if z in FLAME:
            color, swatch, note = FLAME[z]
            flame = {"color": color, "swatch": swatch, "note": note, "swatchIsApproximate": True}
        lines = spectra.get(symbol_by_z[z], [])
        for line in lines:
            if not (380 <= line["nm"] <= 780):
                raise SystemExit(line)
        period = row if row <= 7 else (6 if row == 9 else 7)
        group = col if row <= 7 else None
        elements.append(
            {
                "z": z,
                "symbol": symbol_by_z[z],
                "nameZh": name_zh,
                "nameEn": EN[z - 1],
                "reading": READING.get(z),
                "period": period,
                "group": group,
                "row": row,
                "col": col,
                "block": block_of(z, cat),
                "category": cat,
                "categoryZh": CAT_ZH[cat],
                "weight": weight,
                "weightInterval": interval,
                "config": config,
                "configShort": shorten(z, config, configs, symbol_by_z),
                "configStatus": cfg_status,
                "configNote": cfg_note,
                "shells": shell,
                "phase": phase,
                "phaseZh": PHASE_ZH.get(phase) if phase else None,
                "phaseStatus": phase_status,
                "phaseNote": phase_note,
                "flame": flame,
                "lines": lines,
                "spectrumNote": SPECTRUM_NOTES.get(z),
                "uses": use,
                "body": BODY.get(z),
                "caution": CAUTION.get(z),
                "seriesNote": SERIES_NOTE.get(z),
            }
        )

    meta = {
        "title": "星尘编年史",
        "generatedBy": "tools/build_elements.py",
        "sources": [
            {
                "id": "ciaaw",
                "title": "CIAAW 简约标准原子量",
                "detail": "ciaaw.org 的 Abridged Standard Atomic Weights（页面标明 2024）。数值来自 Atomic Weights 2021 报告，并包含 2024 年对锆、钆、镥的修订。有区间的元素同时给出标准原子量区间。标为「—」的元素，CIAAW 不给出标准原子量。",
            },
            {
                "id": "config",
                "title": "基态电子组态",
                "detail": "采用与 NIST 原子光谱数据及通行周期表一致的基态组态，并在本地把各亚层电子数加总，核对等于原子序数。壳层图只按主量子数计数，是玻尔式示意，不是轨道真实形状。原子序数大于 99 的组态标注为预测或计算。",
            },
            {
                "id": "nist",
                "title": "NIST 强线表",
                "detail": "可见谱线取自 NIST Handbook of Basic Atomic Spectroscopic Data 的 Strong Lines 表，空气波长，单位由埃换算成纳米。每种元素最多保留 8 条，兼顾强度和在可见区里的分布，并保留钠 D 线这类强双线。这不是完整光谱。相对强度只在同一张表内部比较。砹、钫以及镄以后的元素，该手册没有可用的可见强线，面板会直接说明。",
            },
            {
                "id": "flame",
                "title": "焰色",
                "detail": "只收录定性分析和经典光谱学里反复出现的颜色：锂、硼、钠、钾、钙、铜、铷、锶、铟、铯、钡、铊。色块是给颜色起的示意，不是测色值。钙、锶、钡、铜的肉眼颜色很大程度来自分子带，与原子强线不是同一件事。没有把握的焰色一律留空。",
            },
            {
                "id": "uses",
                "title": "用途",
                "detail": "中文由本项目编写，只写公开工业、医学和教材中的共识性用途。没有稳定用途的元素会写明没有日用，不编造应用场景。",
            },
            {
                "id": "body",
                "title": "人体组成",
                "detail": "故事模式里的百分比是解剖学教材常见的按质量数量级（氧约 65%、碳约 18%、氢约 10%、氮约 3%、钙约 1.5%、磷约 1%）。不同教材差一两个百分点。它们不是临床测量，也不写进元素面板的精确字段。",
            },
        ],
    }

    by_symbol = {el["symbol"]: el for el in elements}
    expect = {
        "H": "1s1",
        "Cr": "[Ar] 3d5 4s1",
        "Cu": "[Ar] 3d10 4s1",
        "Pd": "[Kr] 4d10",
        "La": "[Xe] 5d1 6s2",
        "Ce": "[Xe] 4f1 5d1 6s2",
        "Au": "[Xe] 4f14 5d10 6s1",
        "Th": "[Rn] 6d2 7s2",
        "U": "[Rn] 5f3 6d1 7s2",
        "Lr": "[Rn] 5f14 7s2 7p1",
    }
    for sym, short in expect.items():
        if by_symbol[sym]["configShort"] != short:
            raise SystemExit(f"{sym} config {by_symbol[sym]['configShort']} != {short}")
    if by_symbol["Lr"]["configStatus"] != "calculated":
        raise SystemExit("Lr status")
    if by_symbol["Og"]["phase"] is not None:
        raise SystemExit("Og phase should be unknown")

    (DATA / "elements.json").write_text(
        json.dumps({"meta": meta, "elements": elements}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    payload = json.dumps(elements, ensure_ascii=False, indent=2)
    meta_payload = json.dumps(meta, ensure_ascii=False, indent=2)
    js = (
        "/* Generated by tools/build_elements.py. Do not hand-edit. */\n"
        "window.STARDUST_ELEMENTS = "
        + payload
        + ";\nwindow.STARDUST_META = "
        + meta_payload
        + ";\n"
    )
    (DATA / "elements.js").write_text(js, encoding="utf-8")
    print(f"wrote {len(elements)} elements")


if __name__ == "__main__":
    main()
