// =========================================================
// checkout.js：注文〜お支払い〜レシートの流れ
// ※ 練習用のデモです。実際の決済は行いません。
//   カード情報はどこにも送信・保存しません。
// ※ script.js のあとに読み込むこと（cart や yen を使うため）
// =========================================================

// テスト用カード番号（Stripe のテストモードと同じ番号）
// これ以外の番号は受け付けない＝本物のカードは使えないようにしている
const TEST_CARDS = {
  "4242424242424242": "success", // VISA：成功
  "5555555555554444": "success", // Mastercard：成功
  "3530111333300000": "success", // JCB：成功
  "378282246310005": "success",  // AMEX：成功
  "4000000000000002": "declined", // VISA：カード会社に拒否される
};

const checkout = document.querySelector(".checkout");
const timeSelect = document.querySelector(".checkout__time");
const cardNumber = document.querySelector(".card-number");
const cardExp = document.querySelector(".card-exp");
const cardCvc = document.querySelector(".card-cvc");
const cardName = document.querySelector(".card-name");
const cardBrand = document.querySelector(".card-brand");
const payBtn = document.querySelector(".checkout__pay");

// ---------- 画面（ステップ）の切り替え ----------
function showStep(step) {
  document.querySelectorAll(".checkout__step").forEach((el) => {
    el.hidden = el.dataset.step !== String(step);
  });
  // 上の「受け取り — お支払い — 完了」の表示
  document.querySelectorAll("[data-step-label]").forEach((el) => {
    el.classList.toggle("is-current", el.dataset.stepLabel === String(step));
  });
  checkout.querySelector(".checkout__box").scrollTop = 0;
}

function openCheckout() {
  makeTimeOptions();
  showError(1, "");
  showError(2, "");
  showStep(1);
  checkout.classList.add("is-open");
}

function closeCheckout() {
  checkout.classList.remove("is-open");
  clearCardForm(); // カード情報は閉じたら必ず消す
}

function showError(step, message) {
  document.querySelector(`[data-error="${step}"]`).textContent = message;
}

// ---------- 受け取り時間の選択肢を作る ----------
function makeTimeOptions() {
  const now = new Date();
  // 15分単位に切り上げて、そこから15分後をスタートにする
  const start = new Date(now);
  start.setMinutes(Math.ceil(now.getMinutes() / 15) * 15 + 15, 0, 0);

  let html = `<option value="asap">できしだい（約10分）</option>`;
  for (let i = 0; i < 6; i++) {
    const t = new Date(start.getTime() + i * 15 * 60 * 1000);
    const hhmm = String(t.getHours()).padStart(2, "0") + ":" + String(t.getMinutes()).padStart(2, "0");
    html += `<option value="${hhmm}">${hhmm} ごろ</option>`;
  }
  timeSelect.innerHTML = html;
}

// ---------- 金額の計算（消費税） ----------
// メニューの値段は「店内（税率10%）の税込価格」として考える
// テイクアウトは軽減税率8%なので、税抜価格に8%をかけ直す
function isTakeout() {
  return document.querySelector('input[name="dining"]:checked').value === "takeout";
}

function unitPrice(item) {
  if (!isTakeout()) return item.price;
  const base = Math.round(item.price / 1.1); // 税抜価格
  return Math.floor(base * 1.08);
}

function calcTotal() {
  const rate = isTakeout() ? 0.08 : 0.1;
  let total = 0;
  cart.forEach((c) => {
    total += unitPrice(findItem(c.id)) * c.qty;
  });
  const tax = total - Math.round(total / (1 + rate)); // 合計に含まれる消費税
  return { total, tax, rate };
}

function renderSummary() {
  const { total, tax, rate } = calcTotal();
  document.querySelector(".summary__items").innerHTML = cart
    .map((c) => {
      const item = findItem(c.id);
      return `<li><span>${item.name} × ${c.qty}</span><span>${yen(unitPrice(item) * c.qty)}</span></li>`;
    })
    .join("");
  document.querySelector(".summary__tax").textContent = `（内消費税 ${rate * 100}%：${yen(tax)}）`;
  document.querySelector(".summary__total").textContent = yen(total);
  updatePayButton();
}

// ---------- ステップ1 → 2 ----------
document.querySelector(".checkout__next").addEventListener("click", () => {
  const nickname = document.querySelector(".checkout__nickname").value.trim();
  if (!nickname) {
    showError(1, "お呼び出し用のお名前を入力してください");
    return;
  }
  showError(1, "");
  renderSummary();
  showStep(2);
});

document.querySelector(".checkout__back").addEventListener("click", () => showStep(1));

// ---------- 支払い方法の切り替え ----------
function payMethod() {
  return document.querySelector('input[name="pay"]:checked').value;
}

document.querySelectorAll('input[name="pay"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    document.querySelectorAll(".pay-panel").forEach((panel) => {
      panel.hidden = panel.dataset.pay !== payMethod();
    });
    if (payMethod() === "qr") makeFakeQR();
    showError(2, "");
    updatePayButton();
  });
});

function updatePayButton() {
  const { total } = calcTotal();
  const labels = {
    card: `${yen(total)} を支払う`,
    qr: "QRコードで支払いを完了する（デモ）",
    store: "この内容で注文する",
  };
  payBtn.textContent = labels[payMethod()];
}

// ---------- カード入力の補助 ----------
// カードのブランドを番号の最初の数字で判定する
function detectBrand(num) {
  if (/^4/.test(num)) return "VISA";
  if (/^5[1-5]/.test(num)) return "Mastercard";
  if (/^35/.test(num)) return "JCB";
  if (/^3[47]/.test(num)) return "AMEX";
  return "";
}

// 4けたごとにスペースを入れる
cardNumber.addEventListener("input", () => {
  const digits = cardNumber.value.replace(/\D/g, "").slice(0, 16);
  cardNumber.value = digits.replace(/(.{4})/g, "$1 ").trim();
  cardBrand.textContent = detectBrand(digits);
});

// 有効期限に「 / 」を自動で入れる
cardExp.addEventListener("input", () => {
  const digits = cardExp.value.replace(/\D/g, "").slice(0, 4);
  cardExp.value = digits.length > 2 ? digits.slice(0, 2) + " / " + digits.slice(2) : digits;
});

cardCvc.addEventListener("input", () => {
  cardCvc.value = cardCvc.value.replace(/\D/g, "").slice(0, 4);
});

// 「テストカードを入力する」ボタン
document.querySelector(".checkout__fill").addEventListener("click", () => {
  const next = new Date();
  const yy = String((next.getFullYear() + 2) % 100).padStart(2, "0");
  cardNumber.value = "4242 4242 4242 4242";
  cardExp.value = "12 / " + yy;
  cardCvc.value = "123";
  cardName.value = "TEST USER";
  cardBrand.textContent = "VISA";
});

function clearCardForm() {
  [cardNumber, cardExp, cardCvc, cardName].forEach((input) => (input.value = ""));
  cardBrand.textContent = "";
}

// カード番号が「ありえる番号」かを確かめる計算（Luhn アルゴリズム）
function luhnCheck(num) {
  let sum = 0;
  num.split("").reverse().forEach((d, i) => {
    let n = Number(d);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  });
  return sum % 10 === 0;
}

// カード入力のチェック。問題があればエラーメッセージを返す
function validateCard() {
  const num = cardNumber.value.replace(/\s/g, "");
  if (num.length < 14 || !luhnCheck(num)) return "カード番号が正しくありません";
  if (!TEST_CARDS[num]) return "デモのため、テスト用のカード番号のみご利用いただけます";

  const [mm, yy] = cardExp.value.split(" / ").map(Number);
  if (!mm || mm < 1 || mm > 12 || yy === undefined) return "有効期限を MM / YY の形で入力してください";
  const now = new Date();
  const expEnd = new Date(2000 + yy, mm, 1); // 有効期限の翌月1日
  if (expEnd <= now) return "有効期限が切れています";

  const cvcLength = detectBrand(num) === "AMEX" ? 4 : 3;
  if (cardCvc.value.length !== cvcLength) return "セキュリティコードが正しくありません";
  if (!cardName.value.trim()) return "カード名義を入力してください";
  return "";
}

// ---------- ニセモノのQRコード（見た目だけ） ----------
function makeFakeQR() {
  const size = 21;
  const qr = document.querySelector(".qr");
  let cells = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // 3つの角に、QRコードっぽい四角い目印を作る
      const corner = (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
      let on;
      if (corner) {
        const cx = x < 7 ? x : x - (size - 7);
        const cy = y < 7 ? y : y - (size - 7);
        on = cx === 0 || cx === 6 || cy === 0 || cy === 6 || (cx >= 2 && cx <= 4 && cy >= 2 && cy <= 4);
      } else {
        on = Math.random() < 0.45;
      }
      cells += `<span class="${on ? "on" : ""}"></span>`;
    }
  }
  qr.innerHTML = cells;
}

// ---------- 支払う ----------
payBtn.addEventListener("click", () => {
  const method = payMethod();
  let result = "success";

  if (method === "card") {
    const error = validateCard();
    if (error) {
      showError(2, error);
      return;
    }
    result = TEST_CARDS[cardNumber.value.replace(/\s/g, "")];
  }

  showError(2, "");
  showStep("processing");

  // 本物っぽく、少し待ってから結果を出す
  setTimeout(() => {
    if (result === "declined") {
      showStep(2);
      showError(2, "このカードはご利用いただけません（カード会社により拒否されました）。別のカードでお試しください。");
      return;
    }
    renderReceipt(method);
    clearCardForm();
    cart = [];
    renderCart(); // カートを空にして保存
    showStep(3);
  }, 1800);
});

// ---------- レシート ----------
function renderReceipt(method) {
  const { total, tax, rate } = calcTotal();
  const number = Math.floor(Math.random() * 900) + 100;
  const now = new Date();
  const date =
    `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ` +
    `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const time = timeSelect.value === "asap" ? "できしだい（約10分）" : timeSelect.value + " ごろ";
  const last4 = cardNumber.value.replace(/\s/g, "").slice(-4);
  const payText = {
    card: `${detectBrand(cardNumber.value.replace(/\s/g, ""))}  •••• ${last4}`,
    qr: "QRコード決済",
    store: "店頭でお支払い（未払い）",
  }[method];

  const items = cart
    .map((c) => {
      const item = findItem(c.id);
      return `<li><span>${item.name} × ${c.qty}</span><span>${yen(unitPrice(item) * c.qty)}</span></li>`;
    })
    .join("");

  document.querySelector(".receipt").innerHTML = `
    <p class="receipt__shop">${document.querySelector(".header__logo").textContent}</p>
    <p class="receipt__label">受け取り番号</p>
    <p class="receipt__number">${number}</p>
    <dl class="receipt__info">
      <dt>お名前</dt><dd>${escapeHTML(document.querySelector(".checkout__nickname").value.trim())} さま</dd>
      <dt>受け取り</dt><dd>${isTakeout() ? "テイクアウト" : "店内"} ／ ${time}</dd>
      <dt>お支払い</dt><dd>${payText}</dd>
      <dt>注文日時</dt><dd>${date}</dd>
    </dl>
    <ul class="receipt__items">${items}</ul>
    <p class="receipt__total"><span>合計</span><span>${yen(total)}</span></p>
    <p class="receipt__tax">（内消費税 ${rate * 100}%：${yen(tax)}）</p>
  `;
}

// 入力された文字をそのまま HTML に入れると危ないので、記号を変換する
function escapeHTML(text) {
  return text.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

// ---------- 閉じる ----------
document.querySelector(".checkout__close").addEventListener("click", closeCheckout);
document.querySelector(".checkout__done").addEventListener("click", closeCheckout);

// 店内／テイクアウトを切り替えたら金額を計算し直す
document.querySelectorAll('input[name="dining"]').forEach((radio) => {
  radio.addEventListener("change", renderSummary);
});
