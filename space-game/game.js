// =====================================================
//  STAR DODGER（スター・ドッジャー）
//  隕石をよけて星を集める、BGMのリズムに合わせて遊ぶ宇宙ゲーム
// =====================================================


// -----------------------------------------------------
// 1. 設定（ここの数字を変えるとゲームの感じが変わる）
// -----------------------------------------------------

// BGMファイルの場所。ファイルがなくてもエラーにはならない
const BGM_FILE = 'audio/bgm.mp3';

// BGMのテンポ（Cubaseで作った曲のBPMに合わせる）
// 隕石や星はこのテンポの「拍」に合わせて降ってくる
const BPM = 120;

// 1小節が何拍か（4/4拍子なら 4）
const BEATS_PER_BAR = 4;

// ループする長さ（小節数）
//   0  … 曲の最初と最後の無音を自動でカットしてループ
//   8 など … 「曲の頭から8小節ぶん」をぴったりループ（おすすめ）
//   mp3は前後に小さな無音が入ることがあるので、小節数を指定すると確実
const LOOP_BARS = 0;

// ゲーム画面の大きさ（スマホ縦持ちの比率）。実際の表示は画面に合わせて拡大・縮小する
const W = 360;
const H = 640;

// 宇宙船がキー操作で動く速さ（1秒あたりのピクセル）
const SHIP_SPEED = 320;

// ニアミス判定の距離（この距離より近くをよけたらボーナス）
const NEAR_MISS_DISTANCE = 16;


// -----------------------------------------------------
// 2. HTMLの部品を取ってくる
// -----------------------------------------------------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const overScreen = document.getElementById('overScreen');
const startBtn = document.getElementById('startBtn');
const retryBtn = document.getElementById('retryBtn');
const bgmBtn = document.getElementById('bgmBtn');
const finalScoreEl = document.getElementById('finalScore');
const bestScoreEl = document.getElementById('bestScore');


// -----------------------------------------------------
// 3. 画面サイズの調整（PCでもスマホでもちょうどよく表示する）
// -----------------------------------------------------
function resize() {
  // 画面に収まる最大の倍率を計算
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  const cssW = Math.floor(W * scale);
  const cssH = Math.floor(H * scale);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';

  // 高解像度の画面（スマホなど）でもぼやけないように、実際のピクセル数を増やす
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  // これ以降は「W×H の画面」として描けば自動で拡大される
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
}
window.addEventListener('resize', resize);
resize();


// -----------------------------------------------------
// 4. ブラウザに保存する値（ハイスコアとBGMのON/OFF）
//    保存できない環境でも止まらないように try/catch で囲む
// -----------------------------------------------------
function loadValue(key, defaultValue) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? defaultValue : JSON.parse(v);
  } catch (e) {
    return defaultValue;
  }
}
function saveValue(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // 保存できなくてもゲームは続ける
  }
}


// -----------------------------------------------------
// 5. BGM（Web Audio API）
// -----------------------------------------------------
let audioCtx = null;   // 音を鳴らすための本体
let bgmGain = null;    // 音量つまみ（ON/OFFに使う）
let bgmOn = loadValue('starDodger.bgmOn', true);
let loopLength = 0;    // ループ1周の長さ（秒）

// 拍を数えるための時計
//   audio: true  … BGMの再生位置に合わせる（曲とズレない）
//   audio: false … BGMがないときはブラウザの時計を使う
let clock = { audio: false, t0: performance.now() / 1000 };

// ページを開いたらすぐにBGMファイルの読み込みを始めておく
// ファイルがない（404）・ファイルを直接開いた（file://）などのときは null になるだけ
const bgmFileLoad = fetch(BGM_FILE)
  .then(res => {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.arrayBuffer();
  })
  .catch(() => {
    console.info('BGMファイルが見つからないので、BGMなしで動きます: ' + BGM_FILE);
    return null;
  });

// 音の準備。ブラウザのルールで「ボタンを押したとき」にしか音を出せないので、
// スタートボタンを押したときに呼ぶ
function initAudio() {
  if (audioCtx) {
    audioCtx.resume();
    return;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return; // Web Audio に対応していないブラウザ

  audioCtx = new AudioContextClass();
  bgmGain = audioCtx.createGain();
  bgmGain.gain.value = bgmOn ? 1 : 0;
  bgmGain.connect(audioCtx.destination);

  // 読み込んだファイルを音のデータに変換して再生
  bgmFileLoad
    .then(data => (data ? audioCtx.decodeAudioData(data) : null))
    .then(buffer => {
      if (buffer) startBgm(buffer);
    })
    .catch(e => console.warn('BGMの読み込みに失敗しました', e));
}

// BGMをすき間なくループ再生する
function startBgm(buffer) {
  const beatSec = 60 / BPM;

  // ループの開始位置と終了位置を決める
  const loopStart = findSoundStart(buffer);
  let loopEnd;
  if (LOOP_BARS > 0) {
    // 小節数が指定されていれば、拍の長さからぴったり計算する
    loopEnd = Math.min(buffer.duration, loopStart + LOOP_BARS * BEATS_PER_BAR * beatSec);
  } else {
    // 指定がなければ、曲の最後の無音をカット
    loopEnd = findSoundEnd(buffer);
  }

  // AudioBufferSourceNode の loop 機能を使うと、つなぎ目に隙間ができない
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.loopStart = loopStart;
  source.loopEnd = loopEnd;
  source.connect(bgmGain);

  // 少しだけ先の時刻に再生を予約して、その時刻を「拍の0番」にする
  const t0 = audioCtx.currentTime + 0.05;
  source.start(t0, loopStart);

  loopLength = loopEnd - loopStart;
  clock = { audio: true, t0: t0 };
}

// 曲の頭にある無音の長さを調べる（mp3が入れる小さな無音の対策。最大0.2秒まで）
function findSoundStart(buffer) {
  const limit = Math.min(buffer.length, Math.floor(buffer.sampleRate * 0.2));
  for (let i = 0; i < limit; i++) {
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      if (Math.abs(buffer.getChannelData(ch)[i]) > 0.001) return i / buffer.sampleRate;
    }
  }
  return 0;
}

// 曲の最後にある無音を調べる（最大0.2秒まで）
function findSoundEnd(buffer) {
  const limit = Math.max(0, buffer.length - Math.floor(buffer.sampleRate * 0.2));
  for (let i = buffer.length - 1; i >= limit; i--) {
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      if (Math.abs(buffer.getChannelData(ch)[i]) > 0.001) return (i + 1) / buffer.sampleRate;
    }
  }
  return buffer.duration;
}

// BGMのON/OFF切り替え。
// 曲は止めずに音量だけ0にするので、拍の時計はズレない
function toggleBgm() {
  bgmOn = !bgmOn;
  saveValue('starDodger.bgmOn', bgmOn);
  updateBgmButton();
  if (bgmGain) {
    bgmGain.gain.setTargetAtTime(bgmOn ? 1 : 0, audioCtx.currentTime, 0.05);
  }
}
function updateBgmButton() {
  bgmBtn.textContent = bgmOn ? '♪ BGM: ON' : '♪ BGM: OFF';
}
bgmBtn.addEventListener('click', toggleBgm);
updateBgmButton();


// -----------------------------------------------------
// 6. リズム（拍）の管理
//    8分音符ごとに onTick() を呼ぶ
// -----------------------------------------------------
let lastTickKey = null;

// 今が何番目の8分音符かを計算する
function currentTick() {
  const now = clock.audio ? audioCtx.currentTime : performance.now() / 1000;
  const t = now - clock.t0;
  if (t < 0) return null;

  const eighthSec = 60 / BPM / 2;
  let loopIndex = 0;
  let pos = t;
  // BGMがループするときは、曲の中での位置に直す（曲と拍がズレないように）
  if (clock.audio && loopLength > 0) {
    loopIndex = Math.floor(t / loopLength);
    pos = t - loopIndex * loopLength;
  }
  const tick = Math.floor(pos / eighthSec);
  return { key: loopIndex + ':' + tick, tick: tick };
}

// 毎フレーム呼んで、新しい8分音符に入ったら onTick() を呼ぶ
function checkRhythm() {
  const t = currentTick();
  if (!t || t.key === lastTickKey) return;
  lastTickKey = t.key;
  onTick(t.tick);
}

// 8分音符ごとの処理（ここで隕石や星を出す）
function onTick(tick) {
  const isBeat = tick % 2 === 0;           // 表拍（1, 2, 3, 4拍目）か
  const beatInBar = Math.floor(tick / 2) % BEATS_PER_BAR; // 小節の中で何拍目か（0から）

  if (isBeat) beatPulse = 1;               // 拍に合わせて画面を光らせる

  if (state !== 'playing') return;

  if (isBeat) {
    // 表拍：だいたい毎回隕石を出す
    if (Math.random() < 0.8) spawnMeteor();
    // 2拍目と4拍目：ときどき星を出す
    if (beatInBar % 2 === 1 && Math.random() < 0.35) spawnStar();
  } else {
    // 裏拍：時間がたつほど隕石が出やすくなる（15秒後から少しずつ）
    const chance = Math.min(0.5, (elapsed - 15) / 60);
    if (Math.random() < chance) spawnMeteor();
  }
}


// -----------------------------------------------------
// 7. ゲームの状態
// -----------------------------------------------------
// 'title'（スタート画面） / 'playing'（プレイ中） / 'dying'（爆発中） / 'over'（ゲームオーバー）
let state = 'title';

const ship = { x: W / 2, y: H - 90, r: 12 };

let meteors = [];    // 隕石
let stars = [];      // 取ると点が入る星
let particles = [];  // 爆発やキラキラの粒
let popups = [];     // 「NICE!」などの文字

let score = 0;
let combo = 0;       // 星を続けて取った数
let elapsed = 0;     // プレイ時間（秒）
let speedMul = 1;    // 落ちてくる速さの倍率（時間とともに上がる）
let dyingTimer = 0;
let beatPulse = 0;   // 拍で光らせる強さ（1→0に減っていく）
let best = loadValue('starDodger.best', 0);

// コンボ数からスコア倍率を計算（3個ごとに ×1 アップ、最大 ×5）
function multiplier() {
  return Math.min(5, 1 + Math.floor(combo / 3));
}

// ゲーム開始・リトライ
function startGame() {
  meteors = [];
  stars = [];
  particles = [];
  popups = [];
  score = 0;
  combo = 0;
  elapsed = 0;
  speedMul = 1;
  ship.x = W / 2;
  // BGMがないときは、スタートした瞬間を拍の0番にする
  if (!clock.audio) clock = { audio: false, t0: performance.now() / 1000 };
  lastTickKey = null;

  state = 'playing';
  startScreen.classList.add('hidden');
  overScreen.classList.add('hidden');
}

// 隕石に当たったとき
function gameOver() {
  state = 'dying';
  dyingTimer = 1.0;   // 1秒爆発を見せてからゲームオーバー画面へ
  explode(ship.x, ship.y, ['#ffb347', '#ff6b4a', '#fff2a8'], 40);
}

function showGameOver() {
  state = 'over';
  if (score > best) {
    best = score;
    saveValue('starDodger.best', best);
  }
  finalScoreEl.textContent = score;
  bestScoreEl.textContent = best;
  overScreen.classList.remove('hidden');
}

startBtn.addEventListener('click', () => {
  initAudio();   // 音はボタンを押したときに準備する
  startGame();
});
retryBtn.addEventListener('click', startGame);


// -----------------------------------------------------
// 8. 操作（キーボードとタッチ）
// -----------------------------------------------------
const keys = { left: false, right: false };
let pointerActive = false;  // 指（またはマウス）で操作中か
let pointerX = W / 2;       // 指の位置（ゲーム画面の座標）

window.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') { keys.left = true; e.preventDefault(); }
  if (e.key === 'ArrowRight') { keys.right = true; e.preventDefault(); }
});
window.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft') keys.left = false;
  if (e.key === 'ArrowRight') keys.right = false;
});

// 画面上の位置を、ゲーム画面（W×H）の座標に直す
function toGameX(clientX) {
  const rect = canvas.getBoundingClientRect();
  return (clientX - rect.left) / rect.width * W;
}

// 指で触ったら、その左右位置に宇宙船がついてくる
canvas.addEventListener('pointerdown', e => {
  pointerActive = true;
  pointerX = toGameX(e.clientX);
  canvas.setPointerCapture(e.pointerId); // 画面の外に指が出ても追いかける
});
canvas.addEventListener('pointermove', e => {
  if (pointerActive) pointerX = toGameX(e.clientX);
});
canvas.addEventListener('pointerup', () => { pointerActive = false; });
canvas.addEventListener('pointercancel', () => { pointerActive = false; });


// -----------------------------------------------------
// 9. 隕石・星・粒をつくる
// -----------------------------------------------------
function spawnMeteor() {
  const r = 13 + Math.random() * 14 + Math.min(6, elapsed / 15); // だんだん大きいのも出る
  // ゴツゴツした形にするため、角ごとに半径を少しずつ変える
  const points = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    points.push(0.75 + Math.random() * 0.35);
  }
  meteors.push({
    x: r + Math.random() * (W - r * 2),
    y: -r,
    r: r,
    vy: (150 + Math.random() * 80) * speedMul,
    vx: (Math.random() - 0.5) * 30,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 2,
    points: points,
    passed: false,  // 宇宙船の横を通りすぎたか（ニアミス判定用）
  });
}

function spawnStar() {
  stars.push({
    x: 20 + Math.random() * (W - 40),
    y: -15,
    r: 11,
    vy: 130 * speedMul,
    angle: 0,
    phase: Math.random() * Math.PI * 2, // ゆらゆら揺れるタイミング
  });
}

// 粒をばらまく（爆発・星を取ったとき）
function explode(x, y, colors, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 220;
    particles.push({
      x: x, y: y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.4 + Math.random() * 0.6,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
}

// 文字を出す（ふわっと上に消えていく）
function addPopup(x, y, text, color) {
  popups.push({ x: x, y: y, text: text, color: color, life: 0.9 });
}


// -----------------------------------------------------
// 10. 背景の星（流れていく演出）
// -----------------------------------------------------
const bgStars = [];
for (let i = 0; i < 90; i++) {
  bgStars.push({
    x: Math.random() * W,
    y: Math.random() * H,
    z: Math.random(),   // 0 = 遠い（ゆっくり・暗い） / 1 = 近い（速い・明るい）
  });
}

function updateBackground(dt) {
  // プレイ中は速く流れて「進んでいる」感じを出す
  const base = state === 'playing' ? 60 * speedMul : 25;
  for (const s of bgStars) {
    s.y += (base + s.z * base * 3) * dt;
    if (s.y > H) {
      s.y -= H;
      s.x = Math.random() * W;
    }
  }
}


// -----------------------------------------------------
// 11. 毎フレームの更新（動き・当たり判定）
// -----------------------------------------------------
function update(dt) {
  checkRhythm();
  updateBackground(dt);
  beatPulse = Math.max(0, beatPulse - dt * 4);

  if (state === 'playing') {
    elapsed += dt;
    // 時間とともに速くなる（約80秒で最大の2.6倍）
    speedMul = Math.min(2.6, 1 + elapsed * 0.02);

    // --- 宇宙船の移動 ---
    if (pointerActive) {
      // 指の位置へなめらかに近づく
      ship.x += (pointerX - ship.x) * Math.min(1, dt * 18);
    } else {
      if (keys.left) ship.x -= SHIP_SPEED * dt;
      if (keys.right) ship.x += SHIP_SPEED * dt;
    }
    ship.x = Math.max(ship.r + 4, Math.min(W - ship.r - 4, ship.x));

    // --- 隕石 ---
    for (const m of meteors) {
      m.y += m.vy * dt;
      m.x += m.vx * dt;
      m.angle += m.spin * dt;

      const dx = m.x - ship.x;
      const dy = m.y - ship.y;
      const hitDist = ship.r + m.r * 0.8; // 見た目より少し小さめに判定（やさしめ）

      // 当たった！
      if (Math.hypot(dx, dy) < hitDist) {
        gameOver();
        break;
      }

      // ニアミス判定：宇宙船の高さを通りすぎた瞬間に、横の距離を調べる
      if (!m.passed && m.y > ship.y) {
        m.passed = true;
        const gap = Math.abs(dx) - hitDist;
        if (gap >= 0 && gap < NEAR_MISS_DISTANCE) {
          const pts = 5 * multiplier();
          score += pts;
          addPopup(ship.x, ship.y - 30, 'NICE! +' + pts, '#7af5ff');
          explode((m.x + ship.x) / 2, ship.y, ['#7af5ff', '#ffffff'], 8);
        }
      }
    }
    // 画面の下に出た隕石は消す
    meteors = meteors.filter(m => m.y < H + m.r * 2);

    // --- 星 ---
    for (const s of stars) {
      s.y += s.vy * dt;
      s.angle += dt * 2;
      s.phase += dt * 3;
      s.x += Math.sin(s.phase) * 20 * dt;

      // 星を取った！
      if (Math.hypot(s.x - ship.x, s.y - ship.y) < ship.r + s.r + 4) {
        s.taken = true;
        combo++;
        const mul = multiplier();
        const pts = 10 * mul;
        score += pts;
        addPopup(s.x, s.y - 20, '+' + pts + (mul > 1 ? '  ×' + mul : ''), '#ffe27a');
        explode(s.x, s.y, ['#ffe27a', '#fff6c8'], 14);
      } else if (s.y > H + 20) {
        // 取り逃したらコンボがリセット
        s.missed = true;
        if (combo > 0) addPopup(W / 2, H - 40, 'COMBO LOST', '#ff8a8a');
        combo = 0;
      }
    }
    stars = stars.filter(s => !s.taken && !s.missed);
  }

  // 爆発中：少し待ってからゲームオーバー画面を出す
  if (state === 'dying') {
    dyingTimer -= dt;
    if (dyingTimer <= 0) showGameOver();
  }

  // --- 粒と文字（いつでも動かす） ---
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= dt;
  }
  particles = particles.filter(p => p.life > 0);

  for (const p of popups) {
    p.y -= 40 * dt;
    p.life -= dt;
  }
  popups = popups.filter(p => p.life > 0);
}


// -----------------------------------------------------
// 12. 描画（毎フレーム画面を描きなおす）
// -----------------------------------------------------
function draw() {
  // 背景（暗い宇宙のグラデーション）
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#05060f');
  g.addColorStop(1, '#121a3a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  drawBackgroundStars();

  for (const s of stars) drawStar(s);
  for (const m of meteors) drawMeteor(m);
  if (state === 'playing') drawShip();

  // 粒
  for (const p of particles) {
    ctx.globalAlpha = Math.min(1, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;

  // 文字
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px sans-serif';
  for (const p of popups) {
    ctx.globalAlpha = Math.min(1, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;

  if (state === 'playing' || state === 'dying') drawHud();
}

function drawBackgroundStars() {
  for (const s of bgStars) {
    // 拍に合わせて少し明るくなる
    const alpha = 0.25 + s.z * 0.6 + beatPulse * 0.25;
    ctx.fillStyle = 'rgba(200, 215, 255, ' + Math.min(1, alpha) + ')';
    const size = 0.8 + s.z * 1.8;
    // 近い星は少し縦長にして「流れている」感じを出す
    ctx.fillRect(s.x, s.y, size, size * (1 + s.z * 3));
  }
}

// 宇宙船（三角形の機体＋窓＋エンジンの炎）
function drawShip() {
  const x = ship.x;
  const y = ship.y;

  // エンジンの炎（ちらちら揺れる）
  const flame = 14 + Math.random() * 8;
  ctx.fillStyle = '#ff9f43';
  ctx.beginPath();
  ctx.moveTo(x - 6, y + 12);
  ctx.lineTo(x, y + 12 + flame);
  ctx.lineTo(x + 6, y + 12);
  ctx.fill();
  ctx.fillStyle = '#fff2a8';
  ctx.beginPath();
  ctx.moveTo(x - 3, y + 12);
  ctx.lineTo(x, y + 12 + flame * 0.6);
  ctx.lineTo(x + 3, y + 12);
  ctx.fill();

  // 拍に合わせて光る
  ctx.shadowColor = '#7aa8ff';
  ctx.shadowBlur = 10 + beatPulse * 20;

  // 翼
  ctx.fillStyle = '#5b7cff';
  ctx.beginPath();
  ctx.moveTo(x - 18, y + 14);
  ctx.lineTo(x, y - 2);
  ctx.lineTo(x + 18, y + 14);
  ctx.closePath();
  ctx.fill();

  // 機体
  ctx.fillStyle = '#e8ecff';
  ctx.beginPath();
  ctx.moveTo(x, y - 20);
  ctx.lineTo(x + 9, y + 12);
  ctx.lineTo(x - 9, y + 12);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // 窓
  ctx.fillStyle = '#3ad6ff';
  ctx.beginPath();
  ctx.arc(x, y - 2, 4, 0, Math.PI * 2);
  ctx.fill();
}

// 隕石（ゴツゴツした多角形＋クレーター）
function drawMeteor(m) {
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.rotate(m.angle);

  ctx.fillStyle = '#7a6656';
  ctx.strokeStyle = '#a58b74';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const n = m.points.length;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = m.r * m.points[i];
    if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // クレーター
  ctx.fillStyle = '#5e4e42';
  ctx.beginPath();
  ctx.arc(-m.r * 0.3, -m.r * 0.2, m.r * 0.2, 0, Math.PI * 2);
  ctx.arc(m.r * 0.3, m.r * 0.25, m.r * 0.14, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// 取れる星（光る5つのとげの星）
function drawStar(s) {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.angle);
  ctx.shadowColor = '#ffe27a';
  ctx.shadowBlur = 15 + beatPulse * 10;
  ctx.fillStyle = '#ffe27a';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? s.r : s.r * 0.45;  // 外側と内側を交互に
    if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// 画面上のスコア表示
function drawHud() {
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('SCORE ' + score, 14, 32);

  const mul = multiplier();
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = mul > 1 ? '#ffe27a' : '#9aa6d8';
  ctx.fillText('COMBO ' + combo + '   ×' + mul, 14, 54);
}


// -----------------------------------------------------
// 13. ゲームループ（1秒に約60回 update → draw をくり返す）
// -----------------------------------------------------
let lastTime = performance.now();

function frame(now) {
  // 前のフレームからの経過時間（秒）。タブを切り替えたときに飛びすぎないよう上限をつける
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  update(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
