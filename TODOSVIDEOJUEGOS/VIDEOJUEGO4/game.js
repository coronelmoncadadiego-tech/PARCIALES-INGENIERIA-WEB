'use strict';

/**
 * FUTBOLITO ARCADE · ESTADIO NOCTURNO
 * Modos: 2 Jugadores Local y 1 Jugador vs CPU (Fácil/Normal/Difícil)
 * Ítems aleatorios en cancha (Congelar rival/balón, Multi-balón, Turbo, Gigante, Súper Tiro)
 * Skins personalizables procedurales en HTML5 Canvas + Web Audio API + localStorage.
 */

(() => {
  // =========================================================================
  // CONSTANTES DE CANCHA Y FÍSICA
  // =========================================================================
  const LOGICAL_W = 1100;
  const LOGICAL_H = 620;

  const PITCH = {
    x: 74,
    y: 44,
    w: 952,
    h: 532,
    get right() {
      return this.x + this.w;
    },
    get bottom() {
      return this.y + this.h;
    },
    get cx() {
      return this.x + this.w / 2;
    },
    get cy() {
      return this.y + this.h / 2;
    },
    cornerBevel: 28,
  };

  const GOAL = {
    depth: 50,
    height: 186,
    postRadius: 8,
    get top() {
      return PITCH.cy - this.height / 2;
    },
    get bottom() {
      return PITCH.cy + this.height / 2;
    },
  };

  const GOALPOSTS = [
    { x: PITCH.x, y: GOAL.top },
    { x: PITCH.x, y: GOAL.bottom },
    { x: PITCH.right, y: GOAL.top },
    { x: PITCH.right, y: GOAL.bottom },
  ];

  const PHYSICS = {
    substeps: 3,
    playerRadius: 23,
    playerMass: 2.5,
    playerAccel: 0.82,
    playerMaxSpeed: 6.4,
    playerFriction: 0.85,
    kickCooldown: 0.55,
    kickActiveDuration: 0.16,
    kickTurboBoost: 5.5,
    kickReachExtra: 17,
    kickShotPower: 13.8,
    ballRadius: 14,
    ballMass: 1.0,
    ballMaxSpeed: 19.5,
    ballFriction: 0.987,
    wallRestitution: 0.78,
    postRestitution: 0.84,
    playerBallRestitution: 0.82,
    playerPlayerRestitution: 0.75,
  };

  const CPU_PROFILES = {
    easy: {
      label: 'Fácil',
      speedFactor: 0.74,
      accelFactor: 0.72,
      reactionInterval: 0.14,
      kickChance: 0.45,
      itemSeekChance: 0.25,
      aimNoise: 42,
    },
    normal: {
      label: 'Normal',
      speedFactor: 0.92,
      accelFactor: 0.92,
      reactionInterval: 0.06,
      kickChance: 0.75,
      itemSeekChance: 0.65,
      aimNoise: 18,
    },
    hard: {
      label: 'Difícil',
      speedFactor: 1.05,
      accelFactor: 1.08,
      reactionInterval: 0.02,
      kickChance: 0.95,
      itemSeekChance: 0.9,
      aimNoise: 5,
    },
  };

  const ITEM_TYPES = [
    {
      id: 'freeze_opponent',
      name: '¡Rival Congelado!',
      shortLabel: 'Congelar',
      icon: '❄️',
      color: '#38bdf8',
      bg: '#0c4a6e',
    },
    {
      id: 'freeze_ball',
      name: '¡Balón Congelado!',
      shortLabel: 'Hielo Balón',
      icon: '🧊',
      color: '#67e8f9',
      bg: '#164e63',
    },
    {
      id: 'multiball',
      name: '¡Multi-Balón x3!',
      shortLabel: 'Multi-Balón',
      icon: '⚽',
      color: '#fde047',
      bg: '#713f12',
    },
    {
      id: 'super_speed',
      name: '¡Súper Turbo!',
      shortLabel: 'Turbo+',
      icon: '⚡',
      color: '#facc15',
      bg: '#854d0e',
    },
    {
      id: 'giant',
      name: '¡Modo Gigante!',
      shortLabel: 'Gigante',
      icon: '🛡️',
      color: '#c084fc',
      bg: '#581c87',
    },
    {
      id: 'power_shot',
      name: '¡Súper Disparo!',
      shortLabel: 'Cañón x2',
      icon: '🔥',
      color: '#fb923c',
      bg: '#7c2d12',
    },
  ];

  const STORAGE_KEYS = {
    ranking: 'futbolito_ranking_v1',
    history: 'futbolito_history_v1',
  };

  // =========================================================================
  // MOTOR DE SONIDO SINTETIZADO (WEB AUDIO API)
  // =========================================================================
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.noiseBuffer = null;
    }

    ensureContext() {
      if (this.muted) return null;
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (!this.noiseBuffer && this.ctx) {
        const sr = this.ctx.sampleRate;
        const len = Math.floor(sr * 1.2);
        const buf = this.ctx.createBuffer(1, len, sr);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        this.noiseBuffer = buf;
      }
      return this.ctx;
    }

    toggleMute() {
      this.muted = !this.muted;
      return this.muted;
    }

    playKick(power = 0.6) {
      const ctx = this.ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const intensity = Math.min(1.2, Math.max(0.2, power));

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150 + intensity * 65, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

      gain.gain.setValueAtTime(Math.min(0.38, 0.3 * intensity), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);

      if (intensity > 0.65 && this.noiseBuffer) {
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1250, now);
        filter.Q.setValueAtTime(1.4, now);

        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(Math.min(0.24, 0.18 * intensity), now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        src.connect(filter);
        filter.connect(nGain);
        nGain.connect(ctx.destination);
        src.start(now);
        src.stop(now + 0.09);
      }
    }

    playWallBounce(speed = 5) {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const vol = Math.min(0.2, Math.max(0.04, speed * 0.013));

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(115, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.07);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    }

    playPostClang(speed = 8) {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const vol = Math.min(0.28, Math.max(0.08, speed * 0.02));

      const freqs = [620, 985, 1470];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(vol / (idx + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32 - idx * 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      });
    }

    playPowerup() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];

      notes.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const t = now + idx * 0.045;
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.15);
      });
    }

    playFreeze() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1750, now);
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.28);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    }

    playCountdownBeep(isStart = false) {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isStart ? 880 : 520, now);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isStart ? 0.24 : 0.14));

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    }

    playWhistle() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const masterGain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(2720, now);
      osc2.frequency.setValueAtTime(2890, now);

      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(36, now);
      lfoGain.gain.setValueAtTime(140, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfoGain.connect(osc2.frequency);

      masterGain.gain.setValueAtTime(0.001, now);
      masterGain.gain.linearRampToValueAtTime(0.13, now + 0.03);
      masterGain.gain.setValueAtTime(0.13, now + 0.28);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

      osc1.connect(masterGain);
      osc2.connect(masterGain);
      masterGain.connect(ctx.destination);

      lfo.start(now);
      osc1.start(now);
      osc2.start(now);

      lfo.stop(now + 0.44);
      osc1.stop(now + 0.44);
      osc2.stop(now + 0.44);
    }

    playGoal() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const notes = [261.63, 329.63, 392.0, 523.25];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1900, now);

        const start = now + i * 0.06;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.1, start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.72);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.75);
      });

      if (this.noiseBuffer) {
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(700, now);
        filter.Q.setValueAtTime(0.7, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.22, now + 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        src.start(now);
        src.stop(now + 1.15);
      }
    }

    playVictory() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const melody = [
        { f: 392.0, t: 0, d: 0.14 },
        { f: 523.25, t: 0.13, d: 0.14 },
        { f: 659.25, t: 0.26, d: 0.14 },
        { f: 783.99, t: 0.4, d: 0.42 },
      ];

      melody.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, now + n.t);
        gain.gain.setValueAtTime(0.2, now + n.t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + n.t);
        osc.stop(now + n.t + n.d + 0.03);
      });
    }
  }

  // =========================================================================
  // GESTIÓN DE PERSISTENCIA (localStorage)
  // =========================================================================
  const StorageManager = {
    getRanking() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.ranking);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },

    getHistory() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.history);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },

    saveMatchResult({ p1Name, p2Name, p1Score, p2Score, targetGoals, durationSeconds }) {
      const ranking = this.getRanking();
      const winnerName = p1Score > p2Score ? p1Name : p2Name;

      const updatePlayer = (name, goalsFor, won) => {
        const key = name.trim().toLowerCase();
        let entry = ranking.find((item) => item.key === key);
        if (!entry) {
          entry = {
            key,
            name: name.trim(),
            pj: 0,
            pg: 0,
            pp: 0,
            gf: 0,
            puntos: 0,
          };
          ranking.push(entry);
        } else {
          entry.name = name.trim();
        }

        entry.pj += 1;
        entry.gf += goalsFor;
        if (won) {
          entry.pg += 1;
          entry.puntos += 3;
        } else {
          entry.pp += 1;
        }
      };

      updatePlayer(p1Name, p1Score, p1Score > p2Score);
      updatePlayer(p2Name, p2Score, p2Score > p1Score);

      ranking.sort((a, b) => {
        if (b.puntos !== a.puntos) return b.puntos - a.puntos;
        if (b.pg !== a.pg) return b.pg - a.pg;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.name.localeCompare(b.name, 'es');
      });

      const now = new Date();
      const dateStr = now.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const history = this.getHistory();
      history.unshift({
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
        isoDate: now.toISOString(),
        dateFormatted: dateStr,
        p1Name,
        p2Name,
        p1Score,
        p2Score,
        scoreText: `${p1Name} ${p1Score} - ${p2Score} ${p2Name}`,
        winner: winnerName,
        targetGoals,
        durationSeconds,
      });

      const trimmedHistory = history.slice(0, 50);

      try {
        localStorage.setItem(STORAGE_KEYS.ranking, JSON.stringify(ranking));
        localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(trimmedHistory));
      } catch {
        // Ignorar si almacenamiento está restringido
      }
    },

    clearAll() {
      try {
        localStorage.removeItem(STORAGE_KEYS.ranking);
        localStorage.removeItem(STORAGE_KEYS.history);
      } catch {
        // Ignorar
      }
    },
  };

  // =========================================================================
  // REFERENCIAS DEL DOM
  // =========================================================================
  const dom = {
    startScreen: document.getElementById('start-screen'),
    gameScreen: document.getElementById('game-screen'),
    startForm: document.getElementById('start-form'),
    modePills: Array.from(document.querySelectorAll('.mode-pill')),
    diffPills: Array.from(document.querySelectorAll('.diff-pill')),
    cpuDifficultyBlock: document.getElementById('cpu-difficulty-block'),
    p1Input: document.getElementById('p1-name'),
    p2Input: document.getElementById('p2-name'),
    p2TeamBadge: document.getElementById('p2-team-badge'),
    p2NameLabel: document.getElementById('p2-name-label'),
    p2ControlsHuman: document.getElementById('p2-controls-human'),
    p2ControlsCpu: document.getElementById('p2-controls-cpu'),
    p1SkinLabel: document.getElementById('p1-skin-label'),
    p2SkinLabel: document.getElementById('p2-skin-label'),
    skinButtons: Array.from(document.querySelectorAll('.skin-btn')),
    formError: document.getElementById('form-error'),
    goalPills: Array.from(document.querySelectorAll('.goal-pill')),
    btnToggleItems: document.getElementById('btn-toggle-items'),
    btnMenuLeaderboard: document.getElementById('btn-menu-leaderboard'),

    hudP1Name: document.getElementById('hud-p1-name'),
    hudP2Name: document.getElementById('hud-p2-name'),
    hudP2TeamTag: document.getElementById('hud-p2-team-tag'),
    hudP1Effects: document.getElementById('hud-p1-effects'),
    hudP2Effects: document.getElementById('hud-p2-effects'),
    hudP1Score: document.getElementById('hud-p1-score'),
    hudP2Score: document.getElementById('hud-p2-score'),
    hudP1Turbo: document.getElementById('hud-p1-turbo'),
    hudP2Turbo: document.getElementById('hud-p2-turbo'),
    hudGoalTarget: document.getElementById('hud-goal-target'),
    hudTimer: document.getElementById('hud-timer'),
    btnSound: document.getElementById('btn-sound'),
    btnPause: document.getElementById('btn-pause'),
    btnHudLeaderboard: document.getElementById('btn-hud-leaderboard'),
    btnHudMenu: document.getElementById('btn-hud-menu'),
    stripP2: document.getElementById('strip-p2'),

    canvas: document.getElementById('game-canvas'),
    pauseOverlay: document.getElementById('pause-overlay'),
    btnResume: document.getElementById('btn-resume'),
    btnRestartMatch: document.getElementById('btn-restart-match'),
    btnPauseMenu: document.getElementById('btn-pause-menu'),

    gameoverModal: document.getElementById('gameover-modal'),
    gameoverBadge: document.getElementById('gameover-badge'),
    gameoverTitle: document.getElementById('gameover-title'),
    finalP1Name: document.getElementById('final-p1-name'),
    finalP2Name: document.getElementById('final-p2-name'),
    finalP1Score: document.getElementById('final-p1-score'),
    finalP2Score: document.getElementById('final-p2-score'),
    gameoverStats: document.getElementById('gameover-stats'),
    btnRematch: document.getElementById('btn-rematch'),
    btnGameoverLeaderboard: document.getElementById('btn-gameover-leaderboard'),
    btnGameoverMenu: document.getElementById('btn-gameover-menu'),

    leaderboardModal: document.getElementById('leaderboard-modal'),
    btnCloseLeaderboard: document.getElementById('btn-close-leaderboard'),
    btnLeaderboardDone: document.getElementById('btn-leaderboard-done'),
    tabRanking: document.getElementById('tab-ranking'),
    tabHistory: document.getElementById('tab-history'),
    panelRanking: document.getElementById('panel-ranking'),
    panelHistory: document.getElementById('panel-history'),
    rankingTbody: document.getElementById('ranking-tbody'),
    historyTbody: document.getElementById('history-tbody'),
    rankingEmpty: document.getElementById('ranking-empty'),
    historyEmpty: document.getElementById('history-empty'),
    rankingCount: document.getElementById('ranking-count'),
    historyCount: document.getElementById('history-count'),

    clearDataArea: document.getElementById('clear-data-area'),
    clearConfirmArea: document.getElementById('clear-confirm-area'),
    btnRequestClear: document.getElementById('btn-request-clear'),
    btnConfirmClear: document.getElementById('btn-confirm-clear'),
    btnCancelClear: document.getElementById('btn-cancel-clear'),
  };

  const ctx = dom.canvas.getContext('2d');
  const sound = new SoundEngine();

  // =========================================================================
  // ESTADO DEL JUEGO Y CONFIGURACIÓN
  // =========================================================================
  const keys = Object.create(null);

  const state = {
    screen: 'menu', // 'menu' | 'game'
    phase: 'idle', // 'idle' | 'countdown' | 'playing' | 'goal' | 'paused' | 'gameover'
    phaseBeforeModal: null,
    gameMode: '2p', // '2p' | 'cpu'
    cpuDifficulty: 'normal', // 'easy' | 'normal' | 'hard'
    savedHumanP2Name: 'Jugador 2',
    itemsEnabled: true,
    targetGoals: 5,
    matchElapsed: 0,
    goalBannerTimer: 0,
    goalScorerTeam: null,
    goalScorerName: '',
    countdownValue: 3,
    countdownTimer: 0,
    bannerText: '',
    bannerAlpha: 0,
    itemToastText: '',
    itemToastColor: '#fde047',
    itemToastTimer: 0,
    ballFreezeTimer: 0,
    itemSpawnTimer: 5.5,
    items: [],
    balls: [],
    particles: [],
    shakeTime: 0,
    shakeIntensity: 0,
    lastFrameTime: 0,
    rafId: null,
    matchSaved: false,
    cpuDecisionTimer: 0,
    cpuInput: { x: 0, y: 0, wantKick: false },
  };

  function createPlayer(id, team, x, y, color, glowColor) {
    return {
      id,
      team,
      name: id === 1 ? 'Jugador 1' : 'Jugador 2',
      skin: 'classic',
      isCpu: false,
      x,
      y,
      vx: 0,
      vy: 0,
      r: PHYSICS.playerRadius,
      mass: PHYSICS.playerMass,
      score: 0,
      color,
      glowColor,
      facingX: team === 'blue' ? 1 : -1,
      facingY: 0,
      kickCooldown: 0,
      kickActiveTimer: 0,
      kickFlash: 0,
      kickUsedThisWindow: false,
      // Estados de ítems de mejora
      frozenTimer: 0,
      speedBoostTimer: 0,
      giantTimer: 0,
      powerShotCharges: 0,
    };
  }

  function createBall(x = PITCH.cx, y = PITCH.cy, vx = 0, vy = 0, isExtra = false) {
    return {
      x,
      y,
      vx,
      vy,
      r: PHYSICS.ballRadius,
      mass: PHYSICS.ballMass,
      angle: 0,
      isExtra,
      trail: [],
    };
  }

  const p1 = createPlayer(1, 'blue', PITCH.x + 190, PITCH.cy, '#38bdf8', 'rgba(56, 189, 248, 0.55)');
  const p2 = createPlayer(2, 'red', PITCH.right - 190, PITCH.cy, '#fb7185', 'rgba(251, 113, 133, 0.55)');

  // =========================================================================
  // UTILIDADES
  // =========================================================================
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function formatTime(totalSeconds) {
    const secs = Math.max(0, Math.floor(totalSeconds));
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function clearAllKeys() {
    for (const k of Object.keys(keys)) {
      delete keys[k];
    }
  }

  function spawnParticles(x, y, color, count = 16, speedScale = 1) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (1.5 + Math.random() * 4.8) * speedScale;
      state.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        r: 2 + Math.random() * 3.5,
        color,
        life: 0.35 + Math.random() * 0.45,
        maxLife: 0.8,
      });
    }
  }

  function spawnGoalConfetti(team) {
    const palette =
      team === 'blue'
        ? ['#38bdf8', '#60a5fa', '#e0f2fe', '#fbbf24']
        : ['#fb7185', '#f43f5e', '#ffe4e6', '#fbbf24'];
    const originX = team === 'blue' ? PITCH.right : PITCH.x;

    for (let i = 0; i < 65; i++) {
      const ang =
        team === 'blue'
          ? Math.PI + (Math.random() - 0.5) * 1.9
          : (Math.random() - 0.5) * 1.9;
      const spd = 2.8 + Math.random() * 7.5;
      state.particles.push({
        x: originX,
        y: PITCH.cy + (Math.random() - 0.5) * GOAL.height,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        r: 3 + Math.random() * 4,
        color: palette[i % palette.length],
        life: 0.9 + Math.random() * 0.8,
        maxLife: 1.7,
      });
    }
  }

  function triggerShake(intensity = 5, duration = 0.16) {
    state.shakeIntensity = Math.max(state.shakeIntensity, intensity);
    state.shakeTime = Math.max(state.shakeTime, duration);
  }

  function showItemToast(text, color) {
    state.itemToastText = text;
    state.itemToastColor = color;
    state.itemToastTimer = 2.1;
  }

  // =========================================================================
  // MANEJO DE TECLADO SIMULTÁNEO
  // =========================================================================
  const GAME_KEYS = new Set([
    'KeyW',
    'KeyA',
    'KeyS',
    'KeyD',
    'Space',
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'Enter',
    'ShiftRight',
  ]);

  function handleKickInput(player) {
    if (state.phase !== 'playing') return;
    if (player.frozenTimer > 0) return;
    if (player.kickCooldown > 0) return;

    const cdMultiplier = player.speedBoostTimer > 0 ? 0.52 : 1;
    player.kickCooldown = PHYSICS.kickCooldown * cdMultiplier;
    player.kickActiveTimer = PHYSICS.kickActiveDuration;
    player.kickFlash = 0.24;
    player.kickUsedThisWindow = false;

    const dirX = player.facingX;
    const dirY = player.facingY;
    const len = Math.hypot(dirX, dirY) || 1;
    const boost = player.speedBoostTimer > 0 ? PHYSICS.kickTurboBoost * 1.25 : PHYSICS.kickTurboBoost;
    player.vx += (dirX / len) * boost;
    player.vy += (dirY / len) * boost;

    // Intenta patear el balón más cercano al alcance
    const nearest = findNearestBall(player.x, player.y);
    if (nearest) {
      tryPowerKickBall(player, nearest);
    }
  }

  window.addEventListener('keydown', (e) => {
    if (state.screen === 'game' && dom.leaderboardModal.classList.contains('hidden')) {
      if (e.code === 'KeyP' && !e.repeat) {
        togglePause();
        return;
      }
      if (e.code === 'KeyM' && !e.repeat) {
        toggleSoundUI();
        return;
      }
      if (GAME_KEYS.has(e.code)) {
        e.preventDefault();
      }
    }

    keys[e.code] = true;

    if (state.screen === 'game' && !e.repeat && dom.leaderboardModal.classList.contains('hidden')) {
      if (e.code === 'Space') {
        handleKickInput(p1);
      } else if (!p2.isCpu && (e.code === 'Enter' || e.code === 'ShiftRight')) {
        handleKickInput(p2);
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    delete keys[e.code];
  });

  window.addEventListener('blur', clearAllKeys);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearAllKeys();
  });

  // =========================================================================
  // INTELIGENCIA ARTIFICIAL (CPU)
  // =========================================================================
  function findNearestBall(x, y) {
    if (state.balls.length === 0) return null;
    let best = state.balls[0];
    let bestDist = Math.hypot(best.x - x, best.y - y);
    for (let i = 1; i < state.balls.length; i++) {
      const b = state.balls[i];
      const d = Math.hypot(b.x - x, b.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = b;
      }
    }
    return best;
  }

  function updateCpuAI(dt) {
    if (!p2.isCpu || state.phase !== 'playing' || p2.frozenTimer > 0) {
      state.cpuInput.x = 0;
      state.cpuInput.y = 0;
      state.cpuInput.wantKick = false;
      return;
    }

    const profile = CPU_PROFILES[state.cpuDifficulty] || CPU_PROFILES.normal;
    state.cpuDecisionTimer -= dt;
    if (state.cpuDecisionTimer > 0) {
      return;
    }
    state.cpuDecisionTimer = profile.reactionInterval;

    // Elegir el balón más amenazante (prioriza el que está más cerca de la portería derecha)
    let targetBall = state.balls[0];
    if (state.balls.length > 1) {
      let bestThreat = -Infinity;
      for (const b of state.balls) {
        const threatScore = b.x + b.vx * 18 - Math.hypot(b.x - p2.x, b.y - p2.y) * 0.35;
        if (threatScore > bestThreat) {
          bestThreat = threatScore;
          targetBall = b;
        }
      }
    }

    if (!targetBall) return;

    // Evaluar si conviene ir por un ítem cercano en la cancha
    let seekItem = null;
    if (state.items.length > 0 && Math.random() < profile.itemSeekChance) {
      let bestItemDist = 250;
      for (const item of state.items) {
        const d = Math.hypot(item.x - p2.x, item.y - p2.y);
        // No ir por un ítem si el balón está muy peligroso cerca de la portería propia
        if (d < bestItemDist && targetBall.x < PITCH.right - 220) {
          bestItemDist = d;
          seekItem = item;
        }
      }
    }

    let targetX;
    let targetY;
    let wantKick = false;

    const goalLeftX = PITCH.x;
    const goalLeftY = PITCH.cy;

    if (seekItem) {
      targetX = seekItem.x;
      targetY = seekItem.y;
    } else {
      // Vector desde portería rival (izquierda) hacia el balón: colocarse DETRÁS del balón
      const gx = targetBall.x - goalLeftX;
      const gy = targetBall.y - goalLeftY;
      const gLen = Math.hypot(gx, gy) || 1;
      const behindDist = p2.r + targetBall.r + 12;

      const approachX = targetBall.x + (gx / gLen) * behindDist;
      const approachY = targetBall.y + (gy / gLen) * behindDist + (Math.random() - 0.5) * profile.aimNoise * 0.15;

      // Si el CPU está delante del balón (riesgo de autogol), rodearlo por arriba o abajo
      if (p2.x < targetBall.x - 10) {
        const dodgeSide = p2.y < targetBall.y ? -1 : 1;
        targetX = Math.min(PITCH.right - p2.r - 10, targetBall.x + 65);
        targetY = clamp(targetBall.y + dodgeSide * 74, PITCH.y + p2.r + 10, PITCH.bottom - p2.r - 10);
      } else {
        // Si está alineado detrás del balón, atacar hacia el balón
        const distToApproach = Math.hypot(approachX - p2.x, approachY - p2.y);
        if (distToApproach < 44) {
          targetX = targetBall.x - (gx / gLen) * 14;
          targetY = targetBall.y - (gy / gLen) * 14;
        } else {
          targetX = approachX;
          targetY = approachY;
        }
      }

      // Si el balón viene rápido hacia su portería derecha, interceptar en línea de gol
      if (targetBall.vx > 3.5 && targetBall.x > PITCH.cx) {
        const predictedY = clamp(
          targetBall.y + targetBall.vy * 10,
          GOAL.top + p2.r,
          GOAL.bottom - p2.r
        );
        if (p2.x < targetBall.x + 15) {
          targetX = Math.min(PITCH.right - p2.r - 18, targetBall.x + 48);
          targetY = predictedY;
        }
      }

      // Decidir si patear con fuerza cuando el balón está al alcance y el CPU está detrás del balón
      const distBall = Math.hypot(targetBall.x - p2.x, targetBall.y - p2.y);
      if (
        distBall <= p2.r + targetBall.r + PHYSICS.kickReachExtra + 6 &&
        p2.x >= targetBall.x - 6 &&
        p2.kickCooldown <= 0 &&
        Math.random() < profile.kickChance
      ) {
        wantKick = true;
      }
    }

    const dx = targetX - p2.x;
    const dy = targetY - p2.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 6) {
      state.cpuInput.x = dx / dist;
      state.cpuInput.y = dy / dist;
    } else {
      state.cpuInput.x = 0;
      state.cpuInput.y = 0;
    }

    state.cpuInput.wantKick = wantKick;
    if (wantKick) {
      handleKickInput(p2);
    }
  }

  // =========================================================================
  // SISTEMA DE ÍTEMS DE MEJORA
  // =========================================================================
  function spawnRandomItem() {
    if (!state.itemsEnabled || state.items.length >= 2) return;
    const def = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];

    let x = PITCH.cx;
    let y = PITCH.cy;
    for (let attempt = 0; attempt < 12; attempt++) {
      const cx = PITCH.x + 150 + Math.random() * (PITCH.w - 300);
      const cy = PITCH.y + 70 + Math.random() * (PITCH.h - 140);
      const nearP1 = Math.hypot(cx - p1.x, cy - p1.y) < 90;
      const nearP2 = Math.hypot(cx - p2.x, cy - p2.y) < 90;
      if (!nearP1 && !nearP2) {
        x = cx;
        y = cy;
        break;
      }
    }

    state.items.push({
      ...def,
      x,
      y,
      r: 20,
      age: 0,
      life: 14, // Desaparece si nadie lo recoge en 14s
    });
    spawnParticles(x, y, def.color, 10, 0.7);
  }

  function applyItemEffect(collector, item) {
    const opponent = collector.id === 1 ? p2 : p1;
    spawnParticles(item.x, item.y, item.color, 20, 1.1);

    switch (item.id) {
      case 'freeze_opponent': {
        opponent.frozenTimer = 3.3;
        opponent.vx = 0;
        opponent.vy = 0;
        sound.playFreeze();
        spawnParticles(opponent.x, opponent.y, '#7dd3fc', 22, 1.0);
        showItemToast(`❄️ ${collector.name} congeló a ${opponent.name}`, item.color);
        break;
      }
      case 'freeze_ball': {
        state.ballFreezeTimer = 2.8;
        sound.playFreeze();
        for (const b of state.balls) {
          spawnParticles(b.x, b.y, '#67e8f9', 16, 0.9);
        }
        showItemToast(`🧊 ¡Balón congelado!`, item.color);
        break;
      }
      case 'multiball': {
        const needed = Math.max(0, 3 - state.balls.length);
        for (let i = 0; i < needed; i++) {
          const ang = (Math.random() - 0.5) * 1.8 + (i % 2 === 0 ? 0 : Math.PI);
          const spd = 4.5 + Math.random() * 2.5;
          state.balls.push(
            createBall(
              PITCH.cx,
              PITCH.cy + (i === 0 ? -32 : 32),
              Math.cos(ang) * spd,
              Math.sin(ang) * spd,
              true
            )
          );
        }
        sound.playPowerup();
        spawnParticles(PITCH.cx, PITCH.cy, '#fde047', 24, 1.2);
        showItemToast(`⚽ ¡Multi-Balón activado!`, item.color);
        break;
      }
      case 'super_speed': {
        collector.speedBoostTimer = 6.0;
        sound.playPowerup();
        showItemToast(`⚡ ${collector.name}: Súper Turbo`, item.color);
        break;
      }
      case 'giant': {
        collector.giantTimer = 6.5;
        sound.playPowerup();
        showItemToast(`🛡️ ${collector.name}: Modo Gigante`, item.color);
        break;
      }
      case 'power_shot': {
        collector.powerShotCharges = Math.min(3, collector.powerShotCharges + 2);
        sound.playPowerup();
        showItemToast(`🔥 ${collector.name}: Cañón x2`, item.color);
        break;
      }
      default:
        sound.playPowerup();
    }
  }

  function clearActiveEffects() {
    state.items.length = 0;
    state.ballFreezeTimer = 0;
    state.itemSpawnTimer = 5.0;
    for (const pl of [p1, p2]) {
      pl.frozenTimer = 0;
      pl.speedBoostTimer = 0;
      pl.giantTimer = 0;
      pl.powerShotCharges = 0;
      pl.r = PHYSICS.playerRadius;
      pl.mass = PHYSICS.playerMass;
    }
  }

  // =========================================================================
  // FLUJO DE PARTIDO Y ESTADOS
  // =========================================================================
  function resetPositionsToCenter() {
    p1.x = PITCH.x + 190;
    p1.y = PITCH.cy;
    p1.vx = 0;
    p1.vy = 0;
    p1.facingX = 1;
    p1.facingY = 0;
    p1.kickCooldown = 0;
    p1.kickActiveTimer = 0;
    p1.kickFlash = 0;

    p2.x = PITCH.right - 190;
    p2.y = PITCH.cy;
    p2.vx = 0;
    p2.vy = 0;
    p2.facingX = -1;
    p2.facingY = 0;
    p2.kickCooldown = 0;
    p2.kickActiveTimer = 0;
    p2.kickFlash = 0;

    clearActiveEffects();
    state.balls = [createBall(PITCH.cx, PITCH.cy, 0, 0, false)];
  }

  function startCountdown() {
    resetPositionsToCenter();
    state.phase = 'countdown';
    state.countdownValue = 3;
    state.countdownTimer = 0.72;
    state.bannerText = '';
    state.bannerAlpha = 0;
    sound.playCountdownBeep(false);
  }

  function formatPlayerEffectsText(player) {
    const badges = [];
    if (player.frozenTimer > 0) badges.push(`❄️${Math.ceil(player.frozenTimer)}s`);
    if (player.speedBoostTimer > 0) badges.push(`⚡${Math.ceil(player.speedBoostTimer)}s`);
    if (player.giantTimer > 0) badges.push(`🛡️${Math.ceil(player.giantTimer)}s`);
    if (player.powerShotCharges > 0) badges.push(`🔥x${player.powerShotCharges}`);
    return badges.join(' ');
  }

  function updateHud() {
    dom.hudP1Name.textContent = p1.name;
    dom.hudP2Name.textContent = p2.name;
    dom.hudP1Score.textContent = String(p1.score);
    dom.hudP2Score.textContent = String(p2.score);
    dom.hudGoalTarget.textContent = `META: ${state.targetGoals} GOLES`;
    dom.hudTimer.textContent = formatTime(state.matchElapsed);

    dom.hudP1Effects.textContent = formatPlayerEffectsText(p1);
    dom.hudP2Effects.textContent = formatPlayerEffectsText(p2);

    const p1MaxCd = p1.speedBoostTimer > 0 ? PHYSICS.kickCooldown * 0.52 : PHYSICS.kickCooldown;
    const p2MaxCd = p2.speedBoostTimer > 0 ? PHYSICS.kickCooldown * 0.52 : PHYSICS.kickCooldown;
    const p1Ready = 1 - clamp(p1.kickCooldown / p1MaxCd, 0, 1);
    const p2Ready = 1 - clamp(p2.kickCooldown / p2MaxCd, 0, 1);
    dom.hudP1Turbo.style.width = `${Math.round(p1Ready * 100)}%`;
    dom.hudP2Turbo.style.width = `${Math.round(p2Ready * 100)}%`;
  }

  function startNewMatch(p1Name, p2Name, targetGoals) {
    p1.name = p1Name;
    p2.name = p2Name;
    p2.isCpu = state.gameMode === 'cpu';
    p1.score = 0;
    p2.score = 0;
    state.targetGoals = targetGoals;
    state.matchElapsed = 0;
    state.particles.length = 0;
    state.itemToastTimer = 0;
    state.matchSaved = false;
    state.goalScorerTeam = null;
    state.goalScorerName = '';

    dom.hudP2TeamTag.textContent = p2.isCpu ? `CPU · ${CPU_PROFILES[state.cpuDifficulty].label.toUpperCase()}` : 'ROJO';
    dom.stripP2.innerHTML = p2.isCpu
      ? '<strong class="text-red">CPU:</strong> Control Automático'
      : '<strong class="text-red">Rojo:</strong> Flechas + Enter / Shift Der. (Patada)';

    dom.gameoverModal.classList.add('hidden');
    dom.pauseOverlay.classList.add('hidden');
    dom.startScreen.classList.remove('screen-active');
    dom.gameScreen.classList.add('screen-active');
    dom.gameScreen.setAttribute('aria-hidden', 'false');
    state.screen = 'game';

    clearAllKeys();
    resetPositionsToCenter();
    updateHud();
    sound.ensureContext();
    startCountdown();

    if (!state.rafId) {
      state.lastFrameTime = performance.now();
      state.rafId = requestAnimationFrame(gameLoop);
    }
  }

  function exitToMenu() {
    state.screen = 'menu';
    state.phase = 'idle';
    clearAllKeys();
    dom.pauseOverlay.classList.add('hidden');
    dom.gameoverModal.classList.add('hidden');
    dom.gameScreen.classList.remove('screen-active');
    dom.gameScreen.setAttribute('aria-hidden', 'true');
    dom.startScreen.classList.add('screen-active');
  }

  function togglePause() {
    if (state.screen !== 'game') return;
    if (state.phase === 'playing') {
      state.phase = 'paused';
      clearAllKeys();
      dom.pauseOverlay.classList.remove('hidden');
    } else if (state.phase === 'paused') {
      state.phase = 'playing';
      dom.pauseOverlay.classList.add('hidden');
      state.lastFrameTime = performance.now();
    }
  }

  function toggleSoundUI() {
    const muted = sound.toggleMute();
    dom.btnSound.textContent = muted ? '🔇' : '🔊';
  }

  function handleGoalScored(scoringTeam) {
    if (state.phase !== 'playing') return;

    const scorer = scoringTeam === 'blue' ? p1 : p2;
    scorer.score += 1;
    state.phase = 'goal';
    state.goalBannerTimer = 1.65;
    state.goalScorerTeam = scoringTeam;
    state.goalScorerName = scorer.name;

    spawnGoalConfetti(scoringTeam);
    triggerShake(9, 0.28);
    sound.playGoal();
    updateHud();
  }

  function finishMatch() {
    state.phase = 'gameover';
    clearAllKeys();

    if (!state.matchSaved) {
      StorageManager.saveMatchResult({
        p1Name: p1.name,
        p2Name: p2.name,
        p1Score: p1.score,
        p2Score: p2.score,
        targetGoals: state.targetGoals,
        durationSeconds: Math.round(state.matchElapsed),
      });
      state.matchSaved = true;
    }

    const winner = p1.score > p2.score ? p1 : p2;
    dom.gameoverBadge.textContent =
      winner.team === 'blue' ? 'VICTORIA EQUIPO AZUL' : winner.isCpu ? 'VICTORIA DE LA CPU' : 'VICTORIA EQUIPO ROJO';
    dom.gameoverTitle.textContent = `¡Gana ${winner.name}!`;
    dom.gameoverTitle.className = `gameover-title ${winner.team === 'blue' ? 'text-blue' : 'text-red'}`;

    dom.finalP1Name.textContent = p1.name;
    dom.finalP2Name.textContent = p2.name;
    dom.finalP1Score.textContent = String(p1.score);
    dom.finalP2Score.textContent = String(p2.score);
    dom.gameoverStats.textContent = `Duración: ${formatTime(state.matchElapsed)} · Meta: ${state.targetGoals} goles · Guardado en el ranking`;

    sound.playVictory();
    dom.gameoverModal.classList.remove('hidden');
  }

  // =========================================================================
  // FÍSICA DEL JUEGO Y COLISIONES
  // =========================================================================
  function tryPowerKickBall(player, ball) {
    const dx = ball.x - player.x;
    const dy = ball.y - player.y;
    const dist = Math.hypot(dx, dy);
    const maxReach = player.r + ball.r + PHYSICS.kickReachExtra;

    if (dist <= maxReach && !player.kickUsedThisWindow) {
      const nx = dist > 0.001 ? dx / dist : player.facingX;
      const ny = dist > 0.001 ? dy / dist : player.facingY;

      const aimX = nx * 0.72 + player.facingX * 0.28;
      const aimY = ny * 0.72 + player.facingY * 0.28;
      const aimLen = Math.hypot(aimX, aimY) || 1;

      const hasCannon = player.powerShotCharges > 0;
      const shotMult = hasCannon ? 1.38 : 1.0;
      if (hasCannon) {
        player.powerShotCharges -= 1;
      }

      // Romper hielo si el balón estaba congelado
      if (state.ballFreezeTimer > 0) {
        state.ballFreezeTimer = 0;
        spawnParticles(ball.x, ball.y, '#67e8f9', 18, 1.2);
      }

      ball.vx = (aimX / aimLen) * PHYSICS.kickShotPower * shotMult + player.vx * 0.35;
      ball.vy = (aimY / aimLen) * PHYSICS.kickShotPower * shotMult + player.vy * 0.35;

      player.kickUsedThisWindow = true;
      spawnParticles(
        ball.x - nx * ball.r,
        ball.y - ny * ball.r,
        hasCannon ? '#fb923c' : player.color,
        hasCannon ? 22 : 14,
        hasCannon ? 1.35 : 1.15
      );
      triggerShake(hasCannon ? 7 : 4.5, hasCannon ? 0.18 : 0.12);
      sound.playKick(hasCannon ? 1.2 : 1.0);
    }
  }

  function updatePlayerInput(player, dtScale) {
    if (player.frozenTimer > 0) {
      player.vx *= Math.pow(0.7, dtScale);
      player.vy *= Math.pow(0.7, dtScale);
      return;
    }

    let ix = 0;
    let iy = 0;

    if (player.id === 1) {
      if (keys.KeyW) iy -= 1;
      if (keys.KeyS) iy += 1;
      if (keys.KeyA) ix -= 1;
      if (keys.KeyD) ix += 1;
    } else if (player.isCpu) {
      ix = state.cpuInput.x;
      iy = state.cpuInput.y;
    } else {
      if (keys.ArrowUp) iy -= 1;
      if (keys.ArrowDown) iy += 1;
      if (keys.ArrowLeft) ix -= 1;
      if (keys.ArrowRight) ix += 1;
    }

    const cpuProf = player.isCpu ? CPU_PROFILES[state.cpuDifficulty] : null;
    const boostMult = player.speedBoostTimer > 0 ? 1.42 : 1.0;
    const accel = PHYSICS.playerAccel * boostMult * (cpuProf ? cpuProf.accelFactor : 1);

    if (ix !== 0 || iy !== 0) {
      const len = Math.hypot(ix, iy);
      ix /= len;
      iy /= len;
      player.facingX = ix;
      player.facingY = iy;
      player.vx += ix * accel * dtScale;
      player.vy += iy * accel * dtScale;
    }

    const damping = Math.pow(PHYSICS.playerFriction, dtScale);
    player.vx *= damping;
    player.vy *= damping;

    let maxSpd = PHYSICS.playerMaxSpeed * boostMult * (cpuProf ? cpuProf.speedFactor : 1);
    if (player.kickActiveTimer > 0) maxSpd *= 1.45;

    const speed = Math.hypot(player.vx, player.vy);
    if (speed > maxSpd) {
      player.vx = (player.vx / speed) * maxSpd;
      player.vy = (player.vy / speed) * maxSpd;
    }
  }

  function constrainPlayer(player) {
    const inGoalMouthY = player.y > GOAL.top + player.r * 0.3 && player.y < GOAL.bottom - player.r * 0.3;
    const minX = inGoalMouthY ? PITCH.x + player.r * 0.45 : PITCH.x + player.r;
    const maxX = inGoalMouthY ? PITCH.right - player.r * 0.45 : PITCH.right - player.r;

    if (player.x < minX) {
      player.x = minX;
      if (player.vx < 0) player.vx = 0;
    } else if (player.x > maxX) {
      player.x = maxX;
      if (player.vx > 0) player.vx = 0;
    }

    if (player.y < PITCH.y + player.r) {
      player.y = PITCH.y + player.r;
      if (player.vy < 0) player.vy = 0;
    } else if (player.y > PITCH.bottom - player.r) {
      player.y = PITCH.bottom - player.r;
      if (player.vy > 0) player.vy = 0;
    }

    for (const post of GOALPOSTS) {
      const dx = player.x - post.x;
      const dy = player.y - post.y;
      const dist = Math.hypot(dx, dy);
      const minDist = player.r + GOAL.postRadius;
      if (dist < minDist && dist > 0.0001) {
        const nx = dx / dist;
        const ny = dy / dist;
        player.x = post.x + nx * minDist;
        player.y = post.y + ny * minDist;
        const dot = player.vx * nx + player.vy * ny;
        if (dot < 0) {
          player.vx -= dot * nx;
          player.vy -= dot * ny;
        }
      }
    }
  }

  function resolvePlayerVsPlayer() {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);
    const minDist = p1.r + p2.r;

    if (dist < minDist && dist > 0.0001) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;

      p1.x -= nx * overlap * 0.5;
      p1.y -= ny * overlap * 0.5;
      p2.x += nx * overlap * 0.5;
      p2.y += ny * overlap * 0.5;

      const rvx = p2.vx - p1.vx;
      const rvy = p2.vy - p1.vy;
      const velAlongNormal = rvx * nx + rvy * ny;

      if (velAlongNormal < 0) {
        const j = (-(1 + PHYSICS.playerPlayerRestitution) * velAlongNormal) / (1 / p1.mass + 1 / p2.mass);
        const ix = j * nx;
        const iy = j * ny;
        p1.vx -= ix / p1.mass;
        p1.vy -= iy / p1.mass;
        p2.vx += ix / p2.mass;
        p2.vy += iy / p2.mass;
      }
    }
  }

  function resolvePlayerVsBall(player, ball) {
    const dx = ball.x - player.x;
    const dy = ball.y - player.y;
    const dist = Math.hypot(dx, dy);
    const minDist = player.r + ball.r;

    if (dist < minDist && dist > 0.0001) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;

      ball.x += nx * overlap * 0.8;
      ball.y += ny * overlap * 0.8;
      player.x -= nx * overlap * 0.2;
      player.y -= ny * overlap * 0.2;

      if (player.kickActiveTimer > 0 && !player.kickUsedThisWindow) {
        tryPowerKickBall(player, ball);
        return;
      }

      // Si el balón está congelado, se queda clavado a menos que lo empujen con mucha fuerza o patada
      if (state.ballFreezeTimer > 0) {
        return;
      }

      const rvx = ball.vx - player.vx;
      const rvy = ball.vy - player.vy;
      const velAlongNormal = rvx * nx + rvy * ny;

      if (velAlongNormal < 0) {
        const restitution = PHYSICS.playerBallRestitution;
        const j = (-(1 + restitution) * velAlongNormal) / (1 / ball.mass + 1 / player.mass);
        ball.vx += (j / ball.mass) * nx + player.vx * 0.18;
        ball.vy += (j / ball.mass) * ny + player.vy * 0.18;
        player.vx -= (j / player.mass) * nx * 0.4;
        player.vy -= (j / player.mass) * ny * 0.4;

        const impactSpeed = Math.abs(velAlongNormal);
        if (impactSpeed > 1.2) {
          sound.playKick(Math.min(0.85, impactSpeed / 11));
          spawnParticles(ball.x - nx * ball.r, ball.y - ny * ball.r, '#f8fafc', 5, 0.55);
        }
      }
    }
  }

  function resolveBallVsBall(b1, b2) {
    const dx = b2.x - b1.x;
    const dy = b2.y - b1.y;
    const dist = Math.hypot(dx, dy);
    const minDist = b1.r + b2.r;

    if (dist < minDist && dist > 0.0001) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;

      b1.x -= nx * overlap * 0.5;
      b1.y -= ny * overlap * 0.5;
      b2.x += nx * overlap * 0.5;
      b2.y += ny * overlap * 0.5;

      const rvx = b2.vx - b1.vx;
      const rvy = b2.vy - b1.vy;
      const vn = rvx * nx + rvy * ny;
      if (vn < 0) {
        const j = (-(1 + 0.9) * vn) / (1 / b1.mass + 1 / b2.mass);
        b1.vx -= (j / b1.mass) * nx;
        b1.vy -= (j / b1.mass) * ny;
        b2.vx += (j / b2.mass) * nx;
        b2.vy += (j / b2.mass) * ny;
      }
    }
  }

  function resolveBallWallsAndGoals(ball) {
    const r = ball.r;
    const inGoalY = ball.y > GOAL.top + r * 0.35 && ball.y < GOAL.bottom - r * 0.35;

    if (ball.y - r < PITCH.y && ball.x >= PITCH.x && ball.x <= PITCH.right) {
      ball.y = PITCH.y + r;
      if (ball.vy < 0) {
        sound.playWallBounce(Math.abs(ball.vy));
        ball.vy = -ball.vy * PHYSICS.wallRestitution;
      }
    } else if (ball.y + r > PITCH.bottom && ball.x >= PITCH.x && ball.x <= PITCH.right) {
      ball.y = PITCH.bottom - r;
      if (ball.vy > 0) {
        sound.playWallBounce(Math.abs(ball.vy));
        ball.vy = -ball.vy * PHYSICS.wallRestitution;
      }
    }

    const bevel = PITCH.cornerBevel;
    const corners = [
      { px: PITCH.x + bevel, py: PITCH.y, nx: Math.SQRT1_2, ny: Math.SQRT1_2 },
      { px: PITCH.right - bevel, py: PITCH.y, nx: -Math.SQRT1_2, ny: Math.SQRT1_2 },
      { px: PITCH.x + bevel, py: PITCH.bottom, nx: Math.SQRT1_2, ny: -Math.SQRT1_2 },
      { px: PITCH.right - bevel, py: PITCH.bottom, nx: -Math.SQRT1_2, ny: -Math.SQRT1_2 },
    ];

    for (const c of corners) {
      const signedDist = (ball.x - c.px) * c.nx + (ball.y - c.py) * c.ny;
      if (signedDist < r) {
        const push = r - signedDist;
        ball.x += c.nx * push;
        ball.y += c.ny * push;
        const vn = ball.vx * c.nx + ball.vy * c.ny;
        if (vn < 0) {
          sound.playWallBounce(Math.abs(vn));
          ball.vx -= (1 + PHYSICS.wallRestitution) * vn * c.nx;
          ball.vy -= (1 + PHYSICS.wallRestitution) * vn * c.ny;
        }
      }
    }

    if (!inGoalY) {
      if (ball.x - r < PITCH.x) {
        ball.x = PITCH.x + r;
        if (ball.vx < 0) {
          sound.playWallBounce(Math.abs(ball.vx));
          ball.vx = -ball.vx * PHYSICS.wallRestitution;
        }
      } else if (ball.x + r > PITCH.right) {
        ball.x = PITCH.right - r;
        if (ball.vx > 0) {
          sound.playWallBounce(Math.abs(ball.vx));
          ball.vx = -ball.vx * PHYSICS.wallRestitution;
        }
      }
    } else {
      if (ball.x < PITCH.x || ball.x > PITCH.right) {
        if (ball.y - r < GOAL.top) {
          ball.y = GOAL.top + r;
          if (ball.vy < 0) ball.vy = -ball.vy * 0.55;
        } else if (ball.y + r > GOAL.bottom) {
          ball.y = GOAL.bottom - r;
          if (ball.vy > 0) ball.vy = -ball.vy * 0.55;
        }
      }

      if (ball.x - r < PITCH.x - GOAL.depth) {
        ball.x = PITCH.x - GOAL.depth + r;
        ball.vx = -ball.vx * 0.45;
      } else if (ball.x + r > PITCH.right + GOAL.depth) {
        ball.x = PITCH.right + GOAL.depth - r;
        ball.vx = -ball.vx * 0.45;
      }
    }

    for (const post of GOALPOSTS) {
      const dx = ball.x - post.x;
      const dy = ball.y - post.y;
      const dist = Math.hypot(dx, dy);
      const minDist = r + GOAL.postRadius;
      if (dist < minDist && dist > 0.0001) {
        const nx = dx / dist;
        const ny = dy / dist;
        ball.x = post.x + nx * minDist;
        ball.y = post.y + ny * minDist;

        const vn = ball.vx * nx + ball.vy * ny;
        if (vn < 0) {
          sound.playPostClang(Math.abs(vn));
          spawnParticles(post.x + nx * GOAL.postRadius, post.y + ny * GOAL.postRadius, '#fbbf24', 10, 0.8);
          triggerShake(3.5, 0.1);
          ball.vx -= (1 + PHYSICS.postRestitution) * vn * nx;
          ball.vy -= (1 + PHYSICS.postRestitution) * vn * ny;
        }
      }
    }

    if (state.phase === 'playing') {
      if (ball.x + r * 0.35 < PITCH.x && ball.y > GOAL.top && ball.y < GOAL.bottom) {
        handleGoalScored('red');
        return true;
      }
      if (ball.x - r * 0.35 > PITCH.right && ball.y > GOAL.top && ball.y < GOAL.bottom) {
        handleGoalScored('blue');
        return true;
      }
    }
    return false;
  }

  function updateItems(dt) {
    if (!state.itemsEnabled || state.phase !== 'playing') return;

    state.itemSpawnTimer -= dt;
    if (state.itemSpawnTimer <= 0) {
      spawnRandomItem();
      state.itemSpawnTimer = 8.5 + Math.random() * 4.0;
    }

    for (let i = state.items.length - 1; i >= 0; i--) {
      const item = state.items[i];
      item.age += dt;
      item.life -= dt;

      if (item.life <= 0) {
        state.items.splice(i, 1);
        continue;
      }

      // Colisión de recogida por los jugadores
      let picked = false;
      for (const pl of [p1, p2]) {
        if (Math.hypot(pl.x - item.x, pl.y - item.y) <= pl.r + item.r) {
          applyItemEffect(pl, item);
          state.items.splice(i, 1);
          picked = true;
          break;
        }
      }
      if (picked) continue;
    }
  }

  function updatePhysics(dt) {
    const dtScale = dt * 60;

    if (state.ballFreezeTimer > 0) {
      state.ballFreezeTimer = Math.max(0, state.ballFreezeTimer - dt);
    }

    // Temporizadores de jugadores y efecto gigante
    for (const pl of [p1, p2]) {
      if (pl.kickCooldown > 0) pl.kickCooldown = Math.max(0, pl.kickCooldown - dt);
      if (pl.kickActiveTimer > 0) pl.kickActiveTimer = Math.max(0, pl.kickActiveTimer - dt);
      if (pl.kickFlash > 0) pl.kickFlash = Math.max(0, pl.kickFlash - dt);
      if (pl.frozenTimer > 0) pl.frozenTimer = Math.max(0, pl.frozenTimer - dt);
      if (pl.speedBoostTimer > 0) pl.speedBoostTimer = Math.max(0, pl.speedBoostTimer - dt);
      if (pl.giantTimer > 0) {
        pl.giantTimer = Math.max(0, pl.giantTimer - dt);
        pl.r = PHYSICS.playerRadius * 1.45;
        pl.mass = PHYSICS.playerMass * 1.65;
      } else {
        pl.r = PHYSICS.playerRadius;
        pl.mass = PHYSICS.playerMass;
      }
    }

    if (state.phase === 'playing') {
      updateCpuAI(dt);
      updatePlayerInput(p1, dtScale);
      updatePlayerInput(p2, dtScale);
    }

    const subDtScale = dtScale / PHYSICS.substeps;
    const isBallFrozen = state.ballFreezeTimer > 0;
    const ballDamping = Math.pow(isBallFrozen ? 0.72 : PHYSICS.ballFriction, subDtScale);

    for (let step = 0; step < PHYSICS.substeps; step++) {
      if (state.phase === 'playing') {
        p1.x += p1.vx * subDtScale;
        p1.y += p1.vy * subDtScale;
        p2.x += p2.vx * subDtScale;
        p2.y += p2.vy * subDtScale;

        resolvePlayerVsPlayer();
        constrainPlayer(p1);
        constrainPlayer(p2);
      }

      for (let i = 0; i < state.balls.length; i++) {
        const b = state.balls[i];
        b.x += b.vx * subDtScale;
        b.y += b.vy * subDtScale;
        b.vx *= ballDamping;
        b.vy *= ballDamping;

        const ballSpeed = Math.hypot(b.vx, b.vy);
        if (ballSpeed > PHYSICS.ballMaxSpeed) {
          b.vx = (b.vx / ballSpeed) * PHYSICS.ballMaxSpeed;
          b.vy = (b.vy / ballSpeed) * PHYSICS.ballMaxSpeed;
        } else if (ballSpeed < 0.03) {
          b.vx = 0;
          b.vy = 0;
        }

        if (state.phase === 'playing') {
          resolvePlayerVsBall(p1, b);
          resolvePlayerVsBall(p2, b);
        }
      }

      // Colisiones balón vs balón (en multi-balón)
      for (let i = 0; i < state.balls.length; i++) {
        for (let j = i + 1; j < state.balls.length; j++) {
          resolveBallVsBall(state.balls[i], state.balls[j]);
        }
      }

      for (let i = 0; i < state.balls.length; i++) {
        const goalTriggered = resolveBallWallsAndGoals(state.balls[i]);
        if (goalTriggered) break;
      }
    }

    // Estela y rotación de cada balón
    for (const b of state.balls) {
      const currentSpeed = Math.hypot(b.vx, b.vy);
      b.angle += currentSpeed * 0.045 * dtScale;

      if (currentSpeed > 8.5) {
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 10) b.trail.shift();
      } else if (b.trail.length > 0) {
        b.trail.shift();
      }
    }

    updateItems(dt);
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const pt = state.particles[i];
      pt.x += pt.vx * dt * 60;
      pt.y += pt.vy * dt * 60;
      pt.vx *= Math.pow(0.94, dt * 60);
      pt.vy *= Math.pow(0.94, dt * 60);
      pt.life -= dt;
      if (pt.life <= 0) {
        state.particles.splice(i, 1);
      }
    }
  }

  // =========================================================================
  // RENDERIZADO DEL CAMPO, SKINS, ÍTEMS Y EFECTOS EN CANVAS
  // =========================================================================
  function drawPitch() {
    ctx.fillStyle = '#07131e';
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    ctx.save();
    ctx.beginPath();
    ctx.rect(PITCH.x, PITCH.y, PITCH.w, PITCH.h);
    ctx.clip();

    const stripeCount = 12;
    const stripeW = PITCH.w / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#0f5132' : '#14603c';
      ctx.fillRect(PITCH.x + i * stripeW, PITCH.y, stripeW + 1, PITCH.h);
    }

    const turfGlow = ctx.createRadialGradient(
      PITCH.cx,
      PITCH.cy,
      60,
      PITCH.cx,
      PITCH.cy,
      PITCH.w * 0.65
    );
    turfGlow.addColorStop(0, 'rgba(52, 211, 153, 0.14)');
    turfGlow.addColorStop(1, 'rgba(2, 6, 23, 0.38)');
    ctx.fillStyle = turfGlow;
    ctx.fillRect(PITCH.x, PITCH.y, PITCH.w, PITCH.h);
    ctx.restore();

    drawGoalBox(PITCH.x - GOAL.depth, GOAL.top, GOAL.depth, GOAL.height, 'left', '#38bdf8');
    drawGoalBox(PITCH.right, GOAL.top, GOAL.depth, GOAL.height, 'right', '#fb7185');

    ctx.strokeStyle = 'rgba(241, 245, 249, 0.85)';
    ctx.lineWidth = 3;

    const b = PITCH.cornerBevel;
    ctx.beginPath();
    ctx.moveTo(PITCH.x + b, PITCH.y);
    ctx.lineTo(PITCH.right - b, PITCH.y);
    ctx.lineTo(PITCH.right, PITCH.y + b);
    ctx.lineTo(PITCH.right, PITCH.bottom - b);
    ctx.lineTo(PITCH.right - b, PITCH.bottom);
    ctx.lineTo(PITCH.x + b, PITCH.bottom);
    ctx.lineTo(PITCH.x, PITCH.bottom - b);
    ctx.lineTo(PITCH.x, PITCH.y + b);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(PITCH.cx, PITCH.y);
    ctx.lineTo(PITCH.cx, PITCH.bottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(PITCH.cx, PITCH.cy, 76, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(241, 245, 249, 0.9)';
    ctx.beginPath();
    ctx.arc(PITCH.cx, PITCH.cy, 5, 0, Math.PI * 2);
    ctx.fill();

    const areaLargeW = 148;
    const areaLargeH = 310;
    const areaSmallW = 62;
    const areaSmallH = 200;

    ctx.strokeRect(PITCH.x, PITCH.cy - areaLargeH / 2, areaLargeW, areaLargeH);
    ctx.strokeRect(PITCH.x, PITCH.cy - areaSmallH / 2, areaSmallW, areaSmallH);

    ctx.beginPath();
    ctx.arc(PITCH.x + 112, PITCH.cy, 54, -0.78, 0.78);
    ctx.stroke();

    ctx.strokeRect(PITCH.right - areaLargeW, PITCH.cy - areaLargeH / 2, areaLargeW, areaLargeH);
    ctx.strokeRect(PITCH.right - areaSmallW, PITCH.cy - areaSmallH / 2, areaSmallW, areaSmallH);

    ctx.beginPath();
    ctx.arc(PITCH.right - 112, PITCH.cy, 54, Math.PI - 0.78, Math.PI + 0.78);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(PITCH.x + 112, PITCH.cy, 4, 0, Math.PI * 2);
    ctx.arc(PITCH.right - 112, PITCH.cy, 4, 0, Math.PI * 2);
    ctx.fill();

    for (const post of GOALPOSTS) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(post.x, post.y, GOAL.postRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawGoalBox(x, y, w, h, side, accentColor) {
    ctx.save();
    ctx.fillStyle = side === 'left' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(251, 113, 133, 0.1)';
    ctx.fillRect(x, y, w, h);

    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    ctx.strokeStyle = 'rgba(226, 232, 240, 0.22)';
    ctx.lineWidth = 1;
    for (let gx = x; gx <= x + w; gx += 12) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + h);
      ctx.stroke();
    }
    for (let gy = y; gy <= y + h; gy += 12) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + w, gy);
      ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    if (side === 'left') {
      ctx.moveTo(x + w, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x + w, y + h);
    } else {
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
    }
    ctx.stroke();
  }

  function drawItems() {
    for (const item of state.items) {
      const bob = Math.sin(item.age * 4.5) * 3.5;
      const pulse = 1 + Math.sin(item.age * 6) * 0.08;
      const drawY = item.y + bob;

      // Parpadeo cuando queda poco tiempo
      if (item.life < 3 && Math.floor(item.life * 8) % 2 === 0) {
        continue;
      }

      ctx.save();
      // Halo exterior
      ctx.beginPath();
      ctx.arc(item.x, drawY, item.r * 1.35 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = `${item.color}28`;
      ctx.fill();

      // Orbe
      ctx.fillStyle = item.bg;
      ctx.beginPath();
      ctx.arc(item.x, drawY, item.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = item.color;
      ctx.lineWidth = 2.6;
      ctx.stroke();

      // Icono central
      ctx.font = '18px Segoe UI Emoji, Apple Color Emoji, Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.icon, item.x, drawY + 1);

      // Etiqueta debajo del ítem
      ctx.font = '700 11px Outfit, sans-serif';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(item.shortLabel, item.x, drawY + item.r + 12);
      ctx.restore();
    }
  }

  function drawPlayerSkinBody(player) {
    const r = player.r;
    const x = player.x;
    const y = player.y;
    const isBlue = player.team === 'blue';

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();

    if (player.skin === 'cyber') {
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r);
      g.addColorStop(0, '#cbd5e1');
      g.addColorStop(0.55, '#334155');
      g.addColorStop(1, '#0f172a');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);

      // Líneas cibernéticas y núcleo brillante
      ctx.strokeStyle = isBlue ? '#38bdf8' : '#fb7185';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - r, y);
      ctx.lineTo(x + r, y);
      ctx.moveTo(x, y - r);
      ctx.lineTo(x, y + r);
      ctx.stroke();

      ctx.fillStyle = isBlue ? '#7dd3fc' : '#fda4af';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.32, 0, Math.PI * 2);
      ctx.fill();
    } else if (player.skin === 'flame') {
      const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, 2, x, y, r);
      g.addColorStop(0, '#fef08a');
      g.addColorStop(0.45, '#f97316');
      g.addColorStop(1, '#7c2d12');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);

      // Corona de llamas interna
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const rIn = r * 0.42;
        const rOut = r * 0.78;
        ctx.moveTo(x + Math.cos(a) * rIn, y + Math.sin(a) * rIn);
        ctx.lineTo(x + Math.cos(a + 0.18) * rOut, y + Math.sin(a + 0.18) * rOut);
      }
      ctx.stroke();
    } else if (player.skin === 'galaxy') {
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r);
      g.addColorStop(0, '#d8b4fe');
      g.addColorStop(0.5, '#6b21a8');
      g.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);

      // Estrellas cósmicas
      const stars = [
        [-0.4, -0.3, 2],
        [0.35, -0.25, 1.6],
        [-0.15, 0.4, 1.8],
        [0.4, 0.3, 1.4],
      ];
      ctx.fillStyle = '#fef08a';
      for (const [sx, sy, sr] of stars) {
        ctx.beginPath();
        ctx.arc(x + sx * r, y + sy * r, sr, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (player.skin === 'gold') {
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, 3, x, y, r);
      g.addColorStop(0, '#fef9c3');
      g.addColorStop(0.55, '#eab308');
      g.addColorStop(1, '#713f12');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);

      // Estrella de campeón en el centro
      ctx.fillStyle = '#422006';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const aOuter = (i * Math.PI * 2) / 5 - Math.PI / 2;
        const aInner = aOuter + Math.PI / 5;
        const px = x + Math.cos(aOuter) * (r * 0.42);
        const py = y + Math.sin(aOuter) * (r * 0.42);
        const ix = x + Math.cos(aInner) * (r * 0.18);
        const iy = y + Math.sin(aInner) * (r * 0.18);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
        ctx.lineTo(ix, iy);
      }
      ctx.closePath();
      ctx.fill();
    } else if (player.skin === 'ice') {
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r);
      g.addColorStop(0, '#ecfeff');
      g.addColorStop(0.55, '#06b6d4');
      g.addColorStop(1, '#164e63');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);

      // Cristal hexagonal
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const px = x + Math.cos(a) * (r * 0.56);
        const py = y + Math.sin(a) * (r * 0.56);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    } else {
      // Skin clásica
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, 3, x, y, r);
      if (isBlue) {
        g.addColorStop(0, '#7dd3fc');
        g.addColorStop(0.55, '#0284c7');
        g.addColorStop(1, '#0c4a6e');
      } else {
        g.addColorStop(0, '#fda4af');
        g.addColorStop(0.55, '#e11d48');
        g.addColorStop(1, '#881337');
      }
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    ctx.restore();
  }

  function drawPlayer(player) {
    ctx.save();

    // Aura de efectos activos (turbo / cañón / congelado)
    if (player.speedBoostTimer > 0) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r + 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.75)';
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (player.powerShotCharges > 0) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r + 11, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(251, 146, 60, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Onda expansiva de patada / turbo
    if (player.kickFlash > 0) {
      const progress = 1 - player.kickFlash / 0.24;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r + 4 + progress * 22, 0, Math.PI * 2);
      ctx.strokeStyle =
        player.team === 'blue' ? `rgba(56, 189, 248, ${1 - progress})` : `rgba(251, 113, 133, ${1 - progress})`;
      ctx.lineWidth = 4 * (1 - progress * 0.5);
      ctx.stroke();
    }

    // Sombra bajo la ficha
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(player.x + 2, player.y + 5, player.r, player.r * 0.88, 0, 0, Math.PI * 2);
    ctx.fill();

    // Halo de carga lista de patada
    if (player.kickCooldown <= 0 && player.frozenTimer <= 0) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = player.glowColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Cuerpo con Skin seleccionada
    drawPlayerSkinBody(player);

    // Anillo identificador del equipo (siempre claro aunque usen skins especiales)
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
    ctx.strokeStyle = player.team === 'blue' ? '#7dd3fc' : '#fda4af';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Indicador de dirección (visor)
    const dirLen = Math.hypot(player.facingX, player.facingY) || 1;
    const fx = player.facingX / dirLen;
    const fy = player.facingY / dirLen;
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(
      player.x + fx * (player.r * 0.64),
      player.y + fy * (player.r * 0.64),
      5,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Capa de hielo si está congelado
    if (player.frozenTimer > 0) {
      ctx.fillStyle = 'rgba(103, 232, 249, 0.45)';
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cffafe';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.font = '16px Segoe UI Emoji, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('❄️', player.x, player.y);
    }

    // Etiqueta del jugador encima de la ficha
    ctx.font = '700 12px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(248, 250, 252, 0.94)';
    ctx.fillText(player.name, player.x, player.y - player.r - 11);

    ctx.restore();
  }

  function drawBalls() {
    const isFrozen = state.ballFreezeTimer > 0;

    for (const ball of state.balls) {
      for (let i = 0; i < ball.trail.length; i++) {
        const t = ball.trail[i];
        const frac = (i + 1) / ball.trail.length;
        ctx.fillStyle = isFrozen
          ? `rgba(103, 232, 249, ${frac * 0.3})`
          : `rgba(253, 224, 71, ${frac * 0.25})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, ball.r * frac * 0.85, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(ball.x + 2, ball.y + 4, ball.r, ball.r * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.translate(ball.x, ball.y);
      ctx.rotate(ball.angle);

      const grad = ctx.createRadialGradient(-4, -4, 2, 0, 0, ball.r);
      if (isFrozen) {
        grad.addColorStop(0, '#ecfeff');
        grad.addColorStop(0.75, '#67e8f9');
        grad.addColorStop(1, '#0891b2');
      } else if (ball.isExtra) {
        grad.addColorStop(0, '#fef9c3');
        grad.addColorStop(0.75, '#fde047');
        grad.addColorStop(1, '#ca8a04');
      } else {
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.75, '#e2e8f0');
        grad.addColorStop(1, '#94a3b8');
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, ball.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isFrozen ? '#cffafe' : '#0f172a';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.fillStyle = isFrozen ? '#155e75' : '#0f172a';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
        const px = Math.cos(a) * 5.2;
        const py = Math.sin(a) * 5.2;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * (ball.r - 1.5), Math.sin(a) * (ball.r - 1.5), 2.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      if (isFrozen) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r + 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(165, 243, 252, 0.85)';
        ctx.lineWidth = 2.4;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawParticles() {
    for (const pt of state.particles) {
      const alpha = clamp(pt.life / pt.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawOverlayBanners() {
    // Toast flotante de ítem recogido
    if (state.itemToastTimer > 0 && state.itemToastText) {
      ctx.save();
      const alpha = clamp(state.itemToastTimer, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.font = '800 20px Outfit, sans-serif';
      ctx.fillStyle = state.itemToastColor;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 10;
      ctx.fillText(state.itemToastText, LOGICAL_W / 2, PITCH.y + 28);
      ctx.restore();
    }

    if (state.phase === 'countdown') {
      ctx.save();
      ctx.fillStyle = 'rgba(5, 8, 20, 0.42)';
      ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

      const label = state.countdownValue > 0 ? String(state.countdownValue) : '¡GOL!';
      const subLabel =
        state.countdownValue > 0 ? 'Prepárate en tu posición...' : '¡A jugar!';

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.font = '900 96px Orbitron, sans-serif';
      ctx.shadowColor = state.countdownValue > 0 ? 'rgba(56, 189, 248, 0.7)' : 'rgba(16, 185, 129, 0.85)';
      ctx.shadowBlur = 28;
      ctx.fillStyle = state.countdownValue > 0 ? '#f8fafc' : '#34d399';
      ctx.fillText(label, LOGICAL_W / 2, LOGICAL_H / 2 - 10);

      ctx.shadowBlur = 0;
      ctx.font = '700 20px Outfit, sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(subLabel, LOGICAL_W / 2, LOGICAL_H / 2 + 56);
      ctx.restore();
    } else if (state.phase === 'goal') {
      ctx.save();
      ctx.fillStyle = 'rgba(5, 8, 20, 0.34)';
      ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

      const color = state.goalScorerTeam === 'blue' ? '#38bdf8' : '#fb7185';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.font = '900 84px Orbitron, sans-serif';
      ctx.shadowColor = color;
      ctx.shadowBlur = 32;
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('¡GOOOOL!', LOGICAL_W / 2, LOGICAL_H / 2 - 18);

      ctx.shadowBlur = 0;
      ctx.font = '800 28px Outfit, sans-serif';
      ctx.fillStyle = color;
      ctx.fillText(`Anota ${state.goalScorerName}`, LOGICAL_W / 2, LOGICAL_H / 2 + 44);
      ctx.restore();
    } else if (state.bannerAlpha > 0 && state.bannerText) {
      ctx.save();
      ctx.globalAlpha = state.bannerAlpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 54px Orbitron, sans-serif';
      ctx.fillStyle = '#34d399';
      ctx.shadowColor = 'rgba(16, 185, 129, 0.7)';
      ctx.shadowBlur = 20;
      ctx.fillText(state.bannerText, LOGICAL_W / 2, LOGICAL_H / 2 - 120);
      ctx.restore();
    }
  }

  function render() {
    ctx.save();

    if (state.shakeTime > 0) {
      const sx = (Math.random() - 0.5) * state.shakeIntensity * 2;
      const sy = (Math.random() - 0.5) * state.shakeIntensity * 2;
      ctx.translate(sx, sy);
    }

    drawPitch();
    drawItems();
    drawParticles();
    drawPlayer(p1);
    drawPlayer(p2);
    drawBalls();
    drawOverlayBanners();

    ctx.restore();
  }

  // =========================================================================
  // BUCLE PRINCIPAL A 60 FPS (requestAnimationFrame)
  // =========================================================================
  function gameLoop(timestamp) {
    if (state.screen !== 'game') {
      state.rafId = null;
      return;
    }

    const rawDt = (timestamp - state.lastFrameTime) / 1000;
    state.lastFrameTime = timestamp;
    const dt = Math.min(0.04, Math.max(0.001, rawDt));

    if (state.shakeTime > 0) {
      state.shakeTime = Math.max(0, state.shakeTime - dt);
      if (state.shakeTime === 0) state.shakeIntensity = 0;
    }

    if (state.bannerAlpha > 0) {
      state.bannerAlpha = Math.max(0, state.bannerAlpha - dt * 1.4);
    }

    if (state.itemToastTimer > 0) {
      state.itemToastTimer = Math.max(0, state.itemToastTimer - dt);
    }

    if (state.phase === 'countdown') {
      state.countdownTimer -= dt;
      if (state.countdownTimer <= 0) {
        if (state.countdownValue > 1) {
          state.countdownValue -= 1;
          state.countdownTimer = 0.72;
          sound.playCountdownBeep(false);
        } else if (state.countdownValue === 1) {
          state.countdownValue = 0;
          state.countdownTimer = 0.35;
          sound.playCountdownBeep(true);
          sound.playWhistle();
        } else {
          state.phase = 'playing';
          state.bannerText = '¡EN JUEGO!';
          state.bannerAlpha = 1;
        }
      }
      updateParticles(dt);
    } else if (state.phase === 'playing') {
      state.matchElapsed += dt;
      updatePhysics(dt);
      updateParticles(dt);
      updateHud();
    } else if (state.phase === 'goal') {
      updatePhysics(dt);
      updateParticles(dt);
      state.goalBannerTimer -= dt;
      if (state.goalBannerTimer <= 0) {
        if (p1.score >= state.targetGoals || p2.score >= state.targetGoals) {
          finishMatch();
        } else {
          startCountdown();
        }
      }
    }

    render();
    state.rafId = requestAnimationFrame(gameLoop);
  }

  // =========================================================================
  // RENDERIZADO DEL MODAL DE TABLA DE PUNTUACIONES E HISTORIAL
  // =========================================================================
  function renderLeaderboardTables() {
    const ranking = StorageManager.getRanking();
    const history = StorageManager.getHistory();

    dom.rankingCount.textContent = String(ranking.length);
    dom.historyCount.textContent = String(history.length);

    dom.rankingTbody.innerHTML = '';
    if (ranking.length === 0) {
      dom.rankingEmpty.classList.remove('hidden');
    } else {
      dom.rankingEmpty.classList.add('hidden');
      ranking.forEach((entry, index) => {
        const tr = document.createElement('tr');

        const tdRank = document.createElement('td');
        tdRank.className = 'rank-cell';
        if (index === 0) tdRank.classList.add('rank-top-1');
        else if (index === 1) tdRank.classList.add('rank-top-2');
        else if (index === 2) tdRank.classList.add('rank-top-3');
        tdRank.textContent = `#${index + 1}`;

        const tdName = document.createElement('td');
        tdName.style.fontWeight = '700';
        tdName.textContent = entry.name;

        const tdPj = document.createElement('td');
        tdPj.textContent = String(entry.pj);

        const tdPg = document.createElement('td');
        tdPg.textContent = String(entry.pg);

        const tdPp = document.createElement('td');
        tdPp.textContent = String(entry.pp);

        const tdGf = document.createElement('td');
        tdGf.textContent = String(entry.gf);

        const tdPts = document.createElement('td');
        tdPts.className = 'pts-cell';
        tdPts.textContent = String(entry.puntos);

        tr.append(tdRank, tdName, tdPj, tdPg, tdPp, tdGf, tdPts);
        dom.rankingTbody.appendChild(tr);
      });
    }

    dom.historyTbody.innerHTML = '';
    if (history.length === 0) {
      dom.historyEmpty.classList.remove('hidden');
    } else {
      dom.historyEmpty.classList.add('hidden');
      history.forEach((match) => {
        const tr = document.createElement('tr');

        const tdDate = document.createElement('td');
        tdDate.style.color = '#94a3b8';
        tdDate.textContent = match.dateFormatted;

        const tdScore = document.createElement('td');
        tdScore.style.fontWeight = '700';
        tdScore.textContent = match.scoreText;

        const tdWinner = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = 'winner-tag';
        badge.textContent = `🏆 ${match.winner}`;
        tdWinner.appendChild(badge);

        tr.append(tdDate, tdScore, tdWinner);
        dom.historyTbody.appendChild(tr);
      });
    }
  }

  function openLeaderboardModal() {
    if (state.screen === 'game' && (state.phase === 'playing' || state.phase === 'countdown')) {
      state.phaseBeforeModal = state.phase;
      state.phase = 'paused';
      clearAllKeys();
    } else {
      state.phaseBeforeModal = null;
    }

    dom.clearConfirmArea.classList.add('hidden');
    dom.clearDataArea.classList.remove('hidden');
    renderLeaderboardTables();
    dom.leaderboardModal.classList.remove('hidden');
  }

  function closeLeaderboardModal() {
    dom.leaderboardModal.classList.add('hidden');
    if (state.screen === 'game' && state.phaseBeforeModal) {
      state.phase = state.phaseBeforeModal;
      state.phaseBeforeModal = null;
      state.lastFrameTime = performance.now();
    }
  }

  function switchLeaderboardTab(tab) {
    const showRanking = tab === 'ranking';
    dom.tabRanking.classList.toggle('active', showRanking);
    dom.tabHistory.classList.toggle('active', !showRanking);
    dom.tabRanking.setAttribute('aria-selected', String(showRanking));
    dom.tabHistory.setAttribute('aria-selected', String(!showRanking));
    dom.panelRanking.classList.toggle('hidden', !showRanking);
    dom.panelHistory.classList.toggle('hidden', showRanking);
  }

  // =========================================================================
  // CONTROLES DE MENÚ: MODO CPU, SKINS E ÍTEMS
  // =========================================================================
  function syncModeUI() {
    const isCpu = state.gameMode === 'cpu';
    dom.cpuDifficultyBlock.classList.toggle('hidden', !isCpu);
    dom.p2ControlsHuman.classList.toggle('hidden', isCpu);
    dom.p2ControlsCpu.classList.toggle('hidden', !isCpu);

    if (isCpu) {
      if (!dom.p2Input.value.startsWith('CPU')) {
        state.savedHumanP2Name = dom.p2Input.value.trim() || 'Jugador 2';
      }
      const diffLabel = CPU_PROFILES[state.cpuDifficulty].label;
      dom.p2TeamBadge.textContent = 'CPU · DERECHA';
      dom.p2NameLabel.textContent = 'Nombre de la CPU';
      dom.p2Input.value = `CPU (${diffLabel})`;
    } else {
      dom.p2TeamBadge.textContent = 'EQUIPO ROJO · DERECHA';
      dom.p2NameLabel.textContent = 'Nombre Jugador 2';
      if (dom.p2Input.value.startsWith('CPU')) {
        dom.p2Input.value = state.savedHumanP2Name;
      }
    }
  }

  dom.modePills.forEach((pill) => {
    pill.addEventListener('click', () => {
      dom.modePills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      state.gameMode = pill.dataset.mode === 'cpu' ? 'cpu' : '2p';
      syncModeUI();
    });
  });

  dom.diffPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      dom.diffPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      state.cpuDifficulty = pill.dataset.diff || 'normal';
      if (state.gameMode === 'cpu') {
        dom.p2Input.value = `CPU (${CPU_PROFILES[state.cpuDifficulty].label})`;
      }
    });
  });

  dom.skinButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const container = btn.closest('.skin-swatches');
      const playerNum = container ? container.dataset.player : '1';
      const skinId = btn.dataset.skin || 'classic';
      const skinLabel = btn.dataset.label || 'Neón Clásico';

      if (container) {
        container.querySelectorAll('.skin-btn').forEach((b) => b.classList.remove('active'));
      }
      btn.classList.add('active');

      if (playerNum === '1') {
        p1.skin = skinId;
        dom.p1SkinLabel.textContent = skinLabel;
      } else {
        p2.skin = skinId;
        dom.p2SkinLabel.textContent = skinLabel;
      }
    });
  });

  dom.btnToggleItems.addEventListener('click', () => {
    state.itemsEnabled = !state.itemsEnabled;
    dom.btnToggleItems.classList.toggle('active', state.itemsEnabled);
    dom.btnToggleItems.setAttribute('aria-pressed', String(state.itemsEnabled));
    dom.btnToggleItems.textContent = state.itemsEnabled ? '✨ Activados' : '🚫 Desactivados';
  });

  dom.goalPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      dom.goalPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      state.targetGoals = Number(pill.dataset.goals) || 5;
    });
  });

  dom.startForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name1 = dom.p1Input.value.trim();
    const name2 = dom.p2Input.value.trim();

    if (!name1 || !name2) {
      dom.formError.textContent = 'Por favor escribe el nombre de ambos competidores antes de iniciar.';
      return;
    }

    if (name1.toLowerCase() === name2.toLowerCase()) {
      dom.formError.textContent = 'Los nombres deben ser distintos para registrar sus estadísticas por separado.';
      return;
    }

    dom.formError.textContent = '';
    startNewMatch(name1, name2, state.targetGoals);
  });

  dom.btnMenuLeaderboard.addEventListener('click', openLeaderboardModal);
  dom.btnHudLeaderboard.addEventListener('click', openLeaderboardModal);
  dom.btnGameoverLeaderboard.addEventListener('click', openLeaderboardModal);
  dom.btnCloseLeaderboard.addEventListener('click', closeLeaderboardModal);
  dom.btnLeaderboardDone.addEventListener('click', closeLeaderboardModal);

  dom.leaderboardModal.addEventListener('click', (e) => {
    if (e.target === dom.leaderboardModal) {
      closeLeaderboardModal();
    }
  });

  dom.tabRanking.addEventListener('click', () => switchLeaderboardTab('ranking'));
  dom.tabHistory.addEventListener('click', () => switchLeaderboardTab('history'));

  dom.btnRequestClear.addEventListener('click', () => {
    dom.clearDataArea.classList.add('hidden');
    dom.clearConfirmArea.classList.remove('hidden');
  });

  dom.btnCancelClear.addEventListener('click', () => {
    dom.clearConfirmArea.classList.add('hidden');
    dom.clearDataArea.classList.remove('hidden');
  });

  dom.btnConfirmClear.addEventListener('click', () => {
    StorageManager.clearAll();
    dom.clearConfirmArea.classList.add('hidden');
    dom.clearDataArea.classList.remove('hidden');
    renderLeaderboardTables();
  });

  dom.btnSound.addEventListener('click', toggleSoundUI);
  dom.btnPause.addEventListener('click', togglePause);
  dom.btnResume.addEventListener('click', togglePause);
  dom.btnRestartMatch.addEventListener('click', () => startNewMatch(p1.name, p2.name, state.targetGoals));
  dom.btnPauseMenu.addEventListener('click', exitToMenu);
  dom.btnHudMenu.addEventListener('click', exitToMenu);

  dom.btnRematch.addEventListener('click', () => startNewMatch(p1.name, p2.name, state.targetGoals));
  dom.btnGameoverMenu.addEventListener('click', exitToMenu);
})();
