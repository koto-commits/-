// =========================================================
// 練習用サイト script.js
// ・「どの要素を」「いつ」「どう変えるか」を書くのがJSの基本
// =========================================================

// ---------- 1. メニューの開け閉め ----------
const menuBtn = document.querySelector(".header__menu-btn");
const menuLinks = document.querySelectorAll(".menu a");

// ボタンを押したら body に .is-menu-open を付けたり外したりする
menuBtn.addEventListener("click", () => {
  document.body.classList.toggle("is-menu-open");
});

// メニュー内のリンクを押したらメニューを閉じる
menuLinks.forEach((link) => {
  link.addEventListener("click", () => {
    document.body.classList.remove("is-menu-open");
  });
});

// ---------- 2. カスタムカーソル ----------
const cursor = document.querySelector(".cursor");

// マウスが動いたら、カーソルの位置をマウスの位置に合わせる
window.addEventListener("mousemove", (e) => {
  cursor.style.left = e.clientX + "px";
  cursor.style.top = e.clientY + "px";
});

// リンクやボタンに乗ったらカーソルを大きくする
document.querySelectorAll("a, button").forEach((el) => {
  el.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
  el.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
});

// ---------- 3. スクロールでふわっと表示 ----------
// IntersectionObserver = 「要素が画面に入ったか」を見張ってくれる仕組み
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-show");
        observer.unobserve(entry.target); // 一度出たらもう見張らない
      }
    });
  },
  { threshold: 0.2 } // 要素が20%見えたら発動
);

document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));

// ---------- 4. ランダムな四角を出し続ける ----------
const heroBg = document.querySelector(".hero__bg");
const colors = ["#ffa8b8", "#90adff", "#ffe4a5"]; // 使う色

// min〜max のあいだのランダムな数を作る関数
function random(min, max) {
  return Math.random() * (max - min) + min;
}

// 四角を1個作って、0.5秒後に消す
function createRect() {
  const rect = document.createElement("span");
  rect.className = "rect";
  rect.style.width = random(3.75, 7.5) + "vw";
  rect.style.height = random(3.75, 7.5) + "vw";
  rect.style.left = random(0, 100) + "%";
  rect.style.top = random(0, 100) + "%";
  rect.style.background = colors[Math.floor(Math.random() * colors.length)];
  heroBg.appendChild(rect);
  setTimeout(() => rect.remove(), 500); // 500 = 0.5秒
}

// ランダムな数(1〜3個)の四角を、ランダムな間隔(0.05〜0.3秒)で作り続ける
function loop() {
  const count = Math.floor(random(1, 4));
  for (let i = 0; i < count; i++) createRect();
  setTimeout(loop, random(50, 300));
}
loop();

// ---------- 次のステップのヒント ----------
// ・GSAP + ScrollTrigger を使うと、もっと細かいスクロール演出ができる
// ・Lenis を使うと、スクロール自体が「ぬるっと」なめらかになる
// どちらも <script src="..."> で読み込むだけで使い始められます
