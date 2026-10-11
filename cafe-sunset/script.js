// =========================================================
// Café Hakumei script.js
// しくみは cafe-site と同じ：データ → 表示 → カート → 注文
// =========================================================

// ---------- 1. メニューのデータ ----------
// image に画像のパスを書くと、仮の色のかわりに画像が表示される
//   例） image: "images/latte.jpg"
// ph は画像がないときの仮の色（style.css の .ph-〇〇）
const menuItems = [
  { id: 1, name: "夕凪ラテ",             en: "Evening Calm Latte",   price: 580, category: "drink",  desc: "ミルクの泡に、夕方の静けさを。",       image: "", ph: "ph-cream" },
  { id: 2, name: "琥珀のアイスコーヒー",   en: "Amber Iced Coffee",    price: 520, category: "drink",  desc: "夕陽にすかすと、琥珀色にひかります。", image: "", ph: "ph-sunset" },
  { id: 3, name: "潮風レモネード",       en: "Sea Breeze Lemonade",  price: 540, category: "drink",  desc: "ほんの少しだけ、海の塩をひとつまみ。", image: "", ph: "ph-field" },
  { id: 4, name: "金色トースト",         en: "Golden Hour Toast",    price: 620, category: "food",   desc: "はちみつとバターを、光ごと焼きこんで。", image: "", ph: "ph-wood" },
  { id: 5, name: "海辺のサンドイッチ",   en: "Seaside Sandwich",     price: 780, category: "food",   desc: "テラス席で食べたくなる、具だくさん。", image: "", ph: "ph-cream" },
  { id: 6, name: "薄明のガトーショコラ", en: "Twilight Chocolate",   price: 650, category: "sweets", desc: "日が沈む直前の、いちばん深い色。",     image: "", ph: "ph-wood" },
  { id: 7, name: "菜の花のタルト",       en: "Canola Blossom Tart",  price: 600, category: "sweets", desc: "帰り道に咲く、黄色い花をイメージ。",   image: "", ph: "ph-field" },
  { id: 8, name: "大理石のチーズケーキ", en: "Marble Cheesecake",    price: 620, category: "sweets", desc: "白いテーブルみたいな、なめらかさ。",   image: "", ph: "ph-marble" },
];

let cart = []; // { id: 商品番号, qty: 個数 }

const menuGrid = document.querySelector(".menu__grid");
const cartList = document.querySelector(".cart__list");
const cartEmpty = document.querySelector(".cart__empty");
const orderBtn = document.querySelector(".cart__order");
const modal = document.querySelector(".modal");

// 値段を「¥1,234」の形にする
function yen(price) {
  return "¥" + price.toLocaleString();
}

// id から商品を探す
function findItem(id) {
  return menuItems.find((item) => item.id === id);
}

// 写真の部分の HTML を作る（画像があれば画像、なければ仮の色）
function photoHTML(item, className) {
  if (item.image) {
    return `<div class="photo ${className}"><img src="${item.image}" alt="${item.name}"></div>`;
  }
  return `<div class="photo ${item.ph} ${className}"><span>${item.en}</span></div>`;
}

// ---------- 2. メニューを表示する ----------
function renderMenu(category) {
  const items =
    category === "all"
      ? menuItems
      : menuItems.filter((item) => item.category === category);

  menuGrid.innerHTML = items
    .map(
      (item) => `
      <article class="menu-card">
        ${photoHTML(item, "menu-card__img")}
        <p class="menu-card__en">${item.en}</p>
        <h3 class="menu-card__name">${item.name}</h3>
        <p class="menu-card__desc">${item.desc}</p>
        <div class="menu-card__foot">
          <span class="menu-card__price">${yen(item.price)}</span>
          <button class="add-btn" data-id="${item.id}">Add to order</button>
        </div>
      </article>`
    )
    .join("");
}

// ---------- 3. カテゴリの切り替え ----------
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("is-active"));
    tab.classList.add("is-active");
    renderMenu(tab.dataset.category);
  });
});

// ---------- 4. カートに入れる ----------
menuGrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".add-btn");
  if (!btn) return;

  const id = Number(btn.dataset.id);
  const inCart = cart.find((c) => c.id === id);

  if (inCart) {
    inCart.qty++;
  } else {
    cart.push({ id: id, qty: 1 });
  }

  btn.textContent = "Added ✓";
  setTimeout(() => (btn.textContent = "Add to order"), 900);

  renderCart();
});

// ---------- 5. カートを表示する ----------
function renderCart() {
  cartList.innerHTML = cart
    .map((c) => {
      const item = findItem(c.id);
      return `
        <li class="cart-item">
          ${photoHTML(item, "cart-item__thumb")}
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

  let totalQty = 0;
  let totalPrice = 0;
  cart.forEach((c) => {
    totalQty += c.qty;
    totalPrice += findItem(c.id).price * c.qty;
  });

  document.querySelector(".cart-btn__count").textContent = totalQty;
  document.querySelector(".cart-bar__count").textContent = totalQty;
  document.querySelector(".cart-bar__total").textContent = yen(totalPrice);
  document.querySelector(".cart__total-price").textContent = yen(totalPrice);

  cartEmpty.style.display = cart.length === 0 ? "block" : "none";
  orderBtn.disabled = cart.length === 0;
}

// ---------- 6. 個数の ＋ / − ----------
cartList.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const id = Number(btn.dataset.id);
  const inCart = cart.find((c) => c.id === id);
  inCart.qty += Number(btn.dataset.diff);

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
orderBtn.addEventListener("click", () => {
  const number = Math.floor(Math.random() * 900) + 100;
  document.querySelector(".modal__number").textContent = number;

  closeCart();
  modal.classList.add("is-open");

  cart = [];
  renderCart();
});

document.querySelector(".modal__close").addEventListener("click", () => {
  modal.classList.remove("is-open");
});

// ---------- 9. スクロールでふわっと表示 ----------
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

// ---------- 最初に1回だけ実行 ----------
renderMenu("all");
renderCart();
