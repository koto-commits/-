// =========================================================
// KONOMI script.js
// ① カラー切り替え ② スクロール連動 ③ ビフォーアフター
// ④ 購入シミュレーター ⑤ 葉っぱ ⑥ ふわっと表示 ⑦ 追従ボタン
// =========================================================

const root = document.documentElement; // <html> のこと。ここに CSS 変数をセットする

// ---------- 色のデータ ----------
// bag：バッグの色 ／ tint：背景にうっすらにじむ色
const COLORS = {
  kinari:    { name: "生成り", en: "kinari",    bag: "#e9e1d3", tint: "#f1ece3", desc: "染める前のリネンに、どんぐりをほんのひとしずく。" },
  haizakura: { name: "灰桜",   en: "haizakura", bag: "#e6d4d1", tint: "#f3e9e7", desc: "灰をまぜた桜のような、くすんだやさしいピンク。" },
  koke:      { name: "苔",     en: "koke",      bag: "#d3d8c6", tint: "#ebeee4", desc: "雨あがりの森の、しっとりとした苔のいろ。" },
  usuzumi:   { name: "薄墨",   en: "usuzumi",   bag: "#cfcdca", tint: "#ecebe9", desc: "どんぐりの殻と鉄をあわせた、静かなグレー。" },
};

// ---------- 価格のデータ ----------
const PRICE = {
  size: { S: 6800, M: 8800 }, // 税込
  embroidery: 880,
  gift: 330,
  shipping: 600,
  freeShippingOver: 10000, // この金額以上で送料無料
  bulkDiscountRate: 0.1,   // 2点以上で本体価格10%オフ
};

function yen(n) {
  return "¥" + n.toLocaleString();
}

// =========================================================
// ① カラー切り替え
// =========================================================
function setColor(key) {
  const color = COLORS[key];

  // CSS 変数を書き換えると、--bag や --tint を使っている所が全部まとめて変わる
  root.style.setProperty("--bag", color.bag);
  root.style.setProperty("--tint", color.tint);

  // 色の名前と説明
  document.querySelector(".colors__name").innerHTML = `${color.name} <span>${color.en}</span>`;
  document.querySelector(".colors__desc").textContent = color.desc;

  // 色ボタンの選択状態
  document.querySelectorAll(".swatch").forEach((btn) => {
    const active = btn.dataset.color === key;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-checked", active);
  });

  // 購入シミュレーターの色も合わせる
  document.querySelector(`input[name="color"][value="${key}"]`).checked = true;
  updatePrice();
}

document.querySelectorAll(".swatch").forEach((btn) => {
  btn.setAttribute("role", "radio");
  btn.addEventListener("click", () => setColor(btn.dataset.color));
});

// =========================================================
// ② スクロール連動（ストーリー）
// =========================================================
const story = document.querySelector(".story");
const storyPoints = document.querySelectorAll(".story__points li");

function updateStory() {
  const rect = story.getBoundingClientRect();
  // セクションの中をどれだけ進んだか（0〜1）を計算する
  const total = story.offsetHeight - window.innerHeight;
  const progress = Math.min(Math.max(-rect.top / total, 0), 1);

  story.style.setProperty("--p", progress.toFixed(3));

  // data-at の値を過ぎたら、その文章を表示する
  storyPoints.forEach((li) => {
    li.classList.toggle("is-on", progress >= Number(li.dataset.at));
  });
}

window.addEventListener("scroll", updateStory, { passive: true });
updateStory();

// =========================================================
// ③ ビフォーアフター
// =========================================================
const compare = document.querySelector(".compare");
document.querySelector(".compare__range").addEventListener("input", (e) => {
  compare.style.setProperty("--pos", e.target.value + "%");
});

// =========================================================
// ④ 購入シミュレーター
// =========================================================
const form = document.querySelector(".order__form");
const qtyNum = document.querySelector(".qty__num");
const nameInput = document.querySelector(".order__name");
const bagTagName = document.querySelector(".bag__tag--name");
let qty = 1;

function updatePrice() {
  const size = form.querySelector('input[name="size"]:checked').value;
  const hasEmbroidery = form.embroidery.checked;
  const hasGift = form.gift.checked;

  // 本体
  const items = PRICE.size[size] * qty;
  // まとめ買い割引（2点以上）
  const discount = qty >= 2 ? Math.floor(items * PRICE.bulkDiscountRate) : 0;
  // オプション（刺繍は1点ごと、ギフト包装は1回）
  const options = (hasEmbroidery ? PRICE.embroidery * qty : 0) + (hasGift ? PRICE.gift : 0);
  // 送料
  const subtotal = items - discount + options;
  const shipping = subtotal >= PRICE.freeShippingOver ? 0 : PRICE.shipping;
  const total = subtotal + shipping;

  document.querySelector(".price__items").textContent = yen(items);
  document.querySelector(".price__discount").textContent = "−" + yen(discount);
  document.querySelector(".price__options").textContent = yen(options);
  document.querySelector(".price__shipping").textContent = shipping === 0 ? "無料" : yen(shipping);
  document.querySelector(".price__total").textContent = yen(total);

  // 割引がないときは薄く表示
  document.querySelector(".price__discount").classList.toggle("is-zero", discount === 0);
  document.querySelector(".price__discount-label").classList.toggle("is-zero", discount === 0);

  // 送料無料まであといくら？
  const hint = document.querySelector(".price__free-hint");
  hint.textContent =
    shipping === 0 ? "送料無料でお届けします" : `あと ${yen(PRICE.freeShippingOver - subtotal)} で送料無料`;

  // 刺繍の文字をバッグのタグに表示（なければ KONOMI）
  nameInput.disabled = !hasEmbroidery;
  const name = nameInput.value.trim();
  bagTagName.textContent = hasEmbroidery && name ? name : "KONOMI";
}

// 色・サイズ・オプションが変わったら計算し直す
form.addEventListener("change", (e) => {
  if (e.target.name === "color") {
    setColor(e.target.value); // 上のカラー切り替えとも連動させる
  } else {
    updatePrice();
  }
});

// 刺繍の文字は、英字と数字とスペースだけにする
nameInput.addEventListener("input", () => {
  nameInput.value = nameInput.value.replace(/[^a-zA-Z0-9 .]/g, "");
  updatePrice();
});

// 個数の ＋ / −（1〜5個）
document.querySelectorAll(".qty__btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    qty = Math.min(Math.max(qty + Number(btn.dataset.diff), 1), 5);
    qtyNum.textContent = qty;
    updatePrice();
  });
});

// カートに入れる（デモ：お知らせを出すだけ）
const toast = document.querySelector(".toast");
document.querySelector(".order__submit").addEventListener("click", () => {
  const colorKey = form.querySelector('input[name="color"]:checked').value;
  const size = form.querySelector('input[name="size"]:checked').value;
  toast.textContent = `${COLORS[colorKey].name}・${size}サイズ × ${qty} をカートに入れました（デモ）`;
  toast.classList.add("is-show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => toast.classList.remove("is-show"), 2600);
});

updatePrice();

// =========================================================
// ⑤ 舞い落ちる葉っぱ
// =========================================================
const leaves = document.querySelector(".leaves");
const LEAF_COUNT = window.innerWidth < 768 ? 8 : 14; // スマホは少なめ

for (let i = 0; i < LEAF_COUNT; i++) {
  const leaf = document.createElement("span");
  leaf.className = "leaf";
  leaf.style.left = Math.random() * 100 + "%";
  leaf.style.animationDuration = 12 + Math.random() * 14 + "s"; // 12〜26秒で落ちる
  leaf.style.animationDelay = -Math.random() * 20 + "s";        // マイナスにすると、最初から途中の位置にいる
  leaf.style.scale = 0.6 + Math.random() * 0.8;                  // 大きさもバラバラに
  leaves.appendChild(leaf);
}

// =========================================================
// ⑥ スクロールでふわっと表示
// =========================================================
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-show");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.2 }
);
document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));

// =========================================================
// ⑦ スマホ用の追従ボタン
// ファーストビューを過ぎたら出して、購入エリアが見えている間は隠す
// =========================================================
const stickyCta = document.querySelector(".sticky-cta");
let heroVisible = true;
let orderVisible = false;

function updateStickyCta() {
  stickyCta.classList.toggle("is-show", !heroVisible && !orderVisible);
}

new IntersectionObserver(([entry]) => {
  heroVisible = entry.isIntersecting;
  updateStickyCta();
}).observe(document.querySelector(".hero"));

new IntersectionObserver(([entry]) => {
  orderVisible = entry.isIntersecting;
  updateStickyCta();
}).observe(document.querySelector(".order"));
