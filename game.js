'use strict';

// ── STATE ──────────────────────────────────────────────────────────────────
const state = {
  level: 'easy',
  questions: [],
  current: 0,
  score: 0,
  combo: 0,
  maxCombo: 0,
  correct: 0,
  answered: false,
  dailyStreak: 0,
  highScore: 0,
  // infinite mode
  infinite: false,
  infBaseLevel: 'easy',
  lives: 3,
  consecutiveCorrect: 0,
  infiniteQ: 0,
};

const TOTAL_Q   = 10;
const MAX_LIVES = 5;
const LIFE_STREAK = 10; // consecutive corrects to earn +1 life

const MULT = [
  { threshold: 0,  mult: 1,   label: '',      lvClass: '' },
  { threshold: 3,  mult: 1.5, label: '×1.5',  lvClass: 'lv1' },
  { threshold: 5,  mult: 2,   label: '×2',    lvClass: 'lv2' },
  { threshold: 10, mult: 3,   label: '×3',    lvClass: 'lv3' },
  { threshold: 20, mult: 4,   label: '×4 🔥', lvClass: 'lv4' },
];

const MILESTONE_MSGS = {
  3:  { text: '🔥 Combo x3!',     lv: 'lv1' },
  5:  { text: '⚡ Em chamas! x5',  lv: 'lv2' },
  10: { text: '💥 INCRÍVEL! x10', lv: 'lv3' },
  20: { text: '☠️  INFERNO! x20', lv: 'lv4' },
};

// ── TUTORIAL SLIDES ────────────────────────────────────────────────────────
const TUTORIAL_SLIDES = [
  {
    icon: '⚖️',
    title: 'O que é uma Equação?',
    html: `
      <p class="tut-text">Uma <strong>equação</strong> é uma igualdade que contém uma <span class="hl">incógnita</span> — normalmente chamada de <span class="hl-blue">x</span>.</p>
      <div class="tut-visual step1">
        <span class="eq-side">2x + 6</span>
        <span class="eq-equal">=</span>
        <span class="eq-side">0</span>
      </div>
      <p class="tut-text step2">Nosso objetivo é descobrir o <span class="hl">valor de x</span> que torna a igualdade verdadeira.</p>
      <div class="tut-tip step3">💡 Cada tipo de equação tem um método próprio para resolver</div>
    `,
  },
  {
    icon: '📐',
    title: '1º Grau Básico: ax + b = 0',
    html: `
      <p class="tut-text">O <strong>x</strong> aparece apenas uma vez, sem expoente. Para resolver: <span class="hl">isole o x</span>.</p>
      <div class="tut-steps">
        <div class="tut-step step1"><span class="step-num">1</span><span class="step-eq">2x + 6 = 0</span><span class="step-hint">equação original</span></div>
        <div class="tut-step step2"><span class="step-num">2</span><span class="step-eq">2x = −6</span><span class="step-hint">passe +6 para o outro lado (vira −6)</span></div>
        <div class="tut-step step3"><span class="step-num">3</span><span class="step-eq">x = −6 ÷ 2</span><span class="step-hint">divida pelo coeficiente de x</span></div>
        <div class="tut-step step4 answer"><span class="step-num">✓</span><span class="step-eq">x = −3</span><span class="step-hint">resposta!</span></div>
      </div>
    `,
  },
  {
    icon: '⚡',
    title: '1º Grau Avançado: ax + b = cx + d',
    html: `
      <p class="tut-text">O <strong>x</strong> aparece nos dois lados. <span class="hl">Junte os x de um lado</span> e os números do outro.</p>
      <div class="tut-steps">
        <div class="tut-step step1"><span class="step-num">1</span><span class="step-eq">3x + 7 = x + 1</span></div>
        <div class="tut-step step2"><span class="step-num">2</span><span class="step-eq">3x − x = 1 − 7</span><span class="step-hint">x para esquerda, números para direita</span></div>
        <div class="tut-step step3"><span class="step-num">3</span><span class="step-eq">2x = −6</span></div>
        <div class="tut-step step4 answer"><span class="step-num">✓</span><span class="step-eq">x = −3</span></div>
      </div>
    `,
  },
  {
    icon: '📈',
    title: '2º Grau: ax² + bx + c = 0',
    html: `
      <p class="tut-text">O <strong>x</strong> aparece ao <span class="hl">quadrado</span>. Esse tipo pode ter <strong>2</strong>, <strong>1</strong> ou <strong>nenhuma</strong> solução real.</p>
      <div class="tut-visual step1">
        <span class="eq-box-demo">x² − 5x + 6 = 0</span>
      </div>
      <div class="tut-cases step2">
        <div class="tut-case">2 raízes<br><small>Δ &gt; 0</small></div>
        <div class="tut-case">1 raiz<br><small>Δ = 0</small></div>
        <div class="tut-case dim">sem raízes<br><small>Δ &lt; 0</small></div>
      </div>
      <p class="tut-text step3">Usamos a <span class="hl">Fórmula de Bhaskara</span> para resolver.</p>
    `,
  },
  {
    icon: '🔢',
    title: 'Fórmula de Bhaskara',
    html: `
      <div class="tut-formula-block step1">
        <div class="formula-label">Discriminante (Δ)</div>
        <div class="formula-main">Δ = b² − 4ac</div>
      </div>
      <div class="tut-formula-block step2">
        <div class="formula-label">Raízes da equação</div>
        <div class="formula-main">x = <span class="frac"><span class="frac-num">−b ± √Δ</span><span class="frac-den">2a</span></span></div>
      </div>
      <div class="tut-tip step3">⚠️ Se Δ &lt; 0, não há raízes reais &nbsp;|&nbsp; Se Δ = 0, há uma raiz dupla</div>
    `,
  },
  {
    icon: '🏆',
    title: 'Exemplo Passo a Passo',
    html: `
      <div class="tut-steps tight">
        <div class="tut-step step1"><span class="step-num">?</span><span class="step-eq">x² − 5x + 6 = 0</span><span class="step-hint">a=1, b=−5, c=6</span></div>
        <div class="tut-step step2"><span class="step-num">Δ</span><span class="step-eq">(−5)² − 4·1·6 = 25−24 = 1</span></div>
        <div class="tut-step step3"><span class="step-num">x</span><span class="step-eq">(5 ± 1) ÷ 2</span></div>
        <div class="tut-step step4 answer"><span class="step-num">✓</span><span class="step-eq">x₁ = 3 &nbsp;&nbsp; x₂ = 2</span></div>
      </div>
    `,
  },
];

const TUT_SLIDE_DURATION = 7000;
const STEP_DELAYS = [0, 700, 1400, 2100];

// ── DOM ────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const screens = {
  menu:         $('screen-menu'),
  tutorial:     $('screen-tutorial'),
  infStart:     $('screen-inf-start'),
  game:         $('screen-game'),
  result:       $('screen-result'),
  infiniteOver: $('screen-infinite-over'),
  credits:      $('screen-credits'),
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ── PERSISTENCE ────────────────────────────────────────────────────────────
function loadPersistence() {
  const today = new Date().toDateString();
  const lastDate = localStorage.getItem('lastPlayDate');
  let streak = parseInt(localStorage.getItem('currentStreak') || '0', 10);

  if (!lastDate) {
    // first play ever
  } else if (lastDate === today) {
    // played today
  } else if (lastDate === new Date(Date.now() - 86400000).toDateString()) {
    // played yesterday — will increment on end
  } else {
    streak = 0;
    localStorage.setItem('currentStreak', '0');
  }

  state.dailyStreak = streak;
  state.highScore = parseInt(localStorage.getItem('highScore') || '0', 10);
}

function savePersistence() {
  const today = new Date().toDateString();
  const lastDate = localStorage.getItem('lastPlayDate');
  let streak = state.dailyStreak;

  if (lastDate !== today) {
    streak += 1;
    localStorage.setItem('currentStreak', String(streak));
    localStorage.setItem('lastPlayDate', today);
    state.dailyStreak = streak;
  }

  if (state.score > state.highScore) {
    state.highScore = state.score;
    localStorage.setItem('highScore', String(state.score));
  }
}

function saveInfiniteRecord(baseLevel, score, qReached) {
  const hsKey   = `infHS_${baseLevel}`;
  const bestKey = `infBest_${baseLevel}`;
  const prevHS   = parseInt(localStorage.getItem(hsKey)   || '0', 10);
  const prevBest = parseInt(localStorage.getItem(bestKey) || '0', 10);
  let newRecord = false;
  if (score > prevHS)   { localStorage.setItem(hsKey,   String(score));    newRecord = true; }
  if (qReached > prevBest) { localStorage.setItem(bestKey, String(qReached)); newRecord = true; }
  return newRecord;
}

function getInfiniteRecord(baseLevel) {
  return {
    hs:   parseInt(localStorage.getItem(`infHS_${baseLevel}`)   || '0', 10),
    best: parseInt(localStorage.getItem(`infBest_${baseLevel}`) || '0', 10),
  };
}

// ── MATH HELPERS ───────────────────────────────────────────────────────────
function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randIntNonZero(min, max) { let v; do { v = randInt(min, max); } while (v === 0); return v; }
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── STANDARD GENERATORS ───────────────────────────────────────────────────
function generateEasyLinear() {
  const a = randIntNonZero(1, 6);
  const answer = randInt(-10, 10);
  return { type: 'linear1', a, b: -a * answer, answer };
}

function generateMediumLinear() {
  const answer = randInt(-8, 8);
  let a, c;
  do { a = randInt(1, 6); c = randInt(0, 5); } while (a === c);
  const b = randInt(-12, 12);
  const d = (a - c) * answer + b;
  return { type: 'linear2', a, b, c, d, answer };
}

function generateHardQuadratic() {
  const r1 = randInt(-8, 8), r2 = randInt(-8, 8);
  return { type: 'quadratic', a: 1, b: -(r1 + r2), c: r1 * r2, r1, r2 };
}

// ── INFINITE SCALED GENERATORS ─────────────────────────────────────────────
function getInfiniteTier(questionNum) {
  return Math.min(Math.floor(questionNum / 10), 14);
}

function buildScaledLinear1(tier) {
  const cfgs = [
    { maxA: 1, maxAns: 5  },
    { maxA: 2, maxAns: 10 },
    { maxA: 3, maxAns: 15 },
    { maxA: 5, maxAns: 20 },
    { maxA: 8, maxAns: 35 },
  ];
  const { maxA, maxAns } = cfgs[Math.min(tier, 4)];
  const a = randIntNonZero(1, maxA);
  const answer = randInt(-maxAns, maxAns);
  return { type: 'linear1', a, b: -a * answer, answer };
}

function buildScaledLinear2(tier) {
  const cfgs = [
    { maxA: 2, maxAns: 6  },
    { maxA: 3, maxAns: 10 },
    { maxA: 5, maxAns: 15 },
    { maxA: 7, maxAns: 20 },
    { maxA: 10, maxAns: 35 },
  ];
  const { maxA, maxAns } = cfgs[Math.min(tier, 4)];
  const answer = randInt(-maxAns, maxAns);
  let a, c;
  do { a = randInt(1, maxA); c = randInt(0, maxA - 1); } while (a === c);
  const b = randInt(-maxAns, maxAns);
  const d = (a - c) * answer + b;
  return { type: 'linear2', a, b, c, d, answer };
}

function buildScaledQuadratic(tier) {
  const maxRoots = [4, 5, 7, 9, 11, 12, 13, 15, 18, 20, 23, 26, 30, 35, 40];
  const r1 = randInt(-maxRoots[tier], maxRoots[tier]);
  const r2 = randInt(-maxRoots[tier], maxRoots[tier]);
  return { type: 'quadratic', a: 1, b: -(r1 + r2), c: r1 * r2, r1, r2 };
}

function selectInfiniteType(baseLevel, tier) {
  const r = Math.random();
  if (baseLevel === 'easy') {
    if (tier === 0) return 'linear1';
    if (tier === 1) return r < 0.60 ? 'linear1' : 'linear2';
    if (tier === 2) return r < 0.20 ? 'linear1' : 'linear2';
    if (tier === 3) return r < 0.10 ? 'linear2' : 'quadratic';
    return 'quadratic';
  }
  if (baseLevel === 'medium') {
    if (tier === 0) return 'linear2';
    if (tier === 1) return r < 0.40 ? 'linear2' : 'quadratic';
    if (tier === 2) return r < 0.10 ? 'linear2' : 'quadratic';
    return 'quadratic';
  }
  return 'quadratic';
}

function buildInfiniteQuestion(baseLevel, questionNum) {
  const tier = getInfiniteTier(questionNum);
  const type = selectInfiniteType(baseLevel, tier);

  let eq;
  if (type === 'linear1')    eq = buildScaledLinear1(tier);
  else if (type === 'linear2') eq = buildScaledLinear2(tier);
  else                        eq = buildScaledQuadratic(tier);

  if (eq.type === 'quadratic') {
    const correctLabel = quadraticLabel(eq.r1, eq.r2);
    const options = shuffle([correctLabel, ...makeQuadraticDistractors(eq.r1, eq.r2)]);
    return { eq, correctLabel, options };
  }
  const correctLabel = `x = ${eq.answer}`;
  const options = shuffle([correctLabel, ...makeLinearDistractors(eq.answer)]);
  return { eq, correctLabel, options };
}

// ── DISTRACTORS ────────────────────────────────────────────────────────────
function makeLinearDistractors(answer) {
  const offsets = shuffle([1, -1, 2, -2, 3, -3, 4, -4]);
  const seen = new Set([String(answer)]);
  const result = [];
  for (const d of offsets) {
    const v = answer + d;
    if (!seen.has(String(v))) { seen.add(String(v)); result.push(`x = ${v}`); }
    if (result.length === 3) break;
  }
  return result;
}

function makeQuadraticDistractors(r1, r2) {
  const correct = quadraticLabel(r1, r2);
  const offsets = [1, -1, 2, -2, 3, -3];
  const result = [];
  for (const d1 of offsets) {
    for (const d2 of offsets) {
      const label = quadraticLabel(r1 + d1, r2 + d2);
      if (label !== correct && !result.includes(label)) result.push(label);
      if (result.length >= 6) break;
    }
    if (result.length >= 6) break;
  }
  return shuffle(result).slice(0, 3);
}

function quadraticLabel(r1, r2) {
  if (r1 === r2) return `x = ${r1} (dupla)`;
  const [lo, hi] = r1 < r2 ? [r1, r2] : [r2, r1];
  return `x = ${lo}  e  x = ${hi}`;
}

// ── BUILD QUESTION (normal mode) ───────────────────────────────────────────
function buildQuestion(level) {
  if (level === 'easy') {
    const eq = generateEasyLinear();
    const correctLabel = `x = ${eq.answer}`;
    return { eq, correctLabel, options: shuffle([correctLabel, ...makeLinearDistractors(eq.answer)]) };
  }
  if (level === 'medium') {
    const eq = generateMediumLinear();
    const correctLabel = `x = ${eq.answer}`;
    return { eq, correctLabel, options: shuffle([correctLabel, ...makeLinearDistractors(eq.answer)]) };
  }
  const eq = generateHardQuadratic();
  const correctLabel = quadraticLabel(eq.r1, eq.r2);
  return { eq, correctLabel, options: shuffle([correctLabel, ...makeQuadraticDistractors(eq.r1, eq.r2)]) };
}

// ── EQUATION FORMATTING ────────────────────────────────────────────────────
const V   = s => `<span class="eq-var">${s}</span>`;
const OP  = s => `<span class="eq-op">${s}</span>`;
const NUM = n => `<span class="eq-coef">${n}</span>`;

function formatLinear1(a, b) {
  let h = '';
  if (a < 0) h += OP('−');
  if (Math.abs(a) !== 1) h += NUM(Math.abs(a));
  h += V('x');
  if (b !== 0) h += ' ' + OP(b < 0 ? '−' : '+') + ' ' + NUM(Math.abs(b));
  h += ' ' + OP('=') + ' <span class="eq-zero">0</span>';
  return h;
}

function formatLinear2(a, b, c, d) {
  function side(coef, cnst) {
    let h = '';
    if (coef < 0) h += OP('−');
    if (Math.abs(coef) !== 1) h += NUM(Math.abs(coef));
    h += V('x');
    if (cnst !== 0) h += ' ' + OP(cnst < 0 ? '−' : '+') + ' ' + NUM(Math.abs(cnst));
    return h;
  }
  return side(a, b) + ' ' + OP('=') + ' ' + side(c, d);
}

function formatQuadratic(a, b, c) {
  let h = '';
  if (a < 0) h += OP('−');
  if (Math.abs(a) !== 1) h += NUM(Math.abs(a));
  h += V('x²');
  if (b !== 0) {
    h += ' ' + OP(b < 0 ? '−' : '+') + ' ';
    if (Math.abs(b) !== 1) h += NUM(Math.abs(b));
    h += V('x');
  }
  if (c !== 0) h += ' ' + OP(c < 0 ? '−' : '+') + ' ' + NUM(Math.abs(c));
  h += ' ' + OP('=') + ' <span class="eq-zero">0</span>';
  return h;
}

function renderEquation(eq) {
  if (eq.type === 'linear1') return formatLinear1(eq.a, eq.b);
  if (eq.type === 'linear2') return formatLinear2(eq.a, eq.b, eq.c, eq.d);
  return formatQuadratic(eq.a, eq.b, eq.c);
}

function eqTypeLabel(eq) {
  if (eq.type === 'linear1') return '1º Grau — Básico';
  if (eq.type === 'linear2') return '1º Grau — Avançado';
  return '2º Grau';
}

// ── COMBO ─────────────────────────────────────────────────────────────────
function getMultInfo(combo) {
  let info = MULT[0];
  for (const m of MULT) { if (combo >= m.threshold) info = m; }
  return info;
}

function updateComboUI() {
  const { combo } = state;
  const info = getMultInfo(combo);
  $('combo-display').className = 'combo-display ' + info.lvClass;
  $('combo-num').textContent = combo;
  $('combo-mult').textContent = info.label;
  $('combo-fire').textContent = combo >= 3 ? '🔥' : '';
  document.body.classList.toggle('inferno', combo >= 20);
}

function checkMilestone(combo) {
  const msg = MILESTONE_MSGS[combo];
  if (!msg) return;
  const el = $('combo-milestone');
  el.textContent = msg.text;
  el.className = 'combo-milestone show ' + msg.lv;
  setTimeout(() => { el.className = 'combo-milestone'; }, 1300);
}

// ── LIVES ─────────────────────────────────────────────────────────────────
function renderLives(animateIndex, animationType) {
  const el = $('lives-display');
  el.innerHTML = '';
  for (let i = 0; i < MAX_LIVES; i++) {
    const h = document.createElement('span');
    h.className = 'heart' + (i < state.lives ? '' : ' empty');
    if (i === animateIndex) h.classList.add(animationType);
    h.textContent = i < state.lives ? '❤️' : '🖤';
    el.appendChild(h);
  }
}

function showLifeEvent(gained) {
  const el = $('life-event');
  el.textContent = gained ? '❤️ +1 Vida!' : '💔 Vida perdida!';
  el.className = 'life-event ' + (gained ? 'gained' : 'lost');
  setTimeout(() => { el.className = 'life-event'; }, 1500);
}

// ── PARTICLES ─────────────────────────────────────────────────────────────
const COLORS_CORRECT = ['#22c55e', '#4ade80', '#86efac', '#f59e0b', '#60a5fa'];
const COLORS_WRONG   = ['#ef4444', '#f87171', '#fca5a5'];

function spawnParticles(correct) {
  const container = $('particles-container');
  const colors = correct ? COLORS_CORRECT : COLORS_WRONG;
  const count  = correct ? 18 : 8;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `left:${randInt(30,70)}%;top:${randInt(35,55)}%;background:${colors[i%colors.length]};width:${randInt(5,10)}px;height:${randInt(5,10)}px;animation-delay:${i*30}ms;animation-duration:${randInt(600,900)}ms;`;
    container.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }
}

// ── SCORE ─────────────────────────────────────────────────────────────────
function scoreForAnswer() {
  const multFactor = getMultInfo(state.combo).mult;
  if (state.infinite) {
    const tier = getInfiniteTier(state.infiniteQ);
    return Math.round(100 * (tier + 1) * multFactor);
  }
  const base = { easy: 100, medium: 150, hard: 250 }[state.level];
  return Math.round(base * multFactor);
}

function animateScore(from, to) {
  const el = $('current-score');
  const diff = to - from;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    el.textContent = Math.round(from + diff * step / 15);
    if (step >= 15) { el.textContent = to; clearInterval(timer); }
  }, 20);
}

// ── TUTORIAL ───────────────────────────────────────────────────────────────
let tutSlide = 0;
let tutTimer = null;
let tutProgressTimer = null;
const TUT_TICK = 50;

function buildTutorialSlides() {
  const area = $('tut-slide-area');
  const dots = $('tut-dots');
  area.innerHTML = '';
  dots.innerHTML = '';
  TUTORIAL_SLIDES.forEach((slide, i) => {
    const el = document.createElement('div');
    el.className = 'tut-slide' + (i === 0 ? ' active' : '');
    el.id = `tut-slide-${i}`;
    el.innerHTML = `<span class="tut-slide-icon">${slide.icon}</span><div class="tut-slide-title">${slide.title}</div>${slide.html}`;
    area.appendChild(el);
    const dot = document.createElement('div');
    dot.className = 'tut-dot' + (i === 0 ? ' active' : '');
    dot.id = `tut-dot-${i}`;
    dots.appendChild(dot);
  });
}

function revealSlideSteps(slideIndex) {
  const el = $(`tut-slide-${slideIndex}`);
  if (!el) return;
  el.querySelectorAll('.step1,.step2,.step3,.step4').forEach((s, i) => {
    setTimeout(() => s.classList.add('revealed'), STEP_DELAYS[i] || i * 700);
  });
}

function goToSlide(index) {
  const prev    = $(`tut-slide-${tutSlide}`);
  const prevDot = $(`tut-dot-${tutSlide}`);
  if (prev)    prev.classList.add('leaving');
  if (prevDot) { prevDot.classList.remove('active'); prevDot.classList.add('done'); }
  setTimeout(() => { if (prev) prev.classList.remove('active', 'leaving'); }, 350);

  tutSlide = index;
  const next    = $(`tut-slide-${tutSlide}`);
  const nextDot = $(`tut-dot-${tutSlide}`);
  if (next)    next.classList.add('active');
  if (nextDot) { nextDot.classList.remove('done'); nextDot.classList.add('active'); }

  const btnNext = $('btn-tut-next');
  if (tutSlide === TUTORIAL_SLIDES.length - 1) {
    btnNext.textContent = '🚀 Jogar!';
    btnNext.className = 'btn-tut-nav play';
  } else {
    btnNext.textContent = 'Próximo →';
    btnNext.className = 'btn-tut-nav primary';
  }
  $('btn-tut-prev').disabled = tutSlide === 0;
  startSlideTimer();
  setTimeout(() => revealSlideSteps(tutSlide), 300);
}

function startSlideTimer() {
  clearTimeout(tutTimer);
  clearInterval(tutProgressTimer);
  const fill = $('tut-progress-fill');
  fill.style.transition = 'none';
  fill.style.width = '0%';
  void fill.offsetWidth;
  fill.style.transition = `width ${TUT_SLIDE_DURATION}ms linear`;
  fill.style.width = '100%';
  tutTimer = setTimeout(() => {
    if (tutSlide < TUTORIAL_SLIDES.length - 1) goToSlide(tutSlide + 1);
  }, TUT_SLIDE_DURATION);
}

function openTutorial(level) {
  clearTimeout(tutTimer);
  state.level = level;
  tutSlide = 0;
  buildTutorialSlides();
  showScreen('tutorial');
  setTimeout(() => {
    revealSlideSteps(0);
    $('btn-tut-prev').disabled = true;
    $('btn-tut-next').textContent = 'Próximo →';
    $('btn-tut-next').className = 'btn-tut-nav primary';
    startSlideTimer();
  }, 100);
}

function closeTutorial() {
  clearTimeout(tutTimer);
  clearInterval(tutProgressTimer);
  localStorage.setItem('tutorialSeen', '1');
}

// ── INFINITE TIMER ─────────────────────────────────────────────────────────
let qTimer = null;
let qTimerRemaining = 0;
let qTimerTotal = 0;
const TIMER_TICK_MS = 100;
// seconds per question by tier (0 = no timer)
const TIMER_BY_TIER = [0, 120, 90, 70, 55, 40, 30, 20, 15, 10, 8, 7, 6, 5, 5];

function startQuestionTimer(tier) {
  stopQuestionTimer();
  const duration = TIMER_BY_TIER[tier] || 0;
  if (duration === 0) { $('inf-timer-wrap').classList.add('hidden'); return; }
  qTimerTotal = duration;
  qTimerRemaining = duration;
  $('inf-timer-wrap').classList.remove('hidden');
  updateTimerUI();
  qTimer = setInterval(() => {
    qTimerRemaining = Math.max(0, qTimerRemaining - TIMER_TICK_MS / 1000);
    updateTimerUI();
    if (qTimerRemaining <= 0) { clearInterval(qTimer); handleTimerExpired(); }
  }, TIMER_TICK_MS);
}

function stopQuestionTimer() {
  clearInterval(qTimer);
  qTimer = null;
}

function updateTimerUI() {
  const pct = qTimerTotal > 0 ? (qTimerRemaining / qTimerTotal) * 100 : 0;
  const bar = $('inf-timer-bar');
  bar.style.width = pct + '%';
  bar.className = 'inf-timer-bar ' + (pct > 50 ? 'safe' : pct > 20 ? 'warn' : 'danger');
  const mins = Math.floor(qTimerRemaining / 60);
  const secs = Math.floor(qTimerRemaining % 60);
  $('inf-timer-text').textContent = mins > 0
    ? `${mins}:${secs.toString().padStart(2, '0')}`
    : `${secs}s`;
}

function handleTimerExpired() {
  if (state.answered || !state.infinite) return;
  state.answered = true;
  const allBtns = $('options-grid').querySelectorAll('.option-btn');
  allBtns.forEach(b => b.disabled = true);
  const { correctLabel } = state._currentQuestion;
  allBtns.forEach(b => { if (b.textContent === correctLabel) b.classList.add('reveal'); });
  state.combo = 0;
  state.consecutiveCorrect = 0;
  state.lives--;
  state.infiniteQ++;
  renderLives(state.lives, 'losing');
  showLifeEvent(false);
  updateComboUI();
  spawnParticles(false);
  const el = $('feedback-banner');
  el.textContent = '⏰ Tempo Esgotado!';
  el.className = 'feedback-banner show wrong';
  setTimeout(() => { el.className = 'feedback-banner'; }, 700);
  setTimeout(() => {
    if (state.lives <= 0) endInfinite();
    else renderQuestion();
  }, 900);
}

// ── GAME FLOW ──────────────────────────────────────────────────────────────
function startGame() {
  closeTutorial();
  state.infinite = false;
  state.current = 0;
  state.score = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.correct = 0;
  state.answered = false;
  state.questions = Array.from({ length: TOTAL_Q }, () => buildQuestion(state.level));
  document.body.classList.remove('inferno');

  $('current-score').textContent = '0';
  $('q-total').textContent = TOTAL_Q;

  // show normal HUD elements
  $('progress-display').classList.remove('hidden');
  $('lives-display').classList.add('hidden');
  $('inf-badge').classList.add('hidden');
  $('inf-timer-wrap').classList.add('hidden');
  stopQuestionTimer();

  showScreen('game');
  renderQuestion();
}

function showInfStart(level) {
  state.level = level;
  const names = { easy: '🌱 Fácil', medium: '⚡ Médio', hard: '💀 Difícil' };
  $('inf-start-level').textContent = names[level] || level;
  $('inf-start-q').value = '';
  showScreen('infStart');
}

function startInfinite(startQ = 0) {
  state.infinite = true;
  state.infBaseLevel = state.level;
  state.lives = 3;
  state.consecutiveCorrect = 0;
  state.infiniteQ = startQ;
  state.score = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.correct = 0;
  state.answered = false;
  document.body.classList.remove('inferno');

  $('current-score').textContent = '0';
  $('q-total').textContent = '∞';

  // show infinite HUD elements
  $('progress-display').classList.add('hidden');
  $('lives-display').classList.remove('hidden');
  $('inf-badge').classList.remove('hidden');

  renderLives();
  stopQuestionTimer();
  $('inf-timer-wrap').classList.add('hidden');
  showScreen('game');
  renderQuestion();
}

function renderQuestion() {
  let questionData;

  if (state.infinite) {
    questionData = buildInfiniteQuestion(state.infBaseLevel, state.infiniteQ);
    const tier = getInfiniteTier(state.infiniteQ);
    $('q-current').textContent = state.infiniteQ + 1;
    $('inf-q-num').textContent = `Q: ${state.infiniteQ + 1}`;
    $('inf-tier-pill').textContent = `Nível ${tier + 1}/15`;
    const tierProgress = ((state.infiniteQ % 10) / 10) * 100;
    $('progress-bar').style.width = `${tierProgress}%`;
    if (state.infiniteQ === 60) showNoLifeAlert();
    startQuestionTimer(tier);
  } else {
    questionData = state.questions[state.current];
    $('q-current').textContent = state.current + 1;
    $('progress-bar').style.width = `${(state.current / TOTAL_Q) * 100}%`;
  }

  const { eq, correctLabel, options } = questionData;
  state.answered = false;

  $('eq-type-label').textContent = eqTypeLabel(eq);

  const eqBox = $('equation-box');
  eqBox.innerHTML = renderEquation(eq);
  eqBox.style.animation = 'none';
  void eqBox.offsetWidth;
  eqBox.style.animation = '';

  const grid = $('options-grid');
  grid.innerHTML = '';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleAnswer(opt, correctLabel, btn));
    grid.appendChild(btn);
  });

  // store for handleAnswer reference in infinite mode
  state._currentQuestion = questionData;
  updateComboUI();
}

function handleAnswer(chosen, correct, btn) {
  if (state.answered) return;
  state.answered = true;
  stopQuestionTimer();

  const allBtns = $('options-grid').querySelectorAll('.option-btn');
  allBtns.forEach(b => b.disabled = true);

  const isCorrect = chosen === correct;

  if (isCorrect) {
    btn.classList.add('correct');
    state.combo++;
    state.correct++;
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;

    if (state.infinite) {
      state.consecutiveCorrect++;
      // every LIFE_STREAK consecutive corrects → +1 life
      if (state.consecutiveCorrect % LIFE_STREAK === 0 && state.lives < MAX_LIVES && state.infiniteQ < 60) {
        state.lives++;
        renderLives(state.lives - 1, 'gaining');
        showLifeEvent(true);
      }
      state.infiniteQ++;
    }

    const gained = scoreForAnswer();
    const oldScore = state.score;
    state.score += gained;
    animateScore(oldScore, state.score);
    updateComboUI();
    checkMilestone(state.combo);
    spawnParticles(true);
    showFeedback(true);
  } else {
    btn.classList.add('wrong');
    allBtns.forEach(b => { if (b.textContent === correct) b.classList.add('reveal'); });
    state.combo = 0;

    if (state.infinite) {
      state.consecutiveCorrect = 0;
      state.lives--;
      state.infiniteQ++;
      renderLives(state.lives, 'losing');
      showLifeEvent(false);
    }

    updateComboUI();
    spawnParticles(false);
    showFeedback(false);
  }

  setTimeout(() => {
    if (state.infinite) {
      if (state.lives <= 0) endInfinite();
      else renderQuestion();
    } else {
      state.current++;
      if (state.current >= TOTAL_Q) endGame();
      else renderQuestion();
    }
  }, 900);
}

function showNoLifeAlert() {
  const el = $('no-life-alert');
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 5000);
}

function showFeedback(correct) {
  const el = $('feedback-banner');
  el.textContent = correct ? '✓ Correto!' : '✗ Errou!';
  el.className = 'feedback-banner show ' + (correct ? 'correct' : 'wrong');
  setTimeout(() => { el.className = 'feedback-banner'; }, 700);
}

// ── END GAME (quiz normal) ─────────────────────────────────────────────────
function endGame() {
  stopQuestionTimer();
  savePersistence();
  const pct = state.correct / TOTAL_Q;
  let title, stars;
  if (pct === 1)       { title = 'Perfeito! 🏆'; stars = '⭐⭐⭐'; }
  else if (pct >= 0.7) { title = 'Muito Bem!';   stars = '⭐⭐'; }
  else                 { title = 'Continue tentando!'; stars = '⭐'; }

  $('result-title').textContent = title;
  $('result-stars').textContent = stars;
  $('res-score').textContent = state.score;
  $('res-correct').textContent = `${state.correct}/${TOTAL_Q}`;
  $('res-combo').textContent = state.maxCombo;
  $('res-streak').textContent = state.dailyStreak;

  const prevHigh = parseInt(localStorage.getItem('highScore') || '0', 10);
  $('new-record-badge').classList.toggle('hidden', state.score <= prevHigh || state.score === 0);

  $('progress-bar').style.width = '100%';
  showScreen('result');
}

// ── END INFINITE ───────────────────────────────────────────────────────────
function endInfinite() {
  const base      = state.infBaseLevel;
  const qReached  = state.infiniteQ;
  const tier      = getInfiniteTier(qReached);
  const isNew     = saveInfiniteRecord(base, state.score, qReached);
  const rec       = getInfiniteRecord(base);

  const icon = qReached >= 50 ? '🏆' : qReached >= 20 ? '💪' : '☠️';
  const subtitle = qReached >= 50 ? 'Incrível!' : qReached >= 20 ? 'Muito bem!' : 'Fim de Jogo!';

  $('inf-over-icon').textContent = icon;
  $('inf-over-subtitle').textContent = subtitle;
  $('inf-q-reached').textContent = qReached;
  $('inf-final-score').textContent = state.score;
  $('inf-final-combo').textContent = state.maxCombo;
  $('inf-tier-reached').textContent = tier + 1;
  $('inf-best-q').textContent = rec.best;
  $('inf-best-score').textContent = rec.hs;
  $('inf-new-record').classList.toggle('hidden', !isNew);

  document.body.classList.remove('inferno');
  showScreen('infiniteOver');
}

// ── MENU ───────────────────────────────────────────────────────────────────
function updateMenuUI() {
  $('streak-count').textContent = state.dailyStreak;
  $('menu-highscore').textContent = state.highScore;
}

// ── EVENTS ────────────────────────────────────────────────────────────────
document.querySelectorAll('.diff-card').forEach(card => {
  card.addEventListener('click', () => openTutorial(card.dataset.level));
});

document.querySelectorAll('.inf-direct-btn').forEach(btn => {
  btn.addEventListener('click', () => showInfStart(btn.dataset.level));
});

$('btn-skip').addEventListener('click', () => startGame());

$('btn-tut-prev').addEventListener('click', () => {
  clearTimeout(tutTimer);
  if (tutSlide > 0) goToSlide(tutSlide - 1);
});

$('btn-tut-next').addEventListener('click', () => {
  clearTimeout(tutTimer);
  if (tutSlide < TUTORIAL_SLIDES.length - 1) goToSlide(tutSlide + 1);
  else startGame();
});

$('btn-replay').addEventListener('click', () => openTutorial(state.level));
$('btn-infinite').addEventListener('click', () => showInfStart(state.level));

$('btn-menu').addEventListener('click', () => {
  stopQuestionTimer();
  document.body.classList.remove('inferno');
  updateMenuUI();
  showScreen('menu');
});

$('btn-inf-from-q1').addEventListener('click', () => startInfinite(0));
$('btn-inf-from-q').addEventListener('click', () => {
  const raw = parseInt($('inf-start-q').value, 10);
  const startQ = (!isNaN(raw) && raw >= 1) ? raw - 1 : 0;
  startInfinite(startQ);
});
$('btn-inf-start-back').addEventListener('click', () => {
  updateMenuUI();
  showScreen('menu');
});

$('btn-game-menu').addEventListener('click', () => {
  stopQuestionTimer();
  document.body.classList.remove('inferno');
  updateMenuUI();
  showScreen('menu');
});

$('btn-inf-retry').addEventListener('click', () => startInfinite(0));
$('btn-inf-menu').addEventListener('click', () => {
  stopQuestionTimer();
  document.body.classList.remove('inferno');
  updateMenuUI();
  showScreen('menu');
});

$('btn-credits').addEventListener('click', () => showScreen('credits'));
$('btn-credits-back').addEventListener('click', () => {
  updateMenuUI();
  showScreen('menu');
});

// ── INIT ──────────────────────────────────────────────────────────────────
loadPersistence();
updateMenuUI();
showScreen('menu');
