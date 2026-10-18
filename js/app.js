/* 星尘编年史 · 周期表、故事模式、元素档案。 */
(function () {
  const ELEMENTS = window.STARDUST_ELEMENTS || [];
  const STORY = window.STARDUST_STORY || { chapters: [] };
  const META = window.STARDUST_META || { sources: [] };
  const byZ = new Map(ELEMENTS.map((el) => [el.z, el]));
  const SHELL = ["K", "L", "M", "N", "O", "P", "Q"];
  const CATS = [
    ["all", "全部", "transparent"],
    ["alkali", "碱金属"],
    ["alkaline", "碱土金属"],
    ["transition", "过渡金属"],
    ["post", "贫金属"],
    ["metalloid", "类金属"],
    ["nonmetal", "非金属"],
    ["halogen", "卤素"],
    ["noble", "稀有气体"],
    ["lanthanide", "镧系"],
    ["actinide", "锕系"],
  ];
  const STATUS = {
    accepted: "常见基态",
    calculated: "计算与间接实验支持",
    predicted: "理论预测",
  };
  const LINE_NAMES = [
    { ion: "H I", nm: 656.285, name: "Hα" },
    { ion: "H I", nm: 486.136, name: "Hβ" },
    { ion: "H I", nm: 434.046, name: "Hγ" },
    { ion: "H I", nm: 410.174, name: "Hδ" },
    { ion: "Na I", nm: 588.995, name: "D₂" },
    { ion: "Na I", nm: 589.592, name: "D₁" },
    { ion: "He I", nm: 587.561, name: "D₃" },
    { ion: "Hg I", nm: 435.833, name: "汞蓝线" },
    { ion: "Hg I", nm: 546.073, name: "汞绿线" },
  ];

  const narrowQuery = window.matchMedia("(max-width: 800px)");
  const desktopQuery = window.matchMedia("(min-width: 1100px)");
  const state = {
    mode: "story",
    chapter: 0,
    z: 1,
    query: "",
    cat: "all",
    density: "detail",
    sheet: false,
  };

  const tableScroll = document.getElementById("table-scroll");
  const table = document.getElementById("table");
  const legend = document.getElementById("legend");
  const storyHost = document.getElementById("story");
  const panel = document.getElementById("panel");
  const backdrop = document.getElementById("backdrop");
  const search = document.getElementById("search");
  const densityBtn = document.getElementById("density");
  const scrollHint = document.getElementById("scroll-hint");

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function wavelengthToRgb(nm) {
    let r = 0;
    let g = 0;
    let b = 0;
    if (nm >= 380 && nm < 440) {
      r = -(nm - 440) / 60;
      b = 1;
    } else if (nm < 490) {
      g = (nm - 440) / 50;
      b = 1;
    } else if (nm < 510) {
      g = 1;
      b = -(nm - 510) / 20;
    } else if (nm < 580) {
      r = (nm - 510) / 70;
      g = 1;
    } else if (nm < 645) {
      r = 1;
      g = -(nm - 645) / 65;
    } else if (nm <= 780) {
      r = 1;
    } else {
      return "rgb(180,180,180)";
    }
    let factor = 1;
    if (nm < 420) factor = 0.3 + (0.7 * (nm - 380)) / 40;
    else if (nm > 700) factor = 0.3 + (0.7 * (780 - nm)) / 80;
    const gamma = 0.8;
    const ch = (c) => Math.round(255 * Math.pow(Math.max(0, c) * factor, gamma));
    return `rgb(${ch(r)}, ${ch(g)}, ${ch(b)})`;
  }

  function lineName(line) {
    const hit = LINE_NAMES.find((item) => item.ion === line.ion && Math.abs(item.nm - line.nm) < 0.05);
    return hit ? hit.name : "";
  }

  function chapter() {
    return STORY.chapters[state.chapter] || STORY.chapters[0];
  }

  function matches(el) {
    const q = state.query.trim();
    const catOk = state.cat === "all" || el.category === state.cat;
    if (!catOk) return false;
    if (!q) return true;
    const lower = q.toLowerCase();
    if (/^\d+$/.test(q)) return String(el.z).startsWith(q);
    return (
      el.symbol.toLowerCase().includes(lower) ||
      el.nameEn.toLowerCase().includes(lower) ||
      el.nameZh.includes(q) ||
      (el.reading && el.reading.toLowerCase().includes(lower))
    );
  }

  function buildTable() {
    const bits = [];
    bits.push('<div class="gnum" style="grid-row:1;grid-column:1"></div>');
    for (let g = 1; g <= 18; g += 1) {
      bits.push(`<div class="gnum" style="grid-row:1;grid-column:${g + 1}">${g}</div>`);
    }
    for (let p = 1; p <= 7; p += 1) {
      bits.push(`<div class="prow" style="grid-row:${p + 1};grid-column:1">${p}</div>`);
    }
    bits.push('<div class="gap" style="grid-row:9;grid-column:1 / span 19"></div>');
    bits.push('<div class="fmark" style="grid-row:10;grid-column:1" title="镧系">镧</div>');
    bits.push('<div class="fmark" style="grid-row:11;grid-column:1" title="锕系">锕</div>');
    ELEMENTS.forEach((el) => {
      const row = el.row <= 7 ? el.row + 1 : el.row === 9 ? 10 : 11;
      bits.push(
        `<button type="button" class="cell cat-${el.category}" data-z="${el.z}" style="grid-row:${row};grid-column:${el.col + 1};--d:${el.col * 34 + el.row * 14};--spec:${specGradient(el.lines)}" aria-label="${esc(el.nameZh)}，${el.symbol}，原子序数 ${el.z}" aria-pressed="false">` +
          `<span class="z">${el.z}</span><span class="sym">${esc(el.symbol)}</span><span class="zh">${esc(el.nameZh)}</span>` +
          `</button>`
      );
    });
    table.innerHTML = bits.join("");
  }

  function buildLegend() {
    legend.innerHTML = CATS.map(([id, label]) => {
      const sw = id === "all" ? "" : `<i class="swatch cat-${id}"></i>`;
      return `<button type="button" data-cat="${id}" aria-pressed="${id === "all" ? "true" : "false"}">${sw}${label}</button>`;
    }).join("");
  }

  function renderModes() {
    document.getElementById("mode-story").setAttribute("aria-pressed", String(state.mode === "story"));
    document.getElementById("mode-explore").setAttribute("aria-pressed", String(state.mode === "explore"));
    densityBtn.hidden = !narrowQuery.matches;
    densityBtn.textContent = state.density === "overview" ? "细读" : "星图";
    densityBtn.setAttribute("aria-pressed", String(state.density === "overview"));
    tableScroll.classList.toggle("overview", state.density === "overview");
    tableScroll.classList.toggle("detail", state.density === "detail" && narrowQuery.matches);
    scrollHint.hidden = !(state.density === "detail" && narrowQuery.matches);
  }

  function renderStory() {
    if (state.mode === "explore") {
      storyHost.innerHTML =
        '<p class="kicker">自由探索</p><h2>118 格，点开就能核对</h2>' +
        "<p class=\"body\">搜索符号、中文名或英文名。焰色和谱线只在有文献时出现；没有标准原子量，就写无，不拿质量数冒充。</p>";
      playEnter(storyHost);
      return;
    }
    const ch = chapter();
    const chips = (ch.chips || [])
      .map(
        (chip) =>
          `<li><button type="button" data-z="${chip.z}">${esc(chip.text)}</button></li>`
      )
      .join("");
    const dots = STORY.chapters.map((item, index) => {
      return `<button type="button" data-chapter="${index}" aria-label="第 ${index + 1} 章 ${esc(item.title)}" aria-current="${index === state.chapter ? "true" : "false"}"></button>`;
    }).join("");
    storyHost.innerHTML =
      `<p class="kicker">第 ${state.chapter + 1} 章 · ${esc(ch.kicker)}</p>` +
      `<h2>${esc(ch.title)}</h2>` +
      `<p class="body">${esc(ch.body)}</p>` +
      (chips ? `<ul class="chips">${chips}</ul>` : "") +
      (ch.chipNote ? `<p class="chip-note">${esc(ch.chipNote)}</p>` : "") +
      `<div class="story-nav">` +
      `<button type="button" class="btn" id="prev-ch" ${state.chapter === 0 ? "disabled" : ""}>上一章</button>` +
      `<button type="button" class="btn primary" id="next-ch">${state.chapter === STORY.chapters.length - 1 ? "改为自由探索" : "下一章"}</button>` +
      `<div class="dots">${dots}</div></div>`;
    playEnter(storyHost);
  }

  function playEnter(node) {
    node.classList.remove("is-entering");
    void node.offsetWidth;
    node.classList.add("is-entering");
  }

  /* 每格底部那条细线，就是它自己的可见光谱：380–780 nm 里每条强线一个刻度 */
  function specGradient(lines) {
    if (!lines || !lines.length) return "none";
    let imax = 1;
    lines.forEach((l) => { if ((l.intensity || 1) > imax) imax = l.intensity || 1; });
    const parts = [];
    lines.forEach((l) => {
      const x = ((l.nm - 380) / 400) * 100;
      const w = 0.5;
      const a = Math.max(0.4, Math.min(1, (l.intensity || 1) / imax)).toFixed(2);
      parts.push(
        `transparent ${(x - w).toFixed(2)}%, rgba(38,28,18,${a}) ${(x - w).toFixed(2)}% ${(x + w).toFixed(2)}%, transparent ${(x + w).toFixed(2)}%`
      );
    });
    return `linear-gradient(90deg, ${parts.join(", ")})`;
  }

  function renderCells() {
    const focus = new Set(state.mode === "story" ? chapter().elements : []);
    const filtering = state.query.trim() || state.cat !== "all";
    table.querySelectorAll(".cell").forEach((node) => {
      const el = byZ.get(Number(node.dataset.z));
      const ok = matches(el);
      node.classList.toggle("is-miss", !ok);
      node.hidden = false;
      node.setAttribute("aria-pressed", String(el.z === state.z));
      const highlighted = state.mode === "story" && !filtering && focus.size && focus.has(el.z);
      const dim = state.mode === "story" && !filtering && focus.size && !focus.has(el.z) && el.z !== state.z;
      node.classList.toggle("is-focus", highlighted);
      node.classList.toggle("is-dim", dim);
    });
    legend.querySelectorAll("button").forEach((node) => {
      node.setAttribute("aria-pressed", String(node.dataset.cat === state.cat));
    });
  }

  function shellSvg(el) {
    const shells = el.shells;
    const cx = 90;
    const cy = 90;
    const orbits = shells
      .map((count, index) => {
        const radius = 16 + ((index + 1) * (70 - 16)) / shells.length;
        const duration = (16 + index * 7).toFixed(1);
        const rad = count > 24 ? 1.6 : count > 12 ? 2 : 2.4;
        const electrons = [];
        for (let i = 0; i < count; i += 1) {
          const ang = ((i / count) * 360).toFixed(1);
          electrons.push(
            `<g class="electron-spin" style="--spin:${ang}deg;transform:rotate(${ang}deg);animation-duration:${duration}s">` +
              `<circle class="electron" cx="${cx}" cy="${(cy - radius).toFixed(1)}" r="${rad}"/>` +
            `</g>`
          );
        }
        return `<circle class="orbit" cx="${cx}" cy="${cy}" r="${radius.toFixed(1)}"/>${electrons.join("")}`;
      })
      .join("");
    return (
      `<svg class="shell-svg" viewBox="0 0 180 180" aria-hidden="true">` +
      orbits +
      `<circle class="nucleus" cx="${cx}" cy="${cy}" r="11"/>` +
      `<text x="${cx}" y="${cy + 4}" text-anchor="middle">${el.z}</text>` +
      `</svg>`
    );
  }

  function renderPanel() {
    const el = byZ.get(state.z);
    if (!el) {
      panel.innerHTML = '<p class="empty">元素数据没有载入。</p>';
      return;
    }
    const weight = el.weight
      ? `${esc(el.weight)}${el.weightInterval ? `<br><span>区间 ${esc(el.weightInterval)}</span>` : ""}`
      : "无标准原子量";
    const phase = el.phaseZh || "未有宏观样品";
    const group = el.group ? `第 ${el.group} 族` : "f 区，不单标族";
    const shellText = el.shells.map((count, index) => `${SHELL[index] || index + 1} 层 ${count}`).join("，");
    const lines = el.lines || [];
    const spectrum = lines.length
      ? `<div class="spectrum" role="img" aria-label="可见发射线示意">${lines
          .map((line, index) => {
            const left = ((line.nm - 380) / 400) * 100;
            const color = wavelengthToRgb(line.nm);
            const h = 30 + Math.round((line.intensity / (lines[0] ? Math.max(...lines.map((item) => item.intensity)) : 1)) * 46);
            return `<i style="left:${left}%;height:${h}%;background:${color};box-shadow:0 0 8px ${color};animation-delay:${index * 55}ms"></i>`;
          })
          .join("")}<div class="axis"><span>380</span><span>580</span><span>780 nm</span></div></div>
          <ul class="lines">${lines
            .map((line) => {
              const name = lineName(line);
              return `<li><span>${line.nm.toFixed(3)} nm</span><span>${esc(line.ion)}</span><span>${esc(name)}</span><span class="inten">强度 ${line.intensity}${line.persistent ? " · 持久" : ""}</span></li>`;
            })
            .join("")}</ul>`
      : `<p class="empty">NIST《基础原子光谱数据手册》没有收录这个元素可用的可见强线。这里留空，不补画。</p>`;
    const flame = el.flame
      ? `<div class="flame"><div class="flame-orb" style="--flame:${el.flame.swatch}"></div><div><strong>${esc(el.flame.color)}</strong><p class="note">${esc(el.flame.note)} 色块只是示意，不是测色值。</p></div></div>`
      : `<p class="empty">没有列入可靠的定性焰色。留空不是「火焰一定无色」，而是这份档案不猜测。</p>`;
    const reading = el.reading ? `（${esc(el.reading)}）` : "";
    panel.innerHTML =
      `<div class="handle"></div>` +
      `<div class="panel-head"><div><p class="symbol-xl cat-${el.category}" style="color:var(--${el.category})">${esc(el.symbol)}</p>` +
      `<h2>${esc(el.nameZh)}${reading}</h2><p class="en">${esc(el.nameEn)}</p></div>` +
      `<div><button type="button" class="icon-btn sheet-only" id="close-sheet">关闭</button><div class="cat-pill"><i class="swatch cat-${el.category}"></i>${esc(el.categoryZh)}</div></div></div>` +
      `<div class="facts">` +
      `<div class="fact"><span>原子序数</span><strong>${el.z}</strong></div>` +
      `<div class="fact"><span>简约标准原子量</span><strong>${weight}</strong></div>` +
      `<div class="fact"><span>位置</span><strong>第 ${el.period} 周期 · ${group}</strong></div>` +
      `<div class="fact"><span>区块 / 物态</span><strong>${el.block} 区 · ${phase}</strong></div>` +
      `</div>` +
      (el.phaseNote ? `<p class="note">${esc(el.phaseNote)}</p>` : "") +
      (el.caution ? `<p class="warn">${esc(el.caution)}</p>` : "") +
      (el.seriesNote ? `<p class="note">${esc(el.seriesNote)}</p>` : "") +
      (el.z >= 104 ? `<p class="note">类别按族的位置标注。化学性质大多还没有测全。</p>` : "") +
      `<h3 class="section-title">电子层</h3>` +
      `<div class="shell-wrap">${shellSvg(el)}<div><p class="config">${esc(el.configShort)}</p><ul class="shell-list">${el.shells
        .map((count, index) => `<li><span>${SHELL[index] || "壳"}</span><span>${count}</span></li>`)
        .join("")}</ul></div></div>` +
      `<p class="note">${esc(STATUS[el.configStatus] || "")}。${esc(shellText)}。圆点只表示每一主壳层有多少电子，不是轨道的真实形状。</p>` +
      (el.configNote ? `<p class="note">${esc(el.configNote)}</p>` : "") +
      `<h3 class="section-title">发射光谱</h3>${spectrum}` +
      `<p class="note">${esc(el.spectrumNote || "空气波长，节选自 NIST 强线表的可见区，不是完整光谱。靠得太近的线会叠在一起。")} 色带上的颜色按波长近似换算，不是拍摄的光谱照片。</p>` +
      `<h3 class="section-title">焰色</h3>${flame}` +
      `<h3 class="section-title">用途</h3><p>${esc(el.uses)}</p>` +
      (el.body ? `<h3 class="section-title">在人体里</h3><p>${esc(el.body)}</p>` : "") +
      `<div class="panel-nav"><button type="button" class="btn" id="prev-el">上一个</button><button type="button" class="btn" id="next-el">下一个</button></div>`;
    syncSheet();
    playEnter(panel);
  }

  function syncSheet() {
    const desktop = desktopQuery.matches;
    document.body.classList.toggle("sheet-open", state.sheet && !desktop);
    backdrop.hidden = desktop || !state.sheet;
    if (!desktop) panel.inert = !state.sheet;
    else panel.inert = false;
  }

  function select(z, opts) {
    const el = byZ.get(z);
    if (!el) return;
    state.z = z;
    if (!opts || !opts.silentHash) {
      history.replaceState(null, "", `#${el.symbol}`);
    }
    if (!opts || opts.openSheet !== false) {
      if (!desktopQuery.matches && (!opts || opts.openSheet)) state.sheet = true;
    }
    renderCells();
    renderPanel();
    const node = table.querySelector(`.cell[data-z="${el.z}"]`);
    if (node && !desktopQuery.matches) {
      node.scrollIntoView({ inline: "center", block: "nearest" });
    }
  }

  function neighbor(step) {
    const order = ELEMENTS.slice().sort((a, b) => a.z - b.z);
    const index = order.findIndex((el) => el.z === state.z);
    const next = order[(index + step + order.length) % order.length];
    select(next.z, { openSheet: state.sheet || desktopQuery.matches });
  }

  function readHash() {
    const raw = decodeURIComponent(location.hash.replace(/^#/, "")).trim();
    if (!raw) return null;
    const zMatch = raw.match(/^z=(\d+)$/i);
    if (zMatch) return byZ.get(Number(zMatch[1])) || null;
    const lower = raw.toLowerCase();
    return (
      ELEMENTS.find((el) => el.symbol.toLowerCase() === lower) ||
      ELEMENTS.find((el) => el.nameZh === raw) ||
      ELEMENTS.find((el) => el.nameEn.toLowerCase() === lower) ||
      null
    );
  }

  function moveFocus(dzCol, dzRow) {
    const current = byZ.get(state.z);
    if (!current) return;
    const row = current.row;
    const col = current.col;
    const candidates = ELEMENTS.filter((el) => {
      if (dzCol) return el.row === row && Math.sign(el.col - col) === dzCol;
      return el.col === col && Math.sign(el.row - row) === dzRow;
    });
    if (!candidates.length) return;
    candidates.sort((a, b) => {
      const da = dzCol ? Math.abs(a.col - col) : Math.abs(a.row - row);
      const db = dzCol ? Math.abs(b.col - col) : Math.abs(b.row - row);
      return da - db;
    });
    select(candidates[0].z, { openSheet: desktopQuery.matches });
    const node = table.querySelector(`.cell[data-z="${candidates[0].z}"]`);
    if (node) node.focus();
  }

  function openAbout() {
    const dialog = document.getElementById("about");
    const items = (META.sources || [])
      .map((source) => `<li><strong>${esc(source.title)}</strong>　${esc(source.detail)}</li>`)
      .join("");
    dialog.innerHTML =
      `<h3>数据从哪来</h3><ol>${items}</ol>` +
      `<div class="actions"><button type="button" class="btn primary" id="close-about">知道了</button></div>`;
    dialog.showModal();
    dialog.querySelector("#close-about").addEventListener("click", () => dialog.close());
  }

  function openAudio() {
    const dialog = document.getElementById("audio-note");
    dialog.innerHTML =
      `<h3>元素的声音</h3>` +
      `<p>影片自带旁白与配乐。表格里的每一种元素也有自己的音色：把可见光谱等比搬进听域，` +
      `谱线之间的音程关系保持真实。悬浮或点按任意格子就能听到。</p>` +
      `<p class="note">钠的 D 双线只相差 0.15%，搬到耳朵里是 0.147 Hz 的拍音，人耳听不出来——` +
      `所以钠是一个纯音。这不是做不出来，是不该编。</p>` +
      `<div class="actions"><button type="button" class="btn" id="audition">试听钠</button>` +
      `<button type="button" class="btn primary" id="close-audio">好</button></div>`;
    dialog.showModal();
    dialog.querySelector("#audition").addEventListener("click", () => {
      if (window.__playElement) window.__playElement(11);
    });
    dialog.querySelector("#close-audio").addEventListener("click", () => dialog.close());
  }

  function bind() {
    document.getElementById("mode-story").addEventListener("click", () => {
      state.mode = "story";
      renderModes();
      renderStory();
      renderCells();
    });
    document.getElementById("mode-explore").addEventListener("click", () => {
      state.mode = "explore";
      renderModes();
      renderStory();
      renderCells();
    });
    densityBtn.addEventListener("click", () => {
      state.density = state.density === "overview" ? "detail" : "overview";
      renderModes();
    });
    search.addEventListener("input", () => {
      state.query = search.value;
      renderCells();
    });
    legend.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-cat]");
      if (!button) return;
      state.cat = button.dataset.cat;
      renderCells();
    });
    table.addEventListener("click", (event) => {
      const button = event.target.closest(".cell");
      if (!button) return;
      select(Number(button.dataset.z), { openSheet: true });
    });
    storyHost.addEventListener("click", (event) => {
      const chip = event.target.closest("button[data-z]");
      if (chip) {
        select(Number(chip.dataset.z), { openSheet: true });
        return;
      }
      const dot = event.target.closest("button[data-chapter]");
      if (dot) {
        state.chapter = Number(dot.dataset.chapter);
        const first = chapter().elements[0];
        state.z = first;
        renderStory();
        renderCells();
        renderPanel();
        return;
      }
      if (event.target.id === "prev-ch" && state.chapter > 0) {
        state.chapter -= 1;
        state.z = chapter().elements[0];
        renderStory();
        renderCells();
        renderPanel();
      }
      if (event.target.id === "next-ch") {
        if (state.chapter >= STORY.chapters.length - 1) {
          state.mode = "explore";
          renderModes();
          renderStory();
          renderCells();
          return;
        }
        state.chapter += 1;
        state.z = chapter().elements[0];
        renderStory();
        renderCells();
        renderPanel();
      }
    });
    panel.addEventListener("click", (event) => {
      if (event.target.id === "close-sheet") {
        state.sheet = false;
        syncSheet();
      }
      if (event.target.id === "prev-el") neighbor(-1);
      if (event.target.id === "next-el") neighbor(1);
    });
    backdrop.addEventListener("click", () => {
      state.sheet = false;
      syncSheet();
    });
    document.getElementById("about-open").addEventListener("click", openAbout);
    document.getElementById("audio-open").addEventListener("click", openAudio);
    document.getElementById("replay").addEventListener("click", () => startIntro());
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.sheet && !desktopQuery.matches) {
        state.sheet = false;
        syncSheet();
        return;
      }
      if (event.target.matches("input, textarea")) return;
      if (event.key === "ArrowLeft") moveFocus(-1, 0);
      if (event.key === "ArrowRight") moveFocus(1, 0);
      if (event.key === "ArrowUp") moveFocus(0, -1);
      if (event.key === "ArrowDown") moveFocus(0, 1);
    });
    narrowQuery.addEventListener("change", () => {
      if (narrowQuery.matches && state.density === "detail") {
        /* keep explicit choice */
      } else if (!narrowQuery.matches) {
        state.density = "detail";
      }
      renderModes();
    });
    desktopQuery.addEventListener("change", syncSheet);
    window.addEventListener("hashchange", () => {
      const el = readHash();
      if (el) select(el.z, { openSheet: true });
    });
  }

  function getTargets() {
    return Array.from(table.querySelectorAll(".cell")).map((node) => {
      const rect = node.getBoundingClientRect();
      const el = byZ.get(Number(node.dataset.z));
      return {
        z: el.z,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        w: rect.width,
        h: rect.height,
        cat: el.category,
      };
    });
  }

  function revealTable() {
    if (document.body.classList.contains("revealed")) return;
    document.body.classList.remove("instant");
    document.body.classList.add("revealed");
  }

  function startIntro() {
    window.scrollTo(0, 0);
    document.body.classList.remove("revealed", "instant");
    try {
      window.StardustIntro.start({
        getTargets,
        onReveal: revealTable,
        onDone() {
          revealTable();
          const node = table.querySelector(`.cell[data-z="${state.z}"]`);
          if (node) node.focus({ preventScroll: true });
        },
      });
    } catch (error) {
      document.getElementById("intro").hidden = true;
      revealTable();
      console.error(error);
    }
  }

  function init() {
    if (!ELEMENTS.length) {
      table.innerHTML = '<p class="empty">元素数据没有载入。请确认 data/elements.js 与页面在同一目录结构里。</p>';
      return;
    }
    buildTable();
    buildLegend();
    bind();
    const fromHash = readHash();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (fromHash) {
      state.mode = "explore";
      state.z = fromHash.z;
      state.sheet = !desktopQuery.matches;
    } else {
      state.z = chapter().elements[0] || 1;
    }
    renderModes();
    renderStory();
    renderCells();
    renderPanel();
    if (fromHash && !desktopQuery.matches) {
      const hashed = table.querySelector(`.cell[data-z="${state.z}"]`);
      if (hashed) hashed.scrollIntoView({ inline: "center", block: "nearest" });
    }
    document.getElementById("intro-next").addEventListener("click", () => window.StardustIntro.advance());
    document.getElementById("intro-skip").addEventListener("click", () => window.StardustIntro.skip());
    if (fromHash || reduce) {
      document.getElementById("intro").hidden = true;
      document.body.classList.add("revealed", "instant");
    } else {
      startIntro();
    }
  }

  init();
})();
