'use strict';

// ── FIREBASE CONFIG ──────────────────────────────────────────────────────────
// Substitua com as credenciais do seu projeto Firebase Console
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCncSQP6JmVqsojvg-G3cya_WCSP-MGDm0",
  authDomain:        "quadrablast.firebaseapp.com",
  databaseURL:       "https://quadrablast-default-rtdb.firebaseio.com",
  projectId:         "quadrablast",
  storageBucket:     "quadrablast.firebasestorage.app",
  messagingSenderId: "1081605639472",
  appId:             "1:1081605639472:web:061a5155d6a208572dccf5"
};

const MP_CONFIGURED = Object.values(FIREBASE_CONFIG).every(v => v !== "SUBSTITUA_AQUI");

// ── MP STATE ──────────────────────────────────────────────────────────────────
const mp = {
  db: null,
  roomCode: null,
  playerId: null,
  playerName: null,
  isHost: false,
  config: { mode: 'individual', difficulty: 'easy', rounds: 3 },
  currentTeam: 'A',
  currentRound: 1,
  totalRounds: 3,
  currentQIdx: 0,
  lastRenderedQIdx: -1,
  qResultShown: false,
  qAdvanced: false,
  currentQ: null,
  qStartedAt: 0,
  qTimer: null,
  roundEndsAt: 0,
  roundTimer: null,
  score: 0,
  answered: false,
  listeners: [],
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
function mpRoomRef(path) {
  return mp.db.ref(`rooms/${mp.roomCode}${path ? '/' + path : ''}`);
}

function mpGenerateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function mpGeneratePlayerId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

function mpFormatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
}

function mpCalcPoints(type, timeMs, timeLimit) {
  const bases   = { linear1: 100, linear2: 150, quadratic: 200 };
  const bonuses = { linear1:  50, linear2:  75, quadratic: 100 };
  const base     = bases[type]   || 100;
  const bonusMax = bonuses[type] || 50;
  const ratio    = Math.max(0, 1 - timeMs / (timeLimit * 1000));
  return base + Math.round(bonusMax * ratio);
}

function mpTimeLimitForType(type) {
  return { linear1: 15, linear2: 30, quadratic: 20 }[type] || 15;
}

function mpGenerateMultiplayerQ(difficulty) {
  let q;
  if (difficulty === 'mixed') {
    const pick = Math.random();
    if (pick < 0.4)      q = buildQuestion('easy');
    else if (pick < 0.7) q = buildQuestion('medium');
    else                 q = buildQuestion('hard');
  } else {
    q = buildQuestion(difficulty);
  }
  return { ...q, timeLimit: mpTimeLimitForType(q.eq.type) };
}

function mpAddListener(ref, event, fn) {
  ref.on(event, fn);
  mp.listeners.push({ ref, event, fn });
}

function mpDetachListeners() {
  mp.listeners.forEach(({ ref, event, fn }) => ref.off(event, fn));
  mp.listeners = [];
}

function mpGetToggleVal(groupId) {
  const active = document.querySelector(`#${groupId} .mp-toggle.active`);
  return active ? active.dataset.val : null;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function checkFirebase() {
  if (!MP_CONFIGURED || !mp.db) {
    alert(
      'Configure o Firebase primeiro!\n\n' +
      'Abra multiplayer.js e substitua "SUBSTITUA_AQUI" pelas credenciais do seu projeto Firebase.'
    );
    return false;
  }
  return true;
}

// ── FIREBASE INIT ─────────────────────────────────────────────────────────────
function mpInit() {
  if (!MP_CONFIGURED) return;
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    mp.db = firebase.database();
  } catch (e) {
    console.error('Firebase init error:', e);
  }
}

// ── SCREEN REGISTRATION ───────────────────────────────────────────────────────
function mpRegisterScreens() {
  screens.mpCreate  = $('screen-mp-create');
  screens.mpJoin    = $('screen-mp-join');
  screens.mpLobby   = $('screen-mp-lobby');
  screens.mpHost    = $('screen-mp-host');
  screens.mpGame    = $('screen-mp-game');
  screens.mpQResult = $('screen-mp-q-result');
  screens.mpPodium  = $('screen-mp-podium');
}

// ── ROOM CREATION ─────────────────────────────────────────────────────────────
function mpOpenCreate() {
  if (!checkFirebase()) return;
  showScreen('mpCreate');
}

async function mpCreateRoom() {
  const btn = $('btn-mp-create-room');
  btn.disabled = true;
  btn.textContent = 'Criando...';

  let code;
  let attempts = 0;
  do {
    code = mpGenerateCode();
    const snap = await mp.db.ref(`rooms/${code}`).once('value');
    if (!snap.exists()) break;
  } while (++attempts < 5);

  mp.roomCode   = code;
  mp.playerId   = mpGeneratePlayerId();
  mp.isHost     = true;
  mp.playerName = null;
  mp.config = {
    mode:           mpGetToggleVal('mp-mode-toggle'),
    difficulty:     mpGetToggleVal('mp-diff-toggle'),
    rounds:         parseInt($('mp-rounds-val').textContent, 10),
    roundType:      mpGetToggleVal('mp-round-type-toggle') || 'time',
    roundDuration:  parseInt($('mp-duration-val').textContent, 10) || 5,
    roundQuestions: parseInt($('mp-qcount-val').textContent, 10) || 10,
  };
  mp.totalRounds   = mp.config.rounds;
  mp.currentRound  = 1;
  mp.currentQIdx   = 0;
  mp.score         = 0;

  await mp.db.ref(`rooms/${code}`).set({
    config:   { ...mp.config, hostId: mp.playerId },
    status:   'waiting',
    round:    1,
    players:  {},
    currentQ: null,
    qResult:  null,
  });

  btn.disabled    = false;
  btn.textContent = 'Criar Sala →';
  mpEnterLobby(true);
}

// ── ROOM JOINING ──────────────────────────────────────────────────────────────
function mpOpenJoin() {
  if (!checkFirebase()) return;
  $('mp-join-name').value  = '';
  $('mp-join-code').value  = '';
  $('mp-join-error').textContent = '';
  $('mp-join-error').classList.add('hidden');
  showScreen('mpJoin');
}

async function mpJoinRoom() {
  const name = $('mp-join-name').value.trim();
  const code = $('mp-join-code').value.trim().toUpperCase();

  if (!name) { mpShowJoinError('Digite seu nome.'); return; }
  if (code.length !== 6) { mpShowJoinError('Código deve ter 6 caracteres.'); return; }

  const btn = $('btn-mp-join-room');
  btn.disabled = true;
  btn.textContent = 'Entrando...';

  try {
    const snap = await mp.db.ref(`rooms/${code}`).once('value');
    if (!snap.exists()) {
      mpShowJoinError('Sala não encontrada.');
      btn.disabled = false; btn.textContent = 'Entrar →';
      return;
    }
    const room = snap.val();
    if (room.status !== 'waiting') {
      mpShowJoinError('Jogo já em andamento.');
      btn.disabled = false; btn.textContent = 'Entrar →';
      return;
    }

    mp.roomCode     = code;
    mp.playerId     = mpGeneratePlayerId();
    mp.playerName   = name;
    mp.isHost       = false;
    mp.config       = room.config;
    mp.totalRounds  = room.config.rounds;
    mp.currentRound = 1;
    mp.score        = 0;

    const playerRef = mp.db.ref(`rooms/${code}/players/${mp.playerId}`);
    await playerRef.set({ name, team: 'A', score: 0, roundScore: 0, online: true });
    playerRef.onDisconnect().remove();

    mpEnterLobby(false);
  } catch (e) {
    mpShowJoinError('Erro ao conectar. Tente novamente.');
  }

  btn.disabled    = false;
  btn.textContent = 'Entrar →';
}

function mpShowJoinError(msg) {
  const el = $('mp-join-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ── LOBBY ─────────────────────────────────────────────────────────────────────
function mpEnterLobby(isHost) {
  $('mp-lobby-code').textContent = mp.roomCode;

  const modeLabel = { individual: '👤 Individual', teams: '⚔️ Equipes' }[mp.config.mode] || '';
  const diffLabel = { easy: '🌱 Fácil', medium: '⚡ Médio', hard: '💀 Difícil', mixed: '🎲 Misto' }[mp.config.difficulty] || '';
  const roundInfo = (mp.config.roundType || 'time') === 'questions'
    ? `${mp.config.roundQuestions} questões/rodada`
    : `${mp.config.roundDuration || 5} min/rodada`;
  $('mp-lobby-config').textContent = `${modeLabel} · ${diffLabel} · ${mp.totalRounds} rodada${mp.totalRounds !== 1 ? 's' : ''} · ${roundInfo}`;

  const showTeam = !isHost && mp.config.mode === 'teams';
  $('mp-team-select').classList.toggle('hidden', !showTeam);
  if (showTeam) mpSelectTeam('A');

  $('btn-mp-start-game').classList.toggle('hidden', !isHost);
  $('btn-mp-start-game').disabled = true;
  $('mp-waiting-msg').classList.toggle('hidden', isHost);

  mpDetachListeners();

  mpAddListener(mpRoomRef('players'), 'value', snap => {
    const players = snap.val() || {};
    mpUpdateLobbyPlayers(players);
    if (isHost) {
      $('btn-mp-start-game').disabled = Object.keys(players).length < 1;
    }
  });

  if (!isHost) {
    mpAddListener(mpRoomRef('status'), 'value', snap => {
      if (snap.val() === 'playing') {
        mpDetachListeners();
        showScreen('mpGame');
        mpAttachGameListeners();
      }
    });
  }

  showScreen('mpLobby');
}

function mpUpdateLobbyPlayers(players) {
  const list    = $('mp-player-list');
  const entries = Object.entries(players);
  const isTeams = mp.config.mode === 'teams';

  if (entries.length === 0) {
    list.innerHTML = '<div class="mp-no-players">Aguardando jogadores...</div>';
    return;
  }
  list.innerHTML = entries.map(([, p]) => `
    <div class="mp-player-item">
      ${isTeams ? `<span class="mp-team-badge ${p.team === 'A' ? 'team-a' : 'team-b'}">${p.team === 'A' ? '🔵' : '🔴'}</span>` : ''}
      <span class="mp-player-name">${escHtml(p.name)}</span>
    </div>
  `).join('');
}

function mpSelectTeam(team) {
  mp.currentTeam = team;
  $('btn-team-a').classList.toggle('active', team === 'A');
  $('btn-team-b').classList.toggle('active', team === 'B');
  if (mp.playerId && mp.roomCode) {
    mp.db.ref(`rooms/${mp.roomCode}/players/${mp.playerId}/team`).set(team);
  }
}

// ── HOST GAME FLOW ────────────────────────────────────────────────────────────
async function mpHostStartGame() {
  await mpRoomRef().update({ status: 'playing' });

  mp.currentRound = 1;
  mp.currentQIdx  = 0;
  mp.lastRenderedQIdx = -1;

  $('mp-host-code').textContent = mp.roomCode;

  mpDetachListeners();
  mpAddListener(mpRoomRef('players'), 'value', snap => {
    mpUpdateLiveBoard(snap.val() || {});
  });

  showScreen('mpHost');
  mpHostStartRound();
}

function mpHostStartRound() {
  mp.currentQIdx = 0;
  $('mp-host-round').textContent = `Rodada ${mp.currentRound}/${mp.totalRounds}`;
  clearInterval(mp.roundTimer);

  if ((mp.config.roundType || 'time') === 'questions') {
    mp.roundEndsAt = Infinity;
    $('mp-host-timer').textContent = `Q 0/${mp.config.roundQuestions}`;
    mp.roundTimer = setInterval(() => {
      $('mp-host-timer').textContent = `Q ${mp.currentQIdx}/${mp.config.roundQuestions}`;
    }, 500);
  } else {
    const mins = mp.config.roundDuration || 5;
    mp.roundEndsAt = Date.now() + mins * 60 * 1000;
    mp.roundTimer = setInterval(() => {
      const rem = mp.roundEndsAt - Date.now();
      $('mp-host-timer').textContent = mpFormatTime(Math.max(0, rem));
      if (rem <= 0) clearInterval(mp.roundTimer);
    }, 500);
  }

  mpHostStartNextQuestion();
}

async function mpHostStartNextQuestion() {
  const q = mpGenerateMultiplayerQ(mp.config.difficulty);
  q.index = mp.currentQIdx;

  mp.qAdvanced = false;

  const qData = {
    index:        q.index,
    type:         q.eq.type,
    eq:           q.eq,
    options:      q.options,
    correctLabel: q.correctLabel,
    timeLimit:    q.timeLimit,
  };

  await mpRoomRef().update({ currentQ: qData, status: 'question', qResult: null });

  mp.currentQ         = q;
  mp.lastRenderedQIdx = q.index;
  mpHostShowQuestion(q);
}

function mpHostShowQuestion(q) {
  $('mp-host-eq-type').textContent  = eqTypeLabel(q.eq);
  $('mp-host-eq').innerHTML         = renderEquation(q.eq);

  clearInterval(mp.qTimer);
  let remaining = q.timeLimit;
  mpUpdateHostQTimer(remaining, q.timeLimit);

  mp.qTimer = setInterval(() => {
    remaining -= 0.1;
    if (remaining <= 0) {
      clearInterval(mp.qTimer);
      mpUpdateHostQTimer(0, q.timeLimit);
      if (!mp.qAdvanced) { mp.qAdvanced = true; mpHostAdvanceQuestion(); }
    } else {
      mpUpdateHostQTimer(remaining, q.timeLimit);
    }
  }, 100);
}

function mpUpdateHostQTimer(remaining, total) {
  const pct = (remaining / total) * 100;
  const bar = $('mp-host-q-timer-bar');
  bar.style.width = pct + '%';
  bar.className = 'inf-timer-bar ' + (pct > 50 ? 'safe' : pct > 20 ? 'warn' : 'danger');
  $('mp-host-q-timer-text').textContent = Math.ceil(remaining) + 's';
}

async function mpHostAdvanceQuestion() {
  await new Promise(r => setTimeout(r, 600));

  const playersSnap = await mpRoomRef('players').once('value');
  const players     = playersSnap.val() || {};
  const qIdx        = mp.currentQIdx;
  const updates     = {};
  const resultPlayers = {};

  for (const [pid, pData] of Object.entries(players)) {
    const ans      = pData.answers?.[qIdx];
    const newScore = (pData.score || 0) + (ans?.points || 0);
    resultPlayers[pid] = {
      name:       pData.name,
      team:       pData.team || null,
      correct:    ans?.correct || false,
      points:     ans?.points  || 0,
      timeMs:     ans?.timeMs  || null,
      totalScore: newScore,
    };
    updates[`players/${pid}/score`]      = newScore;
    updates[`players/${pid}/roundScore`] = (pData.roundScore || 0) + (ans?.points || 0);
  }

  if (mp.config.mode === 'teams') {
    let tA = 0, tB = 0;
    for (const [pid, pData] of Object.entries(players)) {
      const s = updates[`players/${pid}/score`] || pData.score || 0;
      if (pData.team === 'A') tA += s;
      else if (pData.team === 'B') tB += s;
    }
    updates['teams'] = { A: tA, B: tB };
  }

  updates['qResult'] = { qIdx, correctLabel: mp.currentQ.correctLabel, players: resultPlayers };
  updates['status']  = 'q-result';

  await mpRoomRef().update(updates);

  // Host vê o placar junto com os jogadores
  mpShowQResult(updates['qResult']);

  setTimeout(async () => {
    showScreen('mpHost');
    mp.currentQIdx++;
    const isQuestionMode = (mp.config.roundType || 'time') === 'questions';
    const shouldEndRound = isQuestionMode
      ? mp.currentQIdx >= mp.config.roundQuestions
      : Date.now() >= mp.roundEndsAt;
    if (shouldEndRound) {
      await mpHostEndRound();
    } else {
      await mpHostStartNextQuestion();
    }
  }, 3500);
}

async function mpHostEndRound() {
  clearInterval(mp.roundTimer);

  if (mp.currentRound >= mp.totalRounds) {
    await mpRoomRef().update({ status: 'finished' });
    const snap = await mpRoomRef().once('value');
    mpShowPodium(snap.val());
    return;
  }

  mp.currentRound++;

  const playersSnap = await mpRoomRef('players').once('value');
  const updates = { status: 'round-end', round: mp.currentRound };
  Object.keys(playersSnap.val() || {}).forEach(pid => {
    updates[`players/${pid}/roundScore`] = 0;
  });
  await mpRoomRef().update(updates);

  setTimeout(() => mpHostStartRound(), 5000);
}

async function mpHostEndGame() {
  clearInterval(mp.qTimer);
  clearInterval(mp.roundTimer);
  await mpRoomRef().update({ status: 'finished' });
  const snap = await mpRoomRef().once('value');
  mpShowPodium(snap.val());
}

// ── PLAYER GAME FLOW ──────────────────────────────────────────────────────────
function mpAttachGameListeners() {
  $('mp-game-player-name').textContent = mp.playerName;
  $('mp-game-round').textContent       = `Rodada ${mp.currentRound}`;
  $('mp-game-score').textContent       = '0';

  mpAddListener(mpRoomRef('currentQ'), 'value', snap => {
    const q = snap.val();
    if (!q || q.index === mp.lastRenderedQIdx) return;
    mp.lastRenderedQIdx = q.index;
    mp.currentQ         = q;
    mp.answered         = false;
    mp.qResultShown     = false;
    mp.qStartedAt       = Date.now();
    $('mp-game-waiting').classList.add('hidden');
    mpPlayerShowQuestion(q);
  });

  mpAddListener(mpRoomRef('qResult'), 'value', snap => {
    const qr = snap.val();
    if (!qr || mp.qResultShown || qr.qIdx !== mp.lastRenderedQIdx) return;
    mp.qResultShown = true;
    clearInterval(mp.qTimer);
    mpShowQResult(qr);
  });

  mpAddListener(mpRoomRef('status'), 'value', snap => {
    const status = snap.val();
    if (status === 'round-end') {
      clearInterval(mp.qTimer);
      mp.currentRound++;
      $('mp-game-round').textContent = `Rodada ${mp.currentRound}`;
    } else if (status === 'finished') {
      clearInterval(mp.qTimer);
      mpRoomRef().once('value', s => mpShowPodium(s.val()));
    }
  });
}

function mpPlayerShowQuestion(q) {
  showScreen('mpGame');

  const opts = Array.isArray(q.options) ? q.options : Object.values(q.options || {});

  $('mp-game-eq-type').textContent = eqTypeLabel(q.eq);
  $('mp-game-eq').innerHTML        = renderEquation(q.eq);

  const grid = $('mp-game-options');
  grid.innerHTML = '';
  opts.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => mpPlayerSubmitAnswer(opt, btn, q));
    grid.appendChild(btn);
  });

  clearInterval(mp.qTimer);
  let remaining = q.timeLimit;
  $('mp-game-q-timer-wrap').classList.remove('hidden');
  mpUpdatePlayerQTimer(remaining, q.timeLimit);

  mp.qTimer = setInterval(() => {
    remaining -= 0.1;
    if (remaining <= 0) {
      clearInterval(mp.qTimer);
      mpUpdatePlayerQTimer(0, q.timeLimit);
      grid.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
    } else {
      mpUpdatePlayerQTimer(remaining, q.timeLimit);
    }
  }, 100);
}

function mpUpdatePlayerQTimer(remaining, total) {
  const pct = (remaining / total) * 100;
  const bar = $('mp-game-q-timer-bar');
  bar.style.width  = pct + '%';
  bar.className    = 'inf-timer-bar ' + (pct > 50 ? 'safe' : pct > 20 ? 'warn' : 'danger');
  $('mp-game-q-timer-text').textContent = Math.ceil(remaining) + 's';
}

function mpPlayerSubmitAnswer(chosen, btn, q) {
  if (mp.answered) return;
  mp.answered = true;
  clearInterval(mp.qTimer);

  const isCorrect = chosen === q.correctLabel;
  const timeMs    = Date.now() - mp.qStartedAt;
  const points    = isCorrect ? mpCalcPoints(q.type, timeMs, q.timeLimit) : 0;

  const grid = $('mp-game-options');
  grid.querySelectorAll('.option-btn').forEach(b => {
    b.disabled = true;
    if (b.textContent === q.correctLabel) b.classList.add('reveal');
  });
  btn.classList.remove('reveal');
  btn.classList.add(isCorrect ? 'correct' : 'wrong');

  mp.db.ref(`rooms/${mp.roomCode}/players/${mp.playerId}/answers/${q.index}`).set({
    answer: chosen, correct: isCorrect, points, timeMs,
  });

  if (isCorrect) {
    mp.score += points;
    $('mp-game-score').textContent = mp.score;
  }

  const waitEl = $('mp-game-waiting');
  waitEl.textContent = isCorrect
    ? `✓ +${points} pts — aguardando resultado...`
    : '✗ Errou! — aguardando resultado...';
  waitEl.style.color = isCorrect ? 'var(--green)' : 'var(--red)';
  waitEl.classList.remove('hidden');
}

// ── Q-RESULT SCREEN ───────────────────────────────────────────────────────────
function mpShowQResult(qr) {
  const myResult  = qr.players?.[mp.playerId];
  const isCorrect = myResult?.correct || false;
  const points    = myResult?.points  || 0;

  if (mp.isHost) {
    $('mp-q-result-icon').textContent = '📊';
    $('mp-q-result-icon').style.color = 'var(--purple-light)';
    $('mp-q-result-label').textContent = 'Placar da Questão';
    $('mp-q-result-points').textContent = '';
  } else {
    $('mp-q-result-icon').textContent  = isCorrect ? '✓' : '✗';
    $('mp-q-result-icon').style.color  = isCorrect ? 'var(--green)' : 'var(--red)';
    $('mp-q-result-label').textContent = isCorrect ? 'Correto!' : (myResult ? 'Errou!' : 'Sem resposta');
    $('mp-q-result-points').textContent = isCorrect ? `+${points} pts` : '+0 pts';
  }
  $('mp-q-result-answer').textContent = `Resposta: ${qr.correctLabel}`;

  const sorted = Object.values(qr.players || {}).sort((a, b) => (b.totalScore||0) - (a.totalScore||0));
  const top5   = sorted.slice(0, 5);
  $('mp-mini-board').innerHTML = top5.map((p, i) => `
    <div class="mp-mini-item ${p.name === mp.playerName ? 'me' : ''}">
      <span class="mp-mini-rank">#${i + 1}</span>
      <span class="mp-mini-name">${escHtml(p.name)}</span>
      <span class="mp-mini-pts ${p.correct ? 'correct' : ''}">${p.correct ? '+' + p.points : '—'}</span>
      <span class="mp-mini-total">${p.totalScore || 0} pts</span>
    </div>
  `).join('');

  let countdown = 3;
  $('mp-q-result-countdown').textContent = countdown;
  const tick = setInterval(() => {
    countdown--;
    $('mp-q-result-countdown').textContent = Math.max(0, countdown);
    if (countdown <= 0) clearInterval(tick);
  }, 1000);

  showScreen('mpQResult');
}

// ── LIVE BOARD (host) ──────────────────────────────────────────────────────────
function mpUpdateLiveBoard(players) {
  const sorted  = Object.values(players).sort((a, b) => (b.score||0) - (a.score||0));
  const isTeams = mp.config.mode === 'teams';
  const qIdx    = mp.currentQIdx;
  const total    = sorted.length;
  const answered = sorted.filter(p => p.answers?.[qIdx]).length;
  $('mp-host-answers-count').textContent = `${answered} / ${total} responderam`;

  if (total > 0 && answered >= total && !mp.qAdvanced) {
    mp.qAdvanced = true;
    clearInterval(mp.qTimer);
    mpUpdateHostQTimer(0, 1);
    setTimeout(mpHostAdvanceQuestion, 800);
  }

  $('mp-live-board').innerHTML = sorted.slice(0, 8).map((p, i) => `
    <div class="mp-live-item">
      <span class="mp-live-rank">${i + 1}.</span>
      ${isTeams ? `<span class="mp-team-badge ${p.team === 'A' ? 'team-a' : 'team-b'}">${p.team}</span>` : ''}
      <span class="mp-live-name">${escHtml(p.name)}</span>
      <span class="mp-live-score">${p.score || 0} pts</span>
    </div>
  `).join('');
}

// ── PODIUM ─────────────────────────────────────────────────────────────────────
function mpShowPodium(room) {
  mpDetachListeners();

  const players = Object.values(room.players || {}).sort((a, b) => (b.score||0) - (a.score||0));
  const isTeams = mp.config.mode === 'teams';

  const teamWinEl = $('mp-team-winner');
  if (isTeams && room.teams) {
    const winTeam = (room.teams.A || 0) >= (room.teams.B || 0) ? 'A' : 'B';
    const color   = winTeam === 'A' ? '#3b82f6' : '#ef4444';
    teamWinEl.classList.remove('hidden');
    teamWinEl.innerHTML = `
      <span style="color:${color}">🏆 Time ${winTeam} venceu!</span>
      <span class="mp-team-scores">🔵 A: ${room.teams.A||0} pts &nbsp;🔴 B: ${room.teams.B||0} pts</span>
    `;
  } else {
    teamWinEl.classList.add('hidden');
  }

  const medals    = ['🥇','🥈','🥉'];
  const p1 = players[0], p2 = players[1], p3 = players[2];
  const podiumOrder = [
    { p: p2, pos: 2, h: 80  },
    { p: p1, pos: 1, h: 120 },
    { p: p3, pos: 3, h: 50  },
  ];
  $('mp-podium').innerHTML = `
    <div class="mp-podium-inner">
      ${podiumOrder.map(({ p, pos, h }) => p ? `
        <div class="mp-podium-item pos-${pos}">
          <div class="mp-podium-medal">${medals[pos-1]}</div>
          <div class="mp-podium-name">${escHtml(p.name)}</div>
          <div class="mp-podium-score">${p.score||0} pts</div>
          <div class="mp-podium-bar" style="height:${h}px"></div>
        </div>
      ` : '').join('')}
    </div>
  `;

  $('mp-full-board').innerHTML = players.map((p, i) => `
    <div class="mp-full-item ${p.name === mp.playerName ? 'me' : ''}">
      <span class="mp-full-rank">${medals[i] || '#' + (i+1)}</span>
      ${isTeams ? `<span class="mp-team-badge ${p.team === 'A' ? 'team-a' : 'team-b'}">${p.team}</span>` : ''}
      <span class="mp-full-name">${escHtml(p.name)}</span>
      <span class="mp-full-score">${p.score||0} pts</span>
    </div>
  `).join('');

  const myData = players.find(p => p.name === mp.playerName);
  if (myData) {
    const key  = `mp_best_${mp.config.mode}`;
    const prev = parseInt(localStorage.getItem(key) || '0', 10);
    if ((myData.score||0) > prev) localStorage.setItem(key, String(myData.score));
  }

  showScreen('mpPodium');
}

// ── EVENT HANDLERS ────────────────────────────────────────────────────────────
function mpSetupEvents() {
  $('btn-mp-create').addEventListener('click', mpOpenCreate);
  $('btn-mp-join').addEventListener('click', mpOpenJoin);

  // Toggle groups
  ['mp-mode-toggle', 'mp-diff-toggle', 'mp-round-type-toggle'].forEach(groupId => {
    document.querySelectorAll(`#${groupId} .mp-toggle`).forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll(`#${groupId} .mp-toggle`).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (groupId === 'mp-round-type-toggle') {
          $('mp-time-config').classList.toggle('hidden', btn.dataset.val !== 'time');
          $('mp-questions-config').classList.toggle('hidden', btn.dataset.val !== 'questions');
        }
      });
    });
  });

  // Rounds counter
  $('mp-rounds-dec').addEventListener('click', () => {
    const v = parseInt($('mp-rounds-val').textContent, 10);
    if (v > 1) $('mp-rounds-val').textContent = v - 1;
  });
  $('mp-rounds-inc').addEventListener('click', () => {
    const v = parseInt($('mp-rounds-val').textContent, 10);
    if (v < 10) $('mp-rounds-val').textContent = v + 1;
  });

  // Duration counter (minutes per round)
  $('mp-duration-dec').addEventListener('click', () => {
    const v = parseInt($('mp-duration-val').textContent, 10);
    if (v > 1) $('mp-duration-val').textContent = v - 1;
  });
  $('mp-duration-inc').addEventListener('click', () => {
    const v = parseInt($('mp-duration-val').textContent, 10);
    if (v < 30) $('mp-duration-val').textContent = v + 1;
  });

  // Question count counter
  $('mp-qcount-dec').addEventListener('click', () => {
    const v = parseInt($('mp-qcount-val').textContent, 10);
    if (v > 5) $('mp-qcount-val').textContent = v - 5;
  });
  $('mp-qcount-inc').addEventListener('click', () => {
    const v = parseInt($('mp-qcount-val').textContent, 10);
    if (v < 50) $('mp-qcount-val').textContent = v + 5;
  });

  $('btn-mp-create-room').addEventListener('click', mpCreateRoom);
  $('btn-mp-create-back').addEventListener('click', () => showScreen('menu'));

  // Join
  $('btn-mp-join-room').addEventListener('click', mpJoinRoom);
  $('btn-mp-join-back').addEventListener('click', () => showScreen('menu'));
  $('mp-join-code').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase(); });

  // Host in-game controls
  $('btn-mp-host-skip').addEventListener('click', () => {
    if (!mp.qAdvanced) { mp.qAdvanced = true; clearInterval(mp.qTimer); mpHostAdvanceQuestion(); }
  });
  $('btn-mp-host-end').addEventListener('click', async () => {
    clearInterval(mp.qTimer);
    clearInterval(mp.roundTimer);
    mp.qAdvanced = true;
    await mpHostEndGame();
  });

  // Player: leave game mid-match
  $('btn-mp-game-leave').addEventListener('click', () => {
    mpDetachListeners();
    clearInterval(mp.qTimer);
    if (mp.roomCode && mp.playerId && !mp.isHost) {
      const playerRef = mp.db.ref(`rooms/${mp.roomCode}/players/${mp.playerId}`);
      playerRef.onDisconnect().cancel();
      playerRef.remove();
    }
    updateMenuUI();
    showScreen('menu');
  });

  // Lobby
  $('btn-mp-start-game').addEventListener('click', mpHostStartGame);
  $('btn-team-a').addEventListener('click', () => mpSelectTeam('A'));
  $('btn-team-b').addEventListener('click', () => mpSelectTeam('B'));
  $('btn-mp-lobby-back').addEventListener('click', () => {
    mpDetachListeners();
    clearInterval(mp.qTimer);
    clearInterval(mp.roundTimer);
    if (mp.roomCode && mp.playerId && !mp.isHost) {
      mp.db.ref(`rooms/${mp.roomCode}/players/${mp.playerId}`).remove();
    }
    updateMenuUI();
    showScreen('menu');
  });

  // Podium
  $('btn-mp-podium-menu').addEventListener('click', () => {
    mpDetachListeners();
    clearInterval(mp.qTimer);
    clearInterval(mp.roundTimer);
    updateMenuUI();
    showScreen('menu');
  });
}

// ── INIT ──────────────────────────────────────────────────────────────────────
mpRegisterScreens();
mpInit();
mpSetupEvents();
