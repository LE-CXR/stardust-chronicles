# 星尘编年史 · 站点交互 SFX 规格

给站点实现（Claude）用。品味：**纸质仪器 / 轻点选**，不要游戏音效、不要电子合成枪感、不要长尾混响盖住内容。

原则：
- 一切 hit **落在同帧视觉变化上**（选中 rim、开档案、切章）。
- **不要泥巴 BGM**：若有底噪，只作极轻环境；hits 必须可辨。
- 禁止空 `<Audio>` 假装播放；文件缺失就静默并记日志。
- 音量默认保守；用户「声音」面板可调。

角色锚点（成片与站点共用）——**点击按族类 10 种**：

| 族类 `category` | 听感性格 | 建议时长 | 样本文件 |
| --- | --- | --- | --- |
| alkali | 暖橙焰色 tick | 120–160 ms | `assets/sfx/cat-alkali.wav` |
| alkaline | 略低暖 tick | 130–160 ms | `assets/sfx/cat-alkaline.wav` |
| transition | 软金属一击 | 180–240 ms | `assets/sfx/cat-transition.wav` |
| post | 钝金属轻敲 | 160–220 ms | `assets/sfx/cat-post.wav` |
| metalloid | 玻璃质中频 | 140–180 ms | `assets/sfx/cat-metalloid.wav` |
| nonmetal | 木质/空气短触 | 110–150 ms | `assets/sfx/cat-nonmetal.wav` |
| halogen | 锐亮 tick | 100–140 ms | `assets/sfx/cat-halogen.wav` |
| noble | 气态空灵轻叩 | 140–180 ms | `assets/sfx/cat-noble.wav` |
| lanthanide | 暗色微闪 | 150–200 ms | `assets/sfx/cat-lanthanide.wav` |
| actinide | 低沉空洞 | 140–180 ms | `assets/sfx/cat-actinide.wav` |

生成：`python tools/gen_cat_sfx.py`

---

## 事件表

| 事件 ID | 触发时机 | 声音性格 | 时长 ms | 音量建议 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `ui.select.<category>` | 点选周期表格子，金边 rim 同帧 | 对应 `cat-<category>.wav`（同族同声，共 10 种） | 100–240 | 0.34–0.44 | category 见上表；缺样本回落 procedural |
| `ui.select` | 未知族类兜底 | dry select click / `select-click.wav` | 90–130 | 0.35–0.45 | 仅 map 缺失时 |
| `ui.select.empty` | 无 category 兜底 | Og hollow / procedural empty | 120–180 | 0.32–0.42 | 正常点选走族类音 |
| `ui.deselect` | 关闭档案 / 取消选中 | 更轻的 reverse-tick 或 半音量 select | 60–90 | 0.18–0.28 | 勿喧宾夺主 |
| `ui.hover`（可选） | 桌面悬停格子 | 极轻 tick（几乎无 crackle） | 40–70 | 0.08–0.14 | 默认可关；移动端勿播 |
| `panel.open` | 元素档案面板滑入完成点 | soft whoosh（短）+ 轻 click | 180–260 | 0.22–0.32 | whoosh 勿盖字 |
| `panel.tab` | 档案内切换「谱线 / 用途 / …」 | select-click 变体 | 80–110 | 0.25–0.35 | |
| `search.commit` | 搜索命中并跳格 | Na-tick 或 select-click | 100–140 | 0.30–0.40 | |
| `search.miss` | 无结果 | Og hollow tap（更短） | 80–120 | 0.22–0.30 | |
| `mode.story` | 切到「看故事」 | soft swell 头 + click | 200–400 | 0.20–0.30 | swell 极轻 |
| `mode.explore` | 切到「自由探索」 | select-click | 90–120 | 0.25–0.35 | |
| `chapter.enter` | 故事章标题卡切入 | soft whoosh-cut | 180–240 | 0.28–0.38 | 与标题同帧 |
| `chapter.mark` | 章内重点元素高亮 | 按元素角色：Na / Au / Og | 120–320 | 0.30–0.45 | |
| `film.cut` | 开场影片硬切 | whoosh-cut 或 bass-hit（重切） | 200–450 | 0.35–0.55 | 与画面 cut 同帧 |
| `film.bass` | 重元素 / 超新星等「砸进来」 | soft bass hit（低频短体） | 350–500 | 0.40–0.55 | 勿拖泥带水长尾 |
| `film.au-punch` | Au / 重元素 punch 卡 | **Au** metallic soft hit | 280–360 | 0.45–0.55 | 本 30s 片 t=22.00 |
| `data.badge` | 展示 CIAAW / NIST 徽章 | 轻 select 或 Og-tap（若强调「空」） | 100–160 | 0.22–0.32 | 徽章是来源标记，非数值 |
| `data.empty` | UI 明示「无标准值 / 谱线空」 | **Og** hollow tap | 120–180 | 0.28–0.38 | 与文案同帧 |

---

## 实现提示

1. 预加载上述短 WAV（或从同源 procedural 生成后缓存）；首次手势后再 `AudioContext.resume()`。
2. 同一事件 80ms 内去抖，避免扫表连响。
3. 影片床轨参考：`assets/sfx/demo-30s-bed.wav`（hits 已钉在 0.85 / 2.85 / 6.00 / 9.20 / 14.00 / 22.00 / 26.00 / 27.85 s）。
4. 重新生成样例：`python tools/gen_cat_sfx.py`（10 族点击）。
5. 禁止用长垫乐盖住 hits；若加 BGM，侧链/闪避 hits，或把 BGM 压到 hits 下 −12 dB 以上。

---

## 30s 成片对照（便于校对）

| 时间 (s) | 画面 | SFX |
| ---: | --- | --- |
| 0.15 | 黑场起 soft swell | `swell-soft` |
| 0.85 | 金标题入 | `whoosh-soft` |
| 2.85 | 钩子句 | `select-click` |
| 6.00 | 切到 H | `whoosh-cut` + **Na** tick |
| 9.20 | 金边选中隐喻 | `select-click` |
| 14.00 | 切到 Fe | `bass-hit` + whoosh |
| 22.00 | 切到 Au 三联 | **Au** metal hit |
| 26.00 | 「可核对」 | **Au**（轻） |
| 27.85 | 尾卡徽章 / 留空 | **Og** hollow tap |
