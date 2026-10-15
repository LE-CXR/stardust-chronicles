---
name: chem-stardust-periodic
description: Iterate 星尘编年史, a static Chinese periodic-table site. Use when changing its narrative, element archive, spectra, flame colors, layout, or GitHub Pages build. Never invent atomic weights, wavelengths, or uses.
---

# 星尘编年史

这是一个无构建的中文静态站。改完要仍能双击 `index.html` 打开。

## 先看哪里

| 想改什么 | 文件 |
| --- | --- |
| 开场句子、粒子阶段 | `js/intro.js` 的 `SCENES` |
| 七章故事 | `data/story.js` |
| 布局、颜色、手机面板 | `css/styles.css` |
| 点击、搜索、档案排版 | `js/app.js` |
| 原子量、用途、焰色、物态、类别 | `tools/build_elements.py` |
| 可见强线 | `data/spectra.json`，然后重新生成 |
| 基态组态 | `data/configs.json`，然后重新生成 |

页面不读 JSON。生成物是 `data/elements.js`（和一份对照用的 `data/elements.json`）。

```bash
python3 tools/build_elements.py
python3 tools/validate_elements.py
```

校验要确认：118 个元素、电子数等于原子序数、格子不重叠、谱线在 380–780 nm、故事里的原子序数都存在。

## 不许编的东西

- 原子量只维护 CIAAW 简约标准原子量。没有标准值就保持 `null`，界面写「无标准原子量」。
- 谱线只来自 NIST 强线表的空气波长。手册没有的元素，`lines` 用空数组。
- 焰色白名单在 `build_elements.py` 的 `FLAME`。要新增一种，先写出文献依据，并说明色块只是示意。
- 用途写共识，不写想象中的应用。Z ≥ 104 保持「没有日常或工业用途」。
- 人体百分比只放在故事第五章，不要写进每个元素的精确字段。
- 电子层图是主量子数计数。不要把它画成或说成真实轨道。

组态改完后，生成脚本会检查若干著名例外（Cr、Cu、Pd、Au、Th、U、Lr）。Lr 必须仍是 `[Rn] 5f14 7s2 7p1`，状态为 `calculated`。Darmstadtium 的中文名是鐽（U+943D），不是 U+941D。

## 界面约定

- 中文界面。深色底、黄铜色线条。类别用左边线区分，不要换成高饱和整格底色。
- 桌面：表格在左，档案粘在右侧。宽度低于 1100px：档案改为底部面板。
- 窄屏默认横向滚动（格子大约 47px）。「星图」才把 18 列压进屏幕。
- 开场可以跳过。`#Fe` 这种锚点直接打开该元素并跳过开场。
- 「声音」按钮只说明音频未做。不要接一个空的 Audio 假装在播。

## 字体

`fonts/chronicle-sans-400.woff2`、`chronicle-sans-700.woff2` 来自 Noto Sans CJK SC 子集，覆盖界面用字和四个扩展 B 汉字。`chronicle-serif-600.woff2` 是 Noto Serif SC 子集，用于标题。许可证是 `fonts/OFL.txt`。加了新汉字却显示成方框时，用同一批源字体重新子集，把新字符加进去。

## 自测

```bash
python3 -m http.server 8741
```

看三件事：`/` 的开场能进表；`/#Na` 有两条 D 线和「亮黄」焰色；`/#Og` 原子量为「无标准原子量」、谱线为空。手机宽度约 390px 时，关掉档案后表格能横滑，点一个元素会弹出底部面板。
