// =========================================================
// WARM WAKE script.js
// ① 物語：スクロール量 → 時刻・色・明るさ
// ② 朝タイプ診断 ③ カラー切り替え ④ ふわっと表示 ⑤ 追従ボタン
// =========================================================

const root = document.documentElement;

// ---------- 小さな道具 ----------
// a から b へ、t（0〜1）の割合だけ進んだ値
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// p が start〜end のあいだで 0→1 になめらかに変わる値（start より前は0、end より後は1）
function smooth(p, start, end) {
  const t = Math.min(Math.max((p - start) / (end - start), 0), 1);
  return t * t * (3 - 2 * t); // はじめと終わりをゆっくりにする計算
}

// "#rrggbb" どうしを混ぜる
function mixColor(c1, c2, t) {
  const a = parseInt(c1.slice(1), 16);
  const b = parseInt(c2.slice(1), 16);
  const r = Math.round(lerp(a >> 16, b >> 16, t));
  const g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t));
  const bl = Math.round(lerp(a & 255, b & 255, t));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
}

// =========================================================
// ① 物語（スクロール連動）
// =========================================================

// 夜・夜明け・朝の3つの色のセット。この間を混ぜて使う
const PALETTE = {
  night: {
    page: "#0d1222", ink: "#e6e8f2", sub: "#8f96b3",
    sky1: "#070b18", sky2: "#1b2445", wall: "#161c33", floor: "#10152a", frame: "#2c3352",
    bed: "#262c47", mattress: "#2f3656", pillow: "#444c70", blanket: "#39416a", table: "#252b44",
    skin: "#7c7387", hair: "#1b1c28",
  },
  dawn: {
    page: "#2a2541", ink: "#f3e8e4", sub: "#b4a3b0",
    sky1: "#2d3770", sky2: "#e39a7e", wall: "#3a3350", floor: "#2c2740", frame: "#5a4f6e",
    bed: "#5b4b5e", mattress: "#6e5f72", pillow: "#857690", blanket: "#9a7488", table: "#56475c",
    skin: "#c9a39a", hair: "#2d2328",
  },
  morning: {
    page: "#fbf3ea", ink: "#3b2f2a", sub: "#8a7a70",
    sky1: "#8fc0ee", sky2: "#ffe0bd", wall: "#f6e8da", floor: "#e8d3bd", frame: "#d8c4ae",
    bed: "#c9a383", mattress: "#f7efe6", pillow: "#fffaf4", blanket: "#f2c3a3", table: "#c39c78",
    skin: "#f3d2bd", hair: "#4a3328",
  },
};

// スクロールの進み具合（0〜1）と時刻（23:00 からの「分」）の対応表
// 各シーンの区切りで、ちょうどその時刻になるようにしている
const CLOCK = [
  [0, 23 * 60],
  [0.18, 26 * 60],       // 2:00（日付をまたぐので 24+2）
  [0.4, 29 * 60 + 30],   // 5:30
  [0.58, 30 * 60 + 15],  // 6:15
  [0.76, 30 * 60 + 45],  // 6:45
  [0.9, 31 * 60],        // 7:00
  [1, 31 * 60],
];

// 室温の変化（スクロールの進み具合 → ℃）
const ROOM_TEMP = [
  [0, 12], [0.4, 10], [0.6, 10], [0.92, 22], [1, 22],
];

// 対応表から、p のときの値を求める
function fromTable(table, p) {
  for (let i = 1; i < table.length; i++) {
    const [p0, v0] = table[i - 1];
    const [p1, v1] = table[i];
    if (p <= p1) return lerp(v0, v1, (p - p0) / (p1 - p0));
  }
  return table[table.length - 1][1];
}

function formatTime(minutes) {
  const m = Math.round(minutes) % (24 * 60);
  return Math.floor(m / 60) + ":" + String(m % 60).padStart(2, "0");
}

const story = document.querySelector(".story");
const scenes = document.querySelectorAll(".scene");
const hudTime = document.querySelector(".hud__time");
const hudRoom = document.querySelector(".hud__room");
const deviceTime = document.querySelector(".device__time");
const controlsFill = document.querySelector(".controls__fill");

// 雪を2組にして、すき間なく降り続けるようにする
const snow = document.querySelector(".snow");
const snow2 = snow.cloneNode(true);
snow2.classList.add("snow--2");
snow.after(snow2);

function updateStory() {
  // 物語セクションの中を、どれだけ進んだか（0〜1）
  const rect = story.getBoundingClientRect();
  const total = story.offsetHeight - window.innerHeight;
  const p = Math.min(Math.max(-rect.top / total, 0), 1);
  currentP = p;

  // 色：夜 → 夜明け（p 0.4〜0.76）、夜明け → 朝（p 0.76〜0.95）
  const toDawn = smooth(p, 0.4, 0.76);
  const toMorning = smooth(p, 0.76, 0.95);
  for (const key in PALETTE.night) {
    const color = mixColor(mixColor(PALETTE.night[key], PALETTE.dawn[key], toDawn), PALETTE.morning[key], toMorning);
    root.style.setProperty("--" + key, color);
  }

  // 明るさや動きの量（0〜1）
  root.style.setProperty("--stars", (1 - smooth(p, 0.45, 0.75)).toFixed(3));
  root.style.setProperty("--sun", smooth(p, 0.58, 0.97).toFixed(3));
  root.style.setProperty("--heat", smooth(p, 0.6, 0.66).toFixed(3));   // 6:15 ごろにエアコンON
  root.style.setProperty("--light", smooth(p, 0.74, 0.9).toFixed(3));  // 6:45 ごろに光り始める
  root.style.setProperty("--warm", smooth(p, 0.62, 0.95).toFixed(3));
  root.style.setProperty("--sleep", (1 - smooth(p, 0.88, 0.93)).toFixed(3)); // 7:00 で起き上がる
  controlsFill.style.setProperty("--progress", p.toFixed(3));

  // 通りすぎたチャプターに色をつける
  chapterButtons.forEach((btn) => {
    btn.classList.toggle("is-passed", p >= Number(btn.dataset.p) - 0.001);
  });

  // 時計と室温
  const time = formatTime(fromTable(CLOCK, p));
  hudTime.textContent = time;
  deviceTime.textContent = time;
  hudRoom.textContent = Math.round(fromTable(ROOM_TEMP, p));

  // 今の p が data-from〜data-to に入っているシーンだけ表示
  scenes.forEach((scene) => {
    const active = p >= Number(scene.dataset.from) && p < Number(scene.dataset.to);
    scene.classList.toggle("is-active", active);
  });

  // スマホの追従ボタン用に、物語が終わったかを記録
  storyDone = p >= 1 && rect.bottom < window.innerHeight * 0.5;
  updateStickyCta();
}

// スクロールのたびに計算すると重いので、画面の更新1回につき1回だけにする
let ticking = false;
let storyDone = false;
let currentP = 0;
window.addEventListener(
  "scroll",
  () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateStory();
      ticking = false;
    });
  },
  { passive: true }
);
window.addEventListener("resize", updateStory);

// ---------- 物語の操作：チャプター・再生ボタン ----------

// p（0〜1）の位置にあたる、ページのスクロール位置
function storyY(p) {
  return story.offsetTop + (story.offsetHeight - window.innerHeight) * p;
}

// 各シーンの始まりに、チャプターのボタンを作る
const chaptersEl = document.querySelector(".controls__chapters");
const chapterButtons = [];
scenes.forEach((scene) => {
  const from = Number(scene.dataset.from);
  const target = from === 0 ? 0 : from + 0.02; // 少しだけ内側に飛ぶと、そのシーンが確実に表示される
  const btn = document.createElement("button");
  btn.className = "chapter";
  btn.dataset.p = target;
  btn.style.left = target * 100 + "%";
  btn.textContent = scene.querySelector(".scene__time").textContent.split(" ")[0]; // 「23:00 ・ 寝る前」→「23:00」
  btn.setAttribute("aria-label", scene.querySelector(".scene__time").textContent + " へ移動");
  btn.addEventListener("click", () => {
    stopPlay();
    window.scrollTo({ top: storyY(target), behavior: "smooth" });
  });
  chaptersEl.appendChild(btn);
  chapterButtons.push(btn);
});

// 再生：ページを少しずつ自動でスクロールして、時間を進める
const STORY_SECONDS = 30; // 物語ぜんぶを、約30秒で見せる
const playButtons = document.querySelectorAll(".js-play-story");
const playLabel = document.querySelector(".controls__label");
let playing = false;
let lastTime = 0;
let playY = 0; // 自動スクロールの位置（小数点まで覚えておく）

function setPlayingUI() {
  playButtons.forEach((btn) => btn.classList.toggle("is-playing", playing));
  const controlsPlay = document.querySelector(".controls__play");
  controlsPlay.setAttribute("aria-pressed", playing);
  playLabel.textContent = playing ? "一時停止" : currentP >= 0.99 ? "もう一度" : "再生";
}

function step(time) {
  if (!playing) return;
  const dt = lastTime ? time - lastTime : 16;
  lastTime = time;
  const pxPerMs = (story.offsetHeight - window.innerHeight) / (STORY_SECONDS * 1000);
  // scrollBy で少しずつ足すと、スマホでは小数点が切り捨てられて進まないことがあるので、
  // 位置を自分で覚えておいて、そこへ移動させる
  playY = Math.min(playY + pxPerMs * dt, storyY(1));
  window.scrollTo(0, playY);

  if (playY >= storyY(1) - 1) {
    currentP = 1;
    stopPlay(); // 最後（7:00）まで来たら止める
    return;
  }
  requestAnimationFrame(step);
}

function startPlay() {
  // 物語の外にいる・最後まで見終わっている → 最初から
  const rect = story.getBoundingClientRect();
  const outside = rect.top > 0 || rect.bottom < window.innerHeight;
  if (outside || currentP >= 0.99) {
    window.scrollTo({ top: storyY(0), behavior: "auto" });
  }
  playing = true;
  lastTime = 0;
  playY = window.scrollY;
  setPlayingUI();
  requestAnimationFrame(step);
}

function stopPlay() {
  playing = false;
  setPlayingUI();
}

playButtons.forEach((btn) => {
  btn.addEventListener("click", () => (playing ? stopPlay() : startPlay()));
});

// 自分でスクロールし始めたら、自動再生は止める
["wheel", "touchstart", "keydown"].forEach((type) => {
  window.addEventListener(type, () => playing && stopPlay(), { passive: true });
});

// 「物語をとばす」：自動再生も止めて移動
document.querySelector(".story__skip").addEventListener("click", stopPlay);

// =========================================================
// ② 朝タイプ診断
// =========================================================
const OUTSIDE_TEMP = -1; // 今朝の外気温（デモなので固定）

// 寒がり度（1〜5）ごとのタイプ
const TYPES = {
  1: { emoji: "🐻‍❄️", name: "シロクマ", desc: "寒さに強いあなたは、ひかえめに温めて、すっきり目覚めるのがおすすめ。" },
  2: { emoji: "🐧", name: "ペンギン", desc: "冷えには強め。起きる直前に、さっと温めるくらいがちょうどいい。" },
  3: { emoji: "🐑", name: "ひつじ", desc: "ちょうど真ん中。部屋が温まりきったころに起きるのがベスト。" },
  4: { emoji: "🐈", name: "こたつねこ", desc: "寒い朝は本当に苦手。早めに温めて、布団の外を「こたつ」にしておきましょう。" },
  5: { emoji: "🐿️", name: "冬眠リス", desc: "冬は冬眠したいタイプ。しっかり早めに温めて、光でゆっくり起こします。" },
};

const coldInput = document.querySelector(".q__cold");
const wakeSelect = document.querySelector(".q__wake");
const result = document.querySelector(".result");

function timeToMinutes(text) {
  const [h, m] = text.split(":").map(Number);
  return h * 60 + m;
}

function updateQuiz() {
  const cold = Number(coldInput.value);
  const wake = timeToMinutes(wakeSelect.value);
  const roomExtra = Number(document.querySelector('input[name="room"]:checked').value);

  // 温め始め：基本15分 ＋ 寒がり度 ＋ 部屋の広さ ＋ 外の寒さ（5℃より寒い分）
  let lead = 15 + cold * 4 + roomExtra + Math.max(0, 5 - OUTSIDE_TEMP);
  lead = Math.round(lead / 5) * 5; // 5分単位にそろえる
  // 設定温度：寒がりほど高め（0.5℃きざみ）
  const temp = Math.round((20 + cold * 0.7) * 2) / 2;

  const type = TYPES[cold];
  document.querySelector(".result__emoji").textContent = type.emoji;
  document.querySelector(".result__name").textContent = type.name;
  document.querySelector(".result__desc").textContent = type.desc;
  document.querySelector(".result__start").textContent = formatTime(wake - lead + 24 * 60);
  document.querySelector(".result__temp").textContent = temp.toFixed(1) + "℃";
  document.querySelector(".result__light").textContent = formatTime(wake - 30 + 24 * 60);

  // ぽんっと弾ませる（クラスを付け直すと、アニメーションがもう一度動く）
  result.classList.remove("is-pop");
  void result.offsetWidth;
  result.classList.add("is-pop");
}

document.querySelector(".quiz__form").addEventListener("input", updateQuiz);

// =========================================================
// ③ 本体カラーの切り替え
// =========================================================
const DEVICE_COLORS = {
  snow: { body: "#f2efe9", screen: "#2b2f45", name: "スノーホワイト" },
  charcoal: { body: "#3a3b40", screen: "#1c1d22", name: "チャコール" },
};
const priceVisual = document.querySelector(".price__visual");
let deviceColor = "snow";

document.querySelectorAll(".swatch").forEach((btn) => {
  btn.addEventListener("click", () => {
    deviceColor = btn.dataset.color;
    const c = DEVICE_COLORS[deviceColor];
    priceVisual.style.setProperty("--device", c.body);
    priceVisual.style.setProperty("--device-screen", c.screen);
    document.querySelectorAll(".swatch").forEach((b) => {
      b.classList.toggle("is-active", b === btn);
      b.setAttribute("aria-checked", b === btn);
    });
  });
});

// カートに入れる（デモ）
const toast = document.querySelector(".toast");
document.querySelector(".price__buy").addEventListener("click", () => {
  toast.textContent = `WARM WAKE（${DEVICE_COLORS[deviceColor].name}）をカートに入れました（デモ）`;
  toast.classList.add("is-show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => toast.classList.remove("is-show"), 2600);
});

// =========================================================
// ④ スクロールでふわっと表示
// =========================================================
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-show");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

// =========================================================
// ⑤ スマホ用の追従ボタン（物語のあと、価格エリア以外で表示）
// =========================================================
const stickyCta = document.querySelector(".sticky-cta");
let priceVisible = false;

function updateStickyCta() {
  stickyCta.classList.toggle("is-show", storyDone && !priceVisible);
}

new IntersectionObserver(([entry]) => {
  priceVisible = entry.isIntersecting;
  updateStickyCta();
}).observe(document.querySelector(".price"));

// ---------- 最初に1回だけ実行 ----------
updateStory();
setPlayingUI();
updateQuiz();
