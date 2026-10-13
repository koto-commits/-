// =========================================================
// 花渡 HANAWATARI script.js
// ① 季節のデータと切り替え ② 舞うもの ③ ローディングと見出し
// ④ メニュー ⑤ ふわっと表示 ⑥ 予約（デモ）
// =========================================================

const root = document.documentElement;
const body = document.body;

// =========================================================
// ① 季節のデータ
// colors：CSS 変数に入れる色 ／ glow：窓の灯りの強さ ／ sunY：太陽の高さ
// =========================================================
const SEASONS = {
  spring: {
    name: "春",
    caption: "春 ── 丘いっぱいに、青い花がひらく季節。",
    colors: {
      bg: "#f5f2ec", ink: "#2f3a4a", sub: "#7d8794", accent: "#5d86c8", line: "#e2ddd3", card: "#fbf9f5",
      sky1: "#8ec5f2", sky2: "#e8f4fb", sun: "#fff4cf", sea: "#6aa7d6",
      "hill-far": "#b9d4c5", hill: "#9cc79b", flower: "#7ea6e0", "flower-light": "#ffffff",
      tree: "#79a77d", stone: "#f4f1ea", window: "#3b4a5a",
    },
    glow: 0, sunY: "0px",
    card: {
      en: "Spring",
      title: "青い花の、丘をあるく。",
      text: "四月から五月にかけて、丘は一面の青に染まります。花のあいだの小道を、のんびり散歩するのがおすすめです。",
      list: [
        ["花畑の朝さんぽ", "朝露がひかる、いちばん静かな時間に。"],
        ["丘の上のピクニック", "宿で用意したバスケットを持って。"],
        ["花びらの押し花づくり", "旅の思い出を、しおりにして持ち帰れます。"],
      ],
    },
  },
  summer: {
    name: "夏",
    caption: "夏 ── 入道雲と、どこまでも青い海。",
    colors: {
      bg: "#f2f6f6", ink: "#1f3442", sub: "#6b8190", accent: "#2b8bb8", line: "#d9e4e6", card: "#fbfdfd",
      sky1: "#3f9be0", sky2: "#cfeefc", sun: "#fffbe6", sea: "#2f86c4",
      "hill-far": "#8fc29a", hill: "#5fa66a", flower: "#ffffff", "flower-light": "#cde8b8",
      tree: "#3f8a4e", stone: "#f7f5ef", window: "#33424f",
    },
    glow: 0, sunY: "-40px",
    card: {
      en: "Summer",
      title: "入り江で、すずむ。",
      text: "夏は、宿の裏の入り江がいちばんにぎやかになる季節。日が落ちたら、石のテラスで夜風にあたりましょう。",
      list: [
        ["入り江の小舟", "おだやかな日は、小さな舟で沖へ。"],
        ["石のテラスで夕涼み", "冷たいハーブ水を片手に。"],
        ["夜光虫さがし", "波打ちぎわが、青く光る夜があります。"],
      ],
    },
  },
  autumn: {
    name: "秋",
    caption: "秋 ── 金色にそまる、夕暮れの丘。",
    colors: {
      bg: "#f6efe6", ink: "#3d2f28", sub: "#8c7a6c", accent: "#c26a3a", line: "#e7dccd", card: "#fcf8f2",
      sky1: "#f1b98a", sky2: "#fbe3c6", sun: "#ffd69a", sea: "#7b8fb0",
      "hill-far": "#c9a77a", hill: "#b38a55", flower: "#d9a24a", "flower-light": "#f3d9a6",
      tree: "#c9673a", stone: "#f3ebdf", window: "#4a3a30",
    },
    glow: 0.55, sunY: "200px",
    card: {
      en: "Autumn",
      title: "夕暮れが、いちばん長い季節。",
      text: "日が少しずつ短くなる秋は、窓の灯りがともる時間もはやくなります。夕暮れの丘は、まるで金色の海のよう。",
      list: [
        ["夕暮れの丘", "柱のなごりに腰かけて、日が沈むまで。"],
        ["木の実あつめ", "拾った木の実は、夜のスープに。"],
        ["灯りともしの時間", "宿の窓に、ひとつずつ灯りをともします。"],
      ],
    },
  },
  winter: {
    name: "冬",
    caption: "冬 ── 雪の丘と、暖炉の灯り。",
    colors: {
      bg: "#eef1f5", ink: "#24304a", sub: "#76819a", accent: "#6f86c6", line: "#dde2ea", card: "#f9fafc",
      sky1: "#1e2d55", sky2: "#7d8fbd", sun: "#e8eefc", sea: "#3a4c7a",
      "hill-far": "#dfe6f2", hill: "#f4f7fb", flower: "#ffffff", "flower-light": "#dfe6f2",
      tree: "#e9eef6", stone: "#f2f0ec", window: "#3a2e2a",
    },
    glow: 1, sunY: "120px",
    card: {
      en: "Winter",
      title: "雪の日は、灯りのそばで。",
      text: "冬の丘は、しんと静まりかえります。外は雪でも、宿の中には暖炉と焚き火。あたたかい場所で、ゆっくり本を読む旅を。",
      list: [
        ["暖炉の図書室", "旅の人が残していった本を、好きなだけ。"],
        ["中庭の焚き火", "毛布とホットワインを、ご用意しています。"],
        ["雪見の湯", "窓の外に、雪の丘をながめながら。"],
      ],
    },
  },
};

const heroPhoto = document.querySelector(".hero__photo");
const caption = document.querySelector(".hero__season-caption");
const seasonCard = document.querySelector(".season-card");

// 季節を切り替える
function setSeason(key) {
  const season = SEASONS[key];
  body.dataset.season = key; // CSS の [data-season="〇〇"] で、舞うものの形が変わる

  // 色をまとめて CSS 変数に入れる（CSS 側の transition で、ゆっくり変わる）
  for (const name in season.colors) {
    root.style.setProperty("--" + name, season.colors[name]);
  }
  root.style.setProperty("--glow", season.glow);
  root.style.setProperty("--sun-y", season.sunY);

  caption.textContent = season.caption;

  // 写真があれば、季節の写真に切り替える（なければイラストのまま）
  heroPhoto.hidden = false;
  heroPhoto.src = `images/hero-${key}.webp`;

  // 季節のたのしみ（カードの中身）
  seasonCard.querySelector(".season-card__en").textContent = season.card.en;
  seasonCard.querySelector(".season-card__title").textContent = season.card.title;
  seasonCard.querySelector(".season-card__text").textContent = season.card.text;
  seasonCard.querySelector(".season-card__list").innerHTML = season.card.list
    .map(([title, text]) => `<li><b>${title}</b>${text}</li>`)
    .join("");
  seasonCard.classList.remove("is-changing");
  void seasonCard.offsetWidth; // アニメーションをもう一度動かすためのおまじない
  seasonCard.classList.add("is-changing");

  // ボタンの選択状態（左下のスイッチと、セクションのタブの両方）
  document.querySelectorAll(".season-switch button").forEach((btn) => {
    btn.setAttribute("aria-checked", btn.dataset.season === key);
  });
  document.querySelectorAll(".season-tabs button").forEach((btn) => {
    btn.setAttribute("aria-selected", btn.dataset.season === key);
  });

  makeParticles(); // 舞うものの数も、季節に合わせて作り直す
}

// 写真が見つからないときは、写真を隠してイラストを見せる
heroPhoto.addEventListener("error", () => {
  heroPhoto.hidden = true;
});

document.querySelectorAll(".season-switch button, .season-tabs button").forEach((btn) => {
  btn.addEventListener("click", () => setSeason(btn.dataset.season));
});

// 今日の日付から、はじめの季節を決める（3〜5月：春、6〜8月：夏…）
function seasonOfToday() {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

// =========================================================
// ② 舞うもの（花びら・綿毛・落ち葉・雪）
// =========================================================
const particles = document.querySelector(".particles");
const PARTICLE_COUNT = { spring: 18, summer: 12, autumn: 16, winter: 34 };

function makeParticles() {
  particles.innerHTML = "";
  const isSmall = window.innerWidth < 768;
  let count = PARTICLE_COUNT[body.dataset.season];
  if (isSmall) count = Math.round(count * 0.6); // スマホは少なめに

  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    p.className = "particle";
    p.style.left = Math.random() * 100 + "%";
    p.style.animationDuration = 10 + Math.random() * 14 + "s";
    p.style.animationDelay = -Math.random() * 20 + "s"; // マイナスにすると、最初から途中を舞っている
    p.style.scale = 0.6 + Math.random() * 0.9;
    particles.appendChild(p);
  }
}

// =========================================================
// ③ ローディングと、見出しの1文字ずつ表示
// =========================================================

// 見出しの文字を1文字ずつ <span> に分けて、少しずつ遅らせて出す
const title = document.querySelector(".hero__title");
let charIndex = 0;
title.innerHTML = title.innerHTML
  .split(/(<br>)/)
  .map((part) => {
    if (part === "<br>") return part;
    return [...part]
      .map((ch) => `<span class="char" style="transition-delay:${0.6 + charIndex++ * 0.08}s">${ch}</span>`)
      .join("");
  })
  .join("");

// 読みこみが終わって、さらに少し待ってから幕を上げる
window.addEventListener("load", () => {
  setTimeout(() => body.classList.add("is-loaded"), 1200);
});

// =========================================================
// ④ メニュー（ドロワー）と、ヘッダーの背景
// =========================================================
const menuBtn = document.querySelector(".menu-btn");
const drawer = document.querySelector(".drawer");

function setMenu(open) {
  body.classList.toggle("is-menu-open", open);
  menuBtn.setAttribute("aria-expanded", open);
  menuBtn.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
  drawer.setAttribute("aria-hidden", !open);
}

menuBtn.addEventListener("click", () => setMenu(!body.classList.contains("is-menu-open")));
drawer.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMenu(false); // Esc キーでも閉じる
});

window.addEventListener(
  "scroll",
  () => body.classList.toggle("is-scrolled", window.scrollY > window.innerHeight * 0.8),
  { passive: true }
);

// =========================================================
// ⑤ スクロールでふわっと表示
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
// ⑥ ご予約（デモ）
// =========================================================
const dateInput = document.querySelector(".reserve__date");
const toast = document.querySelector(".toast");

// チェックイン日の初期値を「2週間後」にする
const twoWeeksLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
dateInput.value = twoWeeksLater.toISOString().slice(0, 10);
dateInput.min = new Date().toISOString().slice(0, 10);

document.querySelector(".reserve__btn").addEventListener("click", () => {
  const room = document.querySelector(".reserve__room").value;
  const nights = document.querySelector(".reserve__nights").value;
  toast.textContent = `${dateInput.value} から ${nights}・${room}：空室があります（デモ）`;
  toast.classList.add("is-show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => toast.classList.remove("is-show"), 3000);
});

// =========================================================
// ⑦ マウスのうしろについてくる光（PCだけ）
// マウスの位置へ「少しずつ」近づけることで、ふわっと遅れてついてくる
// =========================================================
const orb = document.querySelector(".orb");
const canHover = window.matchMedia("(hover: hover)").matches;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (canHover && !reduceMotion) {
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let orbX = mouseX;
  let orbY = mouseY;

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    body.classList.add("has-orb");
  });

  function followMouse() {
    orbX += (mouseX - orbX) * 0.08; // 残りの距離の8%ずつ近づく
    orbY += (mouseY - orbY) * 0.08;
    orb.style.transform = `translate(${orbX}px, ${orbY}px)`;
    requestAnimationFrame(followMouse);
  }
  followMouse();
}

// ---------- 最初に1回だけ実行 ----------
setSeason(seasonOfToday());
