// =========================================================
// Café KUMO script.js
// ・メニューのデータ → 画面に表示 → カートに入れる → 注文
//   という流れで作っています
// =========================================================

// ---------- 1. メニューのデータ ----------
// 商品を増やしたいときは、{ ... } を1つコピーして書き足すだけ！
// emoji と色は画像ができるまでの仮のもの
const menuItems = [
  { id: 1, name: "ふわふわ雲ラテ",     price: 520, category: "drink",  desc: "ミルクの泡が雲みたいにふわふわ", emoji: "☁️", c1: "#e8f3ff", c2: "#ffffff" },
  { id: 2, name: "流れ星ソーダ",       price: 480, category: "drink",  desc: "飲むとしゅわっと願いがかなう…かも", emoji: "🌠", c1: "#c9d8ff", c2: "#f0e6ff" },
  { id: 3, name: "夕焼けオレンジティー", price: 450, category: "drink",  desc: "空がオレンジ色の時間だけの紅茶", emoji: "🌅", c1: "#ffd9b3", c2: "#ffeede" },
  { id: 4, name: "虹のサンドイッチ",   price: 680, category: "food",   desc: "7色の具材をはさんだサンド", emoji: "🥪", c1: "#ffe3e3", c2: "#e3f7ff" },
  { id: 5, name: "ひだまりトースト",   price: 560, category: "food",   desc: "お日さまの光でじっくり焼きました", emoji: "🍞", c1: "#fff1c9", c2: "#ffe0b8" },
  { id: 6, name: "月のチーズケーキ",   price: 590, category: "sweets", desc: "まんまるでしっとり濃厚", emoji: "🌕", c1: "#fff6cc", c2: "#e8e8ff" },
  { id: 7, name: "雷パフェ",           price: 750, category: "sweets", desc: "パチパチはじけるキャンディ入り", emoji: "⚡", c1: "#fff3a8", c2: "#d6e4ff" },
  { id: 8, name: "雪どけプリン",       price: 420, category: "sweets", desc: "スプーンを入れるとすっととける", emoji: "🍮", c1: "#ffffff", c2: "#fff0d6" },
];

// カートの中身。{ id: 商品番号, qty: 個数 } の形で入れていく
let cart = [];

// よく使う要素を先に取っておく
const menuGrid = document.querySelector(".menu__grid");
const cartList = document.querySelector(".cart__list");
const cartEmpty = document.querySelector(".cart__empty");
const orderBtn = document.querySelector(".cart__order");
const modal = document.querySelector(".modal");

// 値段を「¥1,234」の形にする関数
function yen(price) {
  return "¥" + price.toLocaleString();
}

// id から商品データを探す関数
function findItem(id) {
  return menuItems.find((item) => item.id === id);
}

// ---------- 2. メニューを画面に表示する ----------
function renderMenu(category) {
  // "all" ならすべて、それ以外はカテゴリが同じものだけにしぼる
  const items =
    category === "all"
      ? menuItems
      : menuItems.filter((item) => item.category === category);

  // 商品1つ1つを HTML の文字列にして、まとめて入れる
  menuGrid.innerHTML = items
    .map(
      (item) => `
      <article class="menu-card">
        <div class="menu-card__img img-placeholder" style="--c1:${item.c1}; --c2:${item.c2};">${item.emoji}</div>
        <div class="menu-card__body">
          <h3 class="menu-card__name">${item.name}</h3>
          <p class="menu-card__desc">${item.desc}</p>
          <div class="menu-card__foot">
            <span class="menu-card__price">${yen(item.price)}</span>
            <button class="add-btn" data-id="${item.id}">カートに入れる</button>
          </div>
        </div>
      </article>`
    )
    .join("");
}

// ---------- 3. カテゴリの切り替え ----------
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    // いったん全部の .is-active を外して、押したボタンにだけ付ける
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("is-active"));
    tab.classList.add("is-active");
    renderMenu(tab.dataset.category); // data-category の値を使う
  });
});

// ---------- 4. カートに入れる ----------
// メニューは JS で作り直されるので、外側の .menu__grid でクリックを受け取る
menuGrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".add-btn");
  if (!btn) return; // ボタン以外をクリックしたときは何もしない

  const id = Number(btn.dataset.id);
  const inCart = cart.find((c) => c.id === id);

  if (inCart) {
    inCart.qty++; // すでにカートにあれば個数を +1
  } else {
    cart.push({ id: id, qty: 1 }); // なければ新しく追加
  }

  // ボタンの文字を一瞬だけ変えて「入ったよ」と伝える
  btn.textContent = "追加しました ✓";
  setTimeout(() => (btn.textContent = "カートに入れる"), 800);

  renderCart();
});

// ---------- 5. カートの中身を表示する ----------
function renderCart() {
  cartList.innerHTML = cart
    .map((c) => {
      const item = findItem(c.id);
      return `
        <li class="cart-item">
          <span class="cart-item__emoji">${item.emoji}</span>
          <div class="cart-item__info">
            <p>${item.name}</p>
            <p class="cart-item__price">${yen(item.price)} × ${c.qty}</p>
          </div>
          <div class="qty">
            <button data-id="${c.id}" data-diff="-1">−</button>
            <span>${c.qty}</span>
            <button data-id="${c.id}" data-diff="1">＋</button>
          </div>
        </li>`;
    })
    .join("");

  // 合計の個数と金額を計算する
  let totalQty = 0;
  let totalPrice = 0;
  cart.forEach((c) => {
    totalQty += c.qty;
    totalPrice += findItem(c.id).price * c.qty;
  });

  // 画面のあちこちにある「個数」「金額」をまとめて書き換える
  document.querySelector(".cart-btn__count").textContent = totalQty;
  document.querySelector(".cart-bar__count").textContent = totalQty;
  document.querySelector(".cart-bar__total").textContent = yen(totalPrice);
  document.querySelector(".cart__total-price").textContent = yen(totalPrice);

  // カートが空のときは「まだ何も入っていません」を出して、注文ボタンを押せなくする
  cartEmpty.style.display = cart.length === 0 ? "block" : "none";
  orderBtn.disabled = cart.length === 0;
}

// ---------- 6. 個数の ＋ / − ----------
cartList.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const id = Number(btn.dataset.id);
  const diff = Number(btn.dataset.diff); // +1 か -1
  const inCart = cart.find((c) => c.id === id);

  inCart.qty += diff;

  // 0個になったらカートから消す
  if (inCart.qty <= 0) {
    cart = cart.filter((c) => c.id !== id);
  }

  renderCart();
});

// ---------- 7. カートを開く・閉じる ----------
function openCart() {
  document.body.classList.add("is-cart-open");
}
function closeCart() {
  document.body.classList.remove("is-cart-open");
}

document.querySelector(".cart-btn").addEventListener("click", openCart);
document.querySelector(".cart-bar").addEventListener("click", openCart);
document.querySelector(".cart__close").addEventListener("click", closeCart);
document.querySelector(".overlay").addEventListener("click", closeCart);

// ---------- 8. 注文する（レベル1：見た目だけ） ----------
// ※ 本当のお金は動きません。レベル2ではここを Stripe につなぐ予定
orderBtn.addEventListener("click", () => {
  // 100〜999 のランダムな受け取り番号を作る
  const number = Math.floor(Math.random() * 900) + 100;
  document.querySelector(".modal__number").textContent = number;

  closeCart();
  modal.classList.add("is-open");

  // カートを空にする
  cart = [];
  renderCart();
});

document.querySelector(".modal__close").addEventListener("click", () => {
  modal.classList.remove("is-open");
});

// ---------- 最初に1回だけ実行 ----------
renderMenu("all");
renderCart();
