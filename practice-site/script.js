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

// ---------- 次のステップのヒント ----------
// ・GSAP + ScrollTrigger を使うと、もっと細かいスクロール演出ができる
// ・Lenis を使うと、スクロール自体が「ぬるっと」なめらかになる
// どちらも <script src="..."> で読み込むだけで使い始められます
