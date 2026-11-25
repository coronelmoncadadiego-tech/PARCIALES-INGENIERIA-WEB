/**
 * CAZAS GALÁCTICOS - 2D Sci-Fi Arcade Shooter
 * Motor de juego en HTML5 Canvas con Sistema de Audio Procedural Web Audio API
 */

(function () {
  'use strict';

  /* ========================================================
     1. SISTEMA DE AUDIO PROCEDURAL (Web Audio API)
     Sin dependencias externas ni archivos de sonido requeridos.
     ======================================================== */
  class SoundManager {
    constructor() {
      this.ctx = null;
      this.enabled = true;
      this.bgmOscs = [];
      this.bgmPlaying = false;
      this.bgmInterval = null;
    }

    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggle() {
      this.enabled = !this.enabled;
      if (!this.enabled && this.bgmPlaying) {
        this.stopBGM();
      } else if (this.enabled && !this.bgmPlaying) {
        this.startBGM();
      }
      return this.enabled;
    }

    playLaser(type = 'player') {
      if (!this.enabled || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (type === 'player') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.exponentialRampToValueAtTime(120, t + 0.12);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(450, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.18);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
      }

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + (type === 'player' ? 0.12 : 0.18));
    }

    playExplosion(intensity = 1) {
      if (!this.enabled || !this.ctx) return;
      const t = this.ctx.currentTime;
      const duration = 0.3 * intensity;
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600 * intensity, t);
      filter.frequency.exponentialRampToValueAtTime(30, t + duration);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35 * Math.min(intensity, 1.5), t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
    }

    playPowerup() {
      if (!this.enabled || !this.ctx) return;
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const t = this.ctx.currentTime + idx * 0.05;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.12);
      });
    }

    playShieldHit() {
      if (!this.enabled || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(260, t + 0.15);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    }

    playBomb() {
      if (!this.enabled || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 1.2);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 1.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 1.2);
      this.playExplosion(2.5);
    }

    playBossAlert() {
      if (!this.enabled || !this.ctx) return;
      for (let i = 0; i < 3; i++) {
        const t = this.ctx.currentTime + i * 0.35;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.linearRampToValueAtTime(480, t + 0.18);
        osc.frequency.linearRampToValueAtTime(300, t + 0.3);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      }
    }

    // Banda sonora retro sintética generativa
    startBGM() {
      if (!this.enabled || this.bgmPlaying || !this.ctx) return;
      this.bgmPlaying = true;
      const notes = [110, 110, 130.81, 146.83, 164.81, 146.83, 130.81, 98];
      let step = 0;

      this.bgmInterval = setInterval(() => {
        if (!this.enabled || !this.bgmPlaying || !this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        const freq = notes[step % notes.length];
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.8, t + 0.14);

        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, t);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.15);
        step++;
      }, 150);
    }

    stopBGM() {
      if (this.bgmInterval) {
        clearInterval(this.bgmInterval);
        this.bgmInterval = null;
      }
      this.bgmPlaying = false;
    }
  }

  /* ========================================================
     2. CONFIGURACIÓN Y MODELOS DE NAVES
     ======================================================== */
  const SHIP_PROFILES = {
    interceptor: {
      name: 'AURORA X-1',
      speed: 6.2,
      maxHp: 100,
      maxShield: 100,
      shieldRegen: 0.12,
      primaryColor: '#00f0ff',
      glowColor: 'rgba(0, 240, 255, 0.6)',
      fireRate: 140, // ms entre disparos
      bombDamage: 350
    },
    phantom: {
      name: 'ESPECTRO V',
      speed: 7.8,
      maxHp: 80,
      maxShield: 80,
      shieldRegen: 0.16,
      primaryColor: '#c026d3',
      glowColor: 'rgba(192, 38, 211, 0.6)',
      fireRate: 110,
      bombDamage: 300
    },
    titan: {
      name: 'TITÁN MK-II',
      speed: 5.0,
      maxHp: 140,
      maxShield: 140,
      shieldRegen: 0.09,
      primaryColor: '#10b981',
      glowColor: 'rgba(16, 185, 129, 0.6)',
      fireRate: 160,
      bombDamage: 450
    }
  };

  /* ========================================================
     3. CLASE PRINCIPAL DEL JUEGO
     ======================================================== */
  class GalacticGame {
    constructor() {
      this.canvas = document.getElementById('gameCanvas');
      this.ctx = this.canvas.getContext('2d');
      this.sound = new SoundManager();

      // Dimensiones de resolución interna para renderizado nítido
      this.width = 800;
      this.height = 950;
      this.scale = 1;

      // Estado del juego
      this.state = 'START'; // 'START', 'PLAYING', 'PAUSED', 'GAMEOVER'
      this.selectedShipKey = 'interceptor';
      this.score = 0;
      this.highScore = parseInt(localStorage.getItem('galactic_highscore') || '0', 10);
      this.wave = 1;
      this.kills = 0;
      this.combo = 0;
      this.comboTimer = 0;
      this.screenShake = 0;

      // Entidades
      this.player = null;
      this.bullets = [];
      this.enemyBullets = [];
      this.enemies = [];
      this.powerups = [];
      this.particles = [];
      this.floatingTexts = [];
      this.stars = [];
      this.nebulas = [];

      // Control de tiempo y oleadas
      this.lastTime = 0;
      this.waveTimer = 0;
      this.waveActive = false;
      this.bossActive = false;
      this.bossEntity = null;

      // Entradas del usuario
      this.keys = {};
      this.mouse = { x: this.width / 2, y: this.height - 150, down: false };
      this.isTouch = false;

      // Referencias UI
      this.dom = {
        hud: document.getElementById('hud'),
        shieldBar: document.getElementById('shield-bar'),
        healthBar: document.getElementById('health-bar'),
        energyBar: document.getElementById('energy-bar'),
        scoreDisplay: document.getElementById('score-display'),
        comboDisplay: document.getElementById('combo-display'),
        waveDisplay: document.getElementById('wave-display'),
        weaponLevelText: document.getElementById('weapon-level-text'),
        bombIcons: document.getElementById('bomb-icons'),
        bossHud: document.getElementById('boss-hud'),
        bossName: document.getElementById('boss-name'),
        bossHealthBar: document.getElementById('boss-health-bar'),
        screenStart: document.getElementById('screen-start'),
        screenPause: document.getElementById('screen-pause'),
        screenGameover: document.getElementById('screen-gameover'),
        waveBanner: document.getElementById('wave-banner'),
        bannerTitle: document.getElementById('banner-title'),
        bannerSub: document.getElementById('banner-sub'),
        startHighscore: document.getElementById('start-highscore'),
        finalScore: document.getElementById('final-score'),
        finalWave: document.getElementById('final-wave'),
        finalKills: document.getElementById('final-kills'),
        finalHighscore: document.getElementById('final-highscore'),
        newRecordBadge: document.getElementById('new-record-badge'),
        mobileControls: document.getElementById('mobile-controls'),
        btnAudio: document.getElementById('btn-audio'),
        btnPause: document.getElementById('btn-pause'),
        btnStart: document.getElementById('btn-start'),
        btnResume: document.getElementById('btn-resume'),
        btnRestartPause: document.getElementById('btn-restart-pause'),
        btnRestart: document.getElementById('btn-restart'),
        btnMobileFire: document.getElementById('btn-mobile-fire'),
        btnMobileDash: document.getElementById('btn-mobile-dash'),
        btnMobileBomb: document.getElementById('btn-mobile-bomb')
      };

      this.init();
    }

    init() {
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());

      this.initBackgroundStars();
      this.setupEventListeners();
      this.updateHighscoreDisplay();

      // Iniciar bucle de renderizado para animación de fondo en pantalla inicial
      requestAnimationFrame((t) => this.gameLoop(t));
    }

    resizeCanvas() {
      const container = document.getElementById('game-container');
      const rect = container.getBoundingClientRect();

      // Ajustamos el canvas a la resolución interna
      this.canvas.width = this.width;
      this.canvas.height = this.height;

      // Factor de escala para mouse y touch
      this.scale = rect.width / this.width;
    }

    initBackgroundStars() {
      this.stars = [];
      const starCount = 140;
      for (let i = 0; i < starCount; i++) {
        this.stars.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          size: Math.random() < 0.7 ? 1 : Math.random() < 0.9 ? 2 : 3,
          speed: 0.5 + Math.random() * 2.8,
          alpha: 0.3 + Math.random() * 0.7,
          color: Math.random() < 0.2 ? '#00f0ff' : Math.random() < 0.3 ? '#ffaa00' : '#ffffff'
        });
      }

      // Nebulosas espaciales de fondo
      this.nebulas = [
        { x: this.width * 0.3, y: this.height * 0.2, radius: 280, color: 'rgba(99, 102, 241, 0.08)', vy: 0.25 },
        { x: this.width * 0.7, y: this.height * 0.7, radius: 340, color: 'rgba(168, 85, 247, 0.07)', vy: 0.3 }
      ];
    }

    setupEventListeners() {
      // Teclado
      window.addEventListener('keydown', (e) => {
        this.keys[e.code] = true;
        if (e.code === 'KeyP' || e.code === 'Escape') {
          if (this.state === 'PLAYING') this.pauseGame();
          else if (this.state === 'PAUSED') this.resumeGame();
        }
        if (e.code === 'KeyB' && this.state === 'PLAYING') {
          this.triggerBomb();
        }
      });

      window.addEventListener('keyup', (e) => {
        this.keys[e.code] = false;
      });

      // Ratón
      this.canvas.addEventListener('mousemove', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = (e.clientX - rect.left) * (this.width / rect.width);
        this.mouse.y = (e.clientY - rect.top) * (this.height / rect.height);
      });

      this.canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
          this.mouse.down = true;
          this.sound.init();
        } else if (e.button === 2) {
          e.preventDefault();
          if (this.player) this.player.dash();
        }
      });

      this.canvas.addEventListener('mouseup', (e) => {
        if (e.button === 0) this.mouse.down = false;
      });

      this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

      // Pantallas táctiles
      this.canvas.addEventListener('touchstart', (e) => {
        this.isTouch = true;
        this.dom.mobileControls.classList.remove('hidden');
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = (touch.clientX - rect.left) * (this.width / rect.width);
        this.mouse.y = (touch.clientY - rect.top) * (this.height / rect.height);
        this.mouse.down = true;
        this.sound.init();
      }, { passive: false });

      this.canvas.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = (touch.clientX - rect.left) * (this.width / rect.width);
        this.mouse.y = (touch.clientY - rect.top) * (this.height / rect.height);
        e.preventDefault();
      }, { passive: false });

      this.canvas.addEventListener('touchend', () => {
        this.mouse.down = false;
      });

      // Botones HUD y Pantallas
      this.dom.btnStart.addEventListener('click', () => {
        this.sound.init();
        this.startGame();
      });

      this.dom.btnResume.addEventListener('click', () => this.resumeGame());
      this.dom.btnRestartPause.addEventListener('click', () => this.startGame());
      this.dom.btnRestart.addEventListener('click', () => this.startGame());

      this.dom.btnPause.addEventListener('click', () => {
        if (this.state === 'PLAYING') this.pauseGame();
        else if (this.state === 'PAUSED') this.resumeGame();
      });

      this.dom.btnAudio.addEventListener('click', () => {
        this.sound.init();
        const active = this.sound.toggle();
        this.dom.btnAudio.textContent = active ? '🔊' : '🔇';
      });

      // Controles Móviles
      this.dom.btnMobileFire.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.mouse.down = true;
      });
      this.dom.btnMobileFire.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.mouse.down = false;
      });
      this.dom.btnMobileDash.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.player) this.player.dash();
      });
      this.dom.btnMobileBomb.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.triggerBomb();
      });

      // Selector de cazas
      const shipButtons = document.querySelectorAll('.ship-opt');
      shipButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          shipButtons.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.selectedShipKey = btn.dataset.ship;
        });
      });
    }

    startGame() {
      this.sound.init();
      this.sound.startBGM();

      // Resetear datos
      this.score = 0;
      this.wave = 1;
      this.kills = 0;
      this.combo = 0;
      this.comboTimer = 0;
      this.screenShake = 0;

      this.bullets = [];
      this.enemyBullets = [];
      this.enemies = [];
      this.powerups = [];
      this.particles = [];
      this.floatingTexts = [];
      this.bossActive = false;
      this.bossEntity = null;

      // Crear caza del jugador
      const profile = SHIP_PROFILES[this.selectedShipKey];
      this.player = new PlayerShip(this, this.width / 2, this.height - 120, profile);

      // Cambiar estado y UI
      this.state = 'PLAYING';
      this.dom.screenStart.classList.add('hidden');
      this.dom.screenPause.classList.add('hidden');
      this.dom.screenGameover.classList.add('hidden');
      this.dom.hud.classList.remove('hidden');
      this.dom.bossHud.classList.add('hidden');

      this.updateHUD();
      this.startWave(this.wave);
    }

    pauseGame() {
      if (this.state !== 'PLAYING') return;
      this.state = 'PAUSED';
      this.dom.screenPause.classList.remove('hidden');
      this.sound.stopBGM();
    }

    resumeGame() {
      if (this.state !== 'PAUSED') return;
      this.state = 'PLAYING';
      this.dom.screenPause.classList.add('hidden');
      this.sound.startBGM();
    }

    gameOver() {
      this.state = 'GAMEOVER';
      this.sound.stopBGM();
      this.sound.playExplosion(2.2);

      // Comprobar nuevo récord
      const isNewRecord = this.score > this.highScore;
      if (isNewRecord) {
        this.highScore = this.score;
        localStorage.setItem('galactic_highscore', this.highScore.toString());
      }

      this.dom.finalScore.textContent = this.score.toLocaleString();
      this.dom.finalWave.textContent = this.wave;
      this.dom.finalKills.textContent = this.kills;
      this.dom.finalHighscore.textContent = this.highScore.toLocaleString();

      if (isNewRecord && this.score > 0) {
        this.dom.newRecordBadge.classList.remove('hidden');
      } else {
        this.dom.newRecordBadge.classList.add('hidden');
      }

      setTimeout(() => {
        this.dom.screenGameover.classList.remove('hidden');
      }, 700);
    }

    updateHighscoreDisplay() {
      this.dom.startHighscore.textContent = this.highScore.toLocaleString();
    }

    showWaveBanner(title, subtitle) {
      this.dom.bannerTitle.textContent = title;
      this.dom.bannerSub.textContent = subtitle;
      this.dom.waveBanner.classList.remove('hidden');

      // Reiniciar animación css
      this.dom.waveBanner.style.animation = 'none';
      void this.dom.waveBanner.offsetWidth; // trigger reflow
      this.dom.waveBanner.style.animation = 'bannerPop 2.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards';

      setTimeout(() => {
        this.dom.waveBanner.classList.add('hidden');
      }, 2300);
    }

    startWave(num) {
      this.wave = num;
      this.waveActive = true;
      this.updateHUD();

      const isBossWave = num % 4 === 0;

      if (isBossWave) {
        this.sound.playBossAlert();
        this.showWaveBanner(`ALERTA: OLEADA ${num}`, '¡DREADNOUGHT GALÁCTICO EN CAMINO!');
        setTimeout(() => this.spawnBoss(), 1800);
      } else {
        this.showWaveBanner(`SECTOR ${num}`, '¡ESCUADRONES ENEMIGOS DETECTADOS!');
        this.waveTimer = 0;
        this.spawnWaveEnemies(num);
      }
    }

    spawnWaveEnemies(waveNum) {
      const enemyCount = 7 + waveNum * 3;
      let spawned = 0;

      const spawnInterval = setInterval(() => {
        if (this.state !== 'PLAYING' || spawned >= enemyCount) {
          clearInterval(spawnInterval);
          return;
        }

        const rand = Math.random();
        const x = 50 + Math.random() * (this.width - 100);

        if (rand < 0.45) {
          // Caza Explorador rápido
          this.enemies.push(new ScoutEnemy(this, x, -50, waveNum));
        } else if (rand < 0.75) {
          // Crucero de asalto medio
          this.enemies.push(new RaiderEnemy(this, x, -50, waveNum));
        } else if (rand < 0.9) {
          // Asteroide galáctico
          this.enemies.push(new AsteroidHazard(this, x, -60, 36, 0));
        } else {
          // Nave pesada de escolta
          this.enemies.push(new HeavyFrigate(this, x, -70, waveNum));
        }

        spawned++;
      }, Math.max(380, 1100 - waveNum * 60));
    }

    spawnBoss() {
      this.bossActive = true;
      this.bossEntity = new GalacticBoss(this, this.width / 2, -120, this.wave);
      this.enemies.push(this.bossEntity);
      this.dom.bossHud.classList.remove('hidden');
      this.dom.bossName.textContent = `DREADNOUGHT ESTELAR MK-${Math.floor(this.wave / 4)}`;
    }

    triggerBomb() {
      if (!this.player || this.player.bombs <= 0) return;
      this.player.bombs--;
      this.sound.playBomb();
      this.screenShake = 24;

      // Efecto visual expansivo
      this.particles.push(new ShockwaveParticle(this.player.x, this.player.y, this.width * 1.2));

      // Destruir todos los proyectiles enemigos
      for (const b of this.enemyBullets) {
        this.createExplosion(b.x, b.y, 8, '#ff5500');
      }
      this.enemyBullets = [];

      // Dañar a todos los enemigos en pantalla
      for (const enemy of this.enemies) {
        enemy.takeDamage(this.player.bombDamage);
      }

      this.addFloatingText(this.player.x, this.player.y - 30, '¡BOMBA NOVA!', '#ffdd00', 22);
      this.updateHUD();
    }

    addScore(pts) {
      this.combo++;
      this.comboTimer = 180; // ~3 segundos a 60fps
      const multiplier = Math.min(5, 1 + Math.floor(this.combo / 5));
      const total = pts * multiplier;
      this.score += total;
      this.updateHUD();
      return total;
    }

    createExplosion(x, y, count = 18, baseColor = '#ff7700') {
      for (let i = 0; i < count; i++) {
        this.particles.push(new DebrisParticle(x, y, baseColor));
      }
    }

    addFloatingText(x, y, text, color = '#00f0ff', size = 16) {
      this.floatingTexts.push(new FloatingText(x, y, text, color, size));
    }

    updateHUD() {
      if (!this.player) return;

      // Barras de estado
      const shieldPct = Math.max(0, (this.player.shield / this.player.maxShield) * 100);
      const healthPct = Math.max(0, (this.player.hp / this.player.maxHp) * 100);
      const energyPct = Math.max(0, (this.player.energy / this.player.maxEnergy) * 100);

      this.dom.shieldBar.style.width = `${shieldPct}%`;
      this.dom.healthBar.style.width = `${healthPct}%`;
      this.dom.energyBar.style.width = `${energyPct}%`;

      // Texto de puntuación formateado
      this.dom.scoreDisplay.textContent = this.score.toString().padStart(6, '0');
      this.dom.waveDisplay.textContent = `OLEADA ${this.wave}`;

      // Indicador de Combo
      if (this.combo > 1) {
        const mult = Math.min(5, 1 + Math.floor(this.combo / 5));
        this.dom.comboDisplay.textContent = `COMBO x${this.combo} (${mult}x BONUS)`;
      } else {
        this.dom.comboDisplay.textContent = '';
      }

      // Nivel de armas y bombas
      this.dom.weaponLevelText.textContent = `NIVEL ${this.player.weaponLevel}`;

      let bombHtml = '';
      for (let i = 0; i < this.player.bombs; i++) {
        bombHtml += '<span class="bomb-icon">💣</span>';
      }
      this.dom.bombIcons.innerHTML = bombHtml || '<span style="color:#64748b;">0</span>';

      // Barra del Jefe
      if (this.bossActive && this.bossEntity) {
        const bossPct = Math.max(0, (this.bossEntity.hp / this.bossEntity.maxHp) * 100);
        this.dom.bossHealthBar.style.width = `${bossPct}%`;
      }
    }

    // ========================================================
    // BUCLE PRINCIPAL DE JUEGO
    // ========================================================
    gameLoop(time) {
      const dt = (time - this.lastTime) / 1000 || 0.016;
      this.lastTime = time;

      this.update(dt);
      this.render();

      requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(dt) {
      // Actualizar estrellas de fondo siempre (incluso en menú inicial)
      for (const star of this.stars) {
        star.y += star.speed;
        if (star.y > this.height) {
          star.y = 0;
          star.x = Math.random() * this.width;
        }
      }

      for (const neb of this.nebulas) {
        neb.y += neb.vy;
        if (neb.y - neb.radius > this.height) {
          neb.y = -neb.radius;
          neb.x = Math.random() * this.width;
        }
      }

      // Si no estamos jugando activamente, solo actualizamos partículas cosméticas
      if (this.state !== 'PLAYING') {
        this.particles = this.particles.filter((p) => p.update(dt));
        return;
      }

      // Reducción de sacudida de pantalla
      if (this.screenShake > 0) {
        this.screenShake *= 0.9;
        if (this.screenShake < 0.2) this.screenShake = 0;
      }

      // Temporizador de combo
      if (this.comboTimer > 0) {
        this.comboTimer--;
        if (this.comboTimer <= 0) {
          this.combo = 0;
          this.updateHUD();
        }
      }

      // Actualizar Jugador
      if (this.player) {
        this.player.update(dt);
      }

      // Actualizar Proyectiles del Jugador
      this.bullets = this.bullets.filter((b) => b.update(dt));

      // Actualizar Proyectiles Enemigos
      this.enemyBullets = this.enemyBullets.filter((b) => b.update(dt));

      // Actualizar Enemigos
      this.enemies = this.enemies.filter((e) => e.update(dt));

      // Actualizar Mejoras (Powerups)
      this.powerups = this.powerups.filter((p) => p.update(dt));

      // Actualizar Partículas
      this.particles = this.particles.filter((p) => p.update(dt));

      // Actualizar Textos Flotantes
      this.floatingTexts = this.floatingTexts.filter((t) => t.update(dt));

      // Comprobar Colisiones
      this.checkCollisions();

      // Comprobar Fin de Oleada
      if (this.waveActive && this.enemies.length === 0) {
        this.waveActive = false;
        setTimeout(() => {
          if (this.state === 'PLAYING') {
            this.startWave(this.wave + 1);
          }
        }, 1500);
      }
    }

    checkCollisions() {
      if (!this.player || this.player.isDead) return;

      // 1. Balas del Jugador contra Enemigos
      for (const bullet of this.bullets) {
        if (!bullet.active) continue;

        for (const enemy of this.enemies) {
          if (!enemy.active) continue;

          const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
          if (dist < bullet.radius + enemy.radius) {
            bullet.active = false;
            enemy.takeDamage(bullet.damage);
            this.createExplosion(bullet.x, bullet.y, 4, bullet.color);
            break;
          }
        }
      }

      // 2. Balas Enemigas contra el Jugador
      if (!this.player.isInvulnerable) {
        for (const eb of this.enemyBullets) {
          if (!eb.active) continue;

          const dist = Math.hypot(eb.x - this.player.x, eb.y - this.player.y);
          if (dist < eb.radius + this.player.radius) {
            eb.active = false;
            this.player.takeDamage(eb.damage);
            this.createExplosion(eb.x, eb.y, 6, '#ff0055');
          }
        }
      }

      // 3. Choque directo entre Enemigos y Jugador
      if (!this.player.isInvulnerable) {
        for (const enemy of this.enemies) {
          if (!enemy.active) continue;

          const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
          if (dist < enemy.radius + this.player.radius) {
            this.player.takeDamage(40);
            enemy.takeDamage(100);
            this.createExplosion(this.player.x, this.player.y, 10, '#00f0ff');
          }
        }
      }

      // 4. Jugador recoge Mejoras (Powerups)
      for (const p of this.powerups) {
        if (!p.active) continue;
        const dist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
        if (dist < p.radius + this.player.radius + 15) {
          p.active = false;
          p.apply(this.player, this);
        }
      }
    }

    render() {
      this.ctx.save();

      // Efecto sacudida de pantalla
      if (this.screenShake > 0) {
        const ox = (Math.random() - 0.5) * this.screenShake;
        const oy = (Math.random() - 0.5) * this.screenShake;
        this.ctx.translate(ox, oy);
      }

      // Limpiar lienzo
      this.ctx.clearRect(0, 0, this.width, this.height);

      // Renderizar Fondo Galáctico
      this.renderBackground();

      // Renderizar Proyectiles Enemigos
      for (const eb of this.enemyBullets) eb.draw(this.ctx);

      // Renderizar Proyectiles Jugador
      for (const b of this.bullets) b.draw(this.ctx);

      // Renderizar Mejoras
      for (const p of this.powerups) p.draw(this.ctx);

      // Renderizar Enemigos
      for (const e of this.enemies) e.draw(this.ctx);

      // Renderizar Jugador
      if (this.player) {
        this.player.draw(this.ctx);
      }

      // Renderizar Partículas
      for (const p of this.particles) p.draw(this.ctx);

      // Renderizar Textos Flotantes
      for (const t of this.floatingTexts) t.draw(this.ctx);

      this.ctx.restore();
    }

    renderBackground() {
      // Nebulosas
      for (const neb of this.nebulas) {
        const grad = this.ctx.createRadialGradient(neb.x, neb.y, 10, neb.x, neb.y, neb.radius);
        grad.addColorStop(0, neb.color);
        grad.addColorStop(1, 'transparent');
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(neb.x, neb.y, neb.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Estrellas
      for (const star of this.stars) {
        this.ctx.fillStyle = star.color;
        this.ctx.globalAlpha = star.alpha;
        this.ctx.beginPath();
        this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.globalAlpha = 1.0;
    }
  }

  /* ========================================================
     4. CLASE DEL JUGADOR (CAZA ESTELAR)
     ======================================================== */
  class PlayerShip {
    constructor(game, x, y, profile) {
      this.game = game;
      this.x = x;
      this.y = y;
      this.profile = profile;

      this.radius = 24;
      this.speed = profile.speed;
      this.hp = profile.maxHp;
      this.maxHp = profile.maxHp;
      this.shield = profile.maxShield;
      this.maxShield = profile.maxShield;
      this.shieldRegen = profile.shieldRegen;
      this.energy = 100;
      this.maxEnergy = 100;
      this.energyRegen = 0.45;

      this.weaponLevel = 1;
      this.maxWeaponLevel = 5;
      this.fireTimer = 0;
      this.fireInterval = profile.fireRate;
      this.bombs = 3;
      this.bombDamage = profile.bombDamage;

      this.isDashing = false;
      this.dashTimer = 0;
      this.isInvulnerable = false;
      this.invulnTimer = 0;
      this.isDead = false;

      this.rollAngle = 0; // Efecto de inclinación al girar
      this.thrusterAnim = 0;
    }

    update(dt) {
      if (this.isDead) return;

      // Regeneración pasiva de escudo y turbo
      if (this.shield < this.maxShield) {
        this.shield = Math.min(this.maxShield, this.shield + this.shieldRegen);
      }
      if (this.energy < this.maxEnergy) {
        this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegen);
      }

      // Manejo de invulnerabilidad tras ser impactado o en dash
      if (this.invulnTimer > 0) {
        this.invulnTimer -= dt;
        if (this.invulnTimer <= 0) {
          this.isInvulnerable = false;
          this.isDashing = false;
        }
      }

      // Movimiento por teclado
      let dx = 0;
      let dy = 0;

      if (this.game.keys['ArrowLeft'] || this.game.keys['KeyA']) dx -= 1;
      if (this.game.keys['ArrowRight'] || this.game.keys['KeyD']) dx += 1;
      if (this.game.keys['ArrowUp'] || this.game.keys['KeyW']) dy -= 1;
      if (this.game.keys['ArrowDown'] || this.game.keys['KeyS']) dy += 1;

      // Si se usa el ratón o pantalla táctil con clic/tap presionado
      if (this.game.mouse.down && !this.game.isTouch) {
        const mouseDistX = this.game.mouse.x - this.x;
        const mouseDistY = this.game.mouse.y - this.y;
        if (Math.abs(mouseDistX) > 4) dx = Math.sign(mouseDistX) * Math.min(1, Math.abs(mouseDistX) / 40);
        if (Math.abs(mouseDistY) > 4) dy = Math.sign(mouseDistY) * Math.min(1, Math.abs(mouseDistY) / 40);
      }

      // Normalizar vector diagonal
      if (dx !== 0 && dy !== 0) {
        dx *= 0.7071;
        dy *= 0.7071;
      }

      // Modificador de velocidad en Turbo / Dash
      const currentSpeed = this.isDashing ? this.speed * 2.1 : this.speed;
      this.x += dx * currentSpeed;
      this.y += dy * currentSpeed;

      // Inclinación visual del fuselaje
      const targetRoll = dx * 0.28;
      this.rollAngle += (targetRoll - this.rollAngle) * 0.15;

      // Límites de pantalla
      const margin = 26;
      this.x = Math.max(margin, Math.min(this.game.width - margin, this.x));
      this.y = Math.max(margin + 50, Math.min(this.game.height - margin, this.y));

      // Generar partículas de propulsor estelar
      this.thrusterAnim += 0.2;
      if (Math.random() < 0.8) {
        const plumeColor = this.isDashing ? '#ffffff' : this.profile.primaryColor;
        this.game.particles.push(
          new ThrusterParticle(this.x - 7, this.y + 24, plumeColor),
          new ThrusterParticle(this.x + 7, this.y + 24, plumeColor)
        );
      }

      // Disparo automático al mantener presionado Espacio o Clic
      this.fireTimer += dt * 1000;
      const wantsFire = this.game.keys['Space'] || this.game.mouse.down;
      if (wantsFire && this.fireTimer >= this.fireInterval) {
        this.fire();
        this.fireTimer = 0;
      }

      // Tecla de esquiva rápida (Shift)
      if (this.game.keys['ShiftLeft'] || this.game.keys['ShiftRight']) {
        this.dash();
      }

      this.game.updateHUD();
    }

    dash() {
      if (this.isDashing || this.energy < 35) return;
      this.energy -= 35;
      this.isDashing = true;
      this.isInvulnerable = true;
      this.invulnTimer = 0.45; // 450ms de inmunidad total
      this.game.sound.playShieldHit();

      // Dejar estela fantasma de hipervelocidad
      for (let i = 0; i < 5; i++) {
        this.game.particles.push(new GhostShipParticle(this.x, this.y, this.rollAngle, this.profile.primaryColor));
      }
      this.game.addFloatingText(this.x, this.y - 30, '¡TURBO!', '#00f0ff', 14);
    }

    fire() {
      this.game.sound.playLaser('player');

      const col = this.profile.primaryColor;
      const lvl = this.weaponLevel;

      if (lvl === 1) {
        // Disparo único concentrado
        this.game.bullets.push(new PlayerBullet(this.x, this.y - 20, 0, -14, 25, col));
      } else if (lvl === 2) {
        // Cañones gemelos
        this.game.bullets.push(
          new PlayerBullet(this.x - 12, this.y - 18, 0, -14, 22, col),
          new PlayerBullet(this.x + 12, this.y - 18, 0, -14, 22, col)
        );
      } else if (lvl === 3) {
        // Cañón triple con dispersión
        this.game.bullets.push(
          new PlayerBullet(this.x, this.y - 20, 0, -14, 24, col),
          new PlayerBullet(this.x - 14, this.y - 14, -2.5, -13.5, 20, col),
          new PlayerBullet(this.x + 14, this.y - 14, 2.5, -13.5, 20, col)
        );
      } else if (lvl === 4) {
        // Cuádruple láser pesado
        this.game.bullets.push(
          new PlayerBullet(this.x - 8, this.y - 22, 0, -15, 22, col),
          new PlayerBullet(this.x + 8, this.y - 22, 0, -15, 22, col),
          new PlayerBullet(this.x - 20, this.y - 12, -3.5, -13, 18, col),
          new PlayerBullet(this.x + 20, this.y - 12, 3.5, -13, 18, col)
        );
      } else {
        // Nivel 5: Cañón Aniquilador Quíntuple
        this.game.bullets.push(
          new PlayerBullet(this.x, this.y - 24, 0, -16, 32, '#ffffff', 5),
          new PlayerBullet(this.x - 12, this.y - 20, -1.5, -15, 26, col),
          new PlayerBullet(this.x + 12, this.y - 20, 1.5, -15, 26, col),
          new PlayerBullet(this.x - 24, this.y - 12, -4.5, -13.5, 22, col),
          new PlayerBullet(this.x + 24, this.y - 12, 4.5, -13.5, 22, col)
        );
      }
    }

    takeDamage(amount) {
      if (this.isInvulnerable || this.isDead) return;

      this.game.screenShake = 12;

      // Absorción primero por el escudo
      if (this.shield > 0) {
        this.game.sound.playShieldHit();
        if (this.shield >= amount) {
          this.shield -= amount;
          amount = 0;
        } else {
          amount -= this.shield;
          this.shield = 0;
        }
      }

      // El daño restante golpea el casco
      if (amount > 0) {
        this.hp -= amount;
        this.game.sound.playExplosion(0.8);
      }

      // Parpadeo de invulnerabilidad temporal
      this.isInvulnerable = true;
      this.invulnTimer = 0.55;

      if (this.hp <= 0) {
        this.hp = 0;
        this.isDead = true;
        this.game.createExplosion(this.x, this.y, 40, '#ff3300');
        this.game.gameOver();
      }

      this.game.updateHUD();
    }

    draw(ctx) {
      if (this.isDead) return;

      // Parpadeo si es invulnerable
      if (this.isInvulnerable && Math.floor(Date.now() / 60) % 2 === 0) {
        return;
      }

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rollAngle);

      // Resplandor de propulsión
      const thrusterGlow = 14 + Math.sin(this.thrusterAnim) * 4;
      ctx.fillStyle = this.profile.primaryColor;
      ctx.shadowColor = this.profile.primaryColor;
      ctx.shadowBlur = 15;

      // Dibujo Vectorial del Caza Estelar
      ctx.beginPath();
      ctx.moveTo(0, -28); // Nariz
      ctx.lineTo(12, -8);
      ctx.lineTo(26, 14); // Ala Derecha
      ctx.lineTo(16, 22);
      ctx.lineTo(8, 16);
      ctx.lineTo(5, 25);  // Tobera derecha
      ctx.lineTo(-5, 25); // Tobera izquierda
      ctx.lineTo(-8, 16);
      ctx.lineTo(-16, 22);
      ctx.lineTo(-26, 14); // Ala Izquierda
      ctx.lineTo(-12, -8);
      ctx.closePath();

      // Fuselaje exterior
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = this.profile.primaryColor;
      ctx.stroke();

      // Detalles y líneas de armadura
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(0, 12);
      ctx.moveTo(-16, 14);
      ctx.lineTo(0, -6);
      ctx.lineTo(16, 14);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Cabina / Cockpit de Cristal de Plasma
      ctx.beginPath();
      ctx.ellipse(0, -6, 4.5, 11, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.fill();

      // Cañones en los extremos de las alas
      ctx.fillStyle = this.profile.primaryColor;
      ctx.fillRect(-24, 6, 3, 10);
      ctx.fillRect(21, 6, 3, 10);

      // Efecto de burbuja de escudo si está activo
      if (this.shield > 20) {
        ctx.beginPath();
        ctx.arc(0, 0, 32, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 240, 255, ${0.15 + (this.shield / this.maxShield) * 0.25})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  /* ========================================================
     5. PROYECTILES
     ======================================================== */
  class PlayerBullet {
    constructor(x, y, vx, vy, damage, color = '#00f0ff', radius = 3.5) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.damage = damage;
      this.color = color;
      this.radius = radius;
      this.active = true;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.y < -20 || this.x < -20 || this.x > 820) {
        this.active = false;
      }
      return this.active;
    }

    draw(ctx) {
      ctx.save();
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rastro de luz
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - this.vx * 1.5, this.y - this.vy * 1.5);
      ctx.stroke();

      ctx.restore();
    }
  }

  class EnemyBullet {
    constructor(x, y, vx, vy, damage = 15, color = '#ff2a5f') {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.damage = damage;
      this.color = color;
      this.radius = 4;
      this.active = true;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.y > 970 || this.x < -30 || this.x > 830) {
        this.active = false;
      }
      return this.active;
    }

    draw(ctx) {
      ctx.save();
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = this.color;

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  /* ========================================================
     6. ENEMIGOS Y AMENAZAS
     ======================================================== */

  // 6.1 Caza Explorador (Ágil, movimiento sinusoidal)
  class ScoutEnemy {
    constructor(game, x, y, wave) {
      this.game = game;
      this.x = x;
      this.startX = x;
      this.y = y;
      this.wave = wave;
      this.radius = 18;
      this.hp = 35 + wave * 8;
      this.maxHp = this.hp;
      this.speed = 2.4 + Math.random() * 0.8;
      this.sinFreq = 0.03 + Math.random() * 0.02;
      this.sinAmp = 40 + Math.random() * 30;
      this.timer = 0;
      this.shootCooldown = 90 + Math.random() * 60;
      this.active = true;
      this.scoreValue = 120;
    }

    takeDamage(dmg) {
      this.hp -= dmg;
      if (this.hp <= 0 && this.active) {
        this.active = false;
        this.destroy();
      }
    }

    destroy() {
      this.game.kills++;
      this.game.addScore(this.scoreValue);
      this.game.sound.playExplosion(1.0);
      this.game.createExplosion(this.x, this.y, 16, '#00f0ff');
      this.maybeDropPowerup();
    }

    maybeDropPowerup() {
      if (Math.random() < 0.22) {
        this.game.powerups.push(new PowerupItem(this.x, this.y));
      }
    }

    update(dt) {
      this.timer++;
      this.y += this.speed;
      this.x = this.startX + Math.sin(this.timer * this.sinFreq) * this.sinAmp;

      // Disparo ligero
      if (this.timer % Math.floor(this.shootCooldown) === 0 && this.y > 50 && this.y < 700) {
        this.game.sound.playLaser('enemy');
        this.game.enemyBullets.push(new EnemyBullet(this.x, this.y + 15, 0, 5.5, 12, '#00f0ff'));
      }

      if (this.y > this.game.height + 40) {
        this.active = false;
      }
      return this.active;
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      ctx.beginPath();
      ctx.moveTo(0, 18);
      ctx.lineTo(16, -14);
      ctx.lineTo(0, -6);
      ctx.lineTo(-16, -14);
      ctx.closePath();

      ctx.fillStyle = '#1e1b4b';
      ctx.fill();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.stroke();

      // Ojo visor central
      ctx.fillStyle = '#ff007f';
      ctx.fillRect(-3, -2, 6, 6);

      ctx.restore();
    }
  }

  // 6.2 Caza Asaltante (Rápido, dispara salvas dirigidas)
  class RaiderEnemy {
    constructor(game, x, y, wave) {
      this.game = game;
      this.x = x;
      this.y = y;
      this.wave = wave;
      this.radius = 22;
      this.hp = 65 + wave * 12;
      this.maxHp = this.hp;
      this.speed = 1.9;
      this.timer = Math.floor(Math.random() * 50);
      this.active = true;
      this.scoreValue = 200;
    }

    takeDamage(dmg) {
      this.hp -= dmg;
      if (this.hp <= 0 && this.active) {
        this.active = false;
        this.destroy();
      }
    }

    destroy() {
      this.game.kills++;
      this.game.addScore(this.scoreValue);
      this.game.sound.playExplosion(1.2);
      this.game.createExplosion(this.x, this.y, 22, '#ff0055');
      this.maybeDropPowerup();
    }

    maybeDropPowerup() {
      if (Math.random() < 0.28) {
        this.game.powerups.push(new PowerupItem(this.x, this.y));
      }
    }

    update(dt) {
      this.timer++;
      this.y += this.speed;

      // Disparo doble dirigido hacia la posición del jugador
      if (this.timer % 110 === 0 && this.y > 60 && this.y < 650 && this.game.player) {
        this.game.sound.playLaser('enemy');
        const angle = Math.atan2(this.game.player.y - this.y, this.game.player.x - this.x);
        const vx = Math.cos(angle) * 4.8;
        const vy = Math.sin(angle) * 4.8;

        this.game.enemyBullets.push(
          new EnemyBullet(this.x - 10, this.y + 10, vx, vy, 16, '#ff0055'),
          new EnemyBullet(this.x + 10, this.y + 10, vx, vy, 16, '#ff0055')
        );
      }

      if (this.y > this.game.height + 40) {
        this.active = false;
      }
      return this.active;
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      ctx.beginPath();
      ctx.moveTo(0, 22);
      ctx.lineTo(20, -10);
      ctx.lineTo(12, -20);
      ctx.lineTo(0, -14);
      ctx.lineTo(-12, -20);
      ctx.lineTo(-20, -10);
      ctx.closePath();

      ctx.fillStyle = '#2a0815';
      ctx.fill();
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 10;
      ctx.stroke();

      ctx.restore();
    }
  }

  // 6.3 Fragata Pesada de Combate (Tanque, dispara en abanico)
  class HeavyFrigate {
    constructor(game, x, y, wave) {
      this.game = game;
      this.x = x;
      this.y = y;
      this.wave = wave;
      this.radius = 32;
      this.hp = 160 + wave * 25;
      this.maxHp = this.hp;
      this.speed = 1.1;
      this.timer = 0;
      this.active = true;
      this.scoreValue = 450;
    }

    takeDamage(dmg) {
      this.hp -= dmg;
      if (this.hp <= 0 && this.active) {
        this.active = false;
        this.destroy();
      }
    }

    destroy() {
      this.game.kills++;
      this.game.addScore(this.scoreValue);
      this.game.sound.playExplosion(1.6);
      this.game.createExplosion(this.x, this.y, 30, '#ffd600');
      this.game.powerups.push(new PowerupItem(this.x, this.y)); // Siempre suelta premio
    }

    update(dt) {
      this.timer++;
      this.y += this.speed;

      // Disparo triple en abanico
      if (this.timer % 130 === 0 && this.y > 80 && this.y < 600) {
        this.game.sound.playLaser('enemy');
        this.game.enemyBullets.push(
          new EnemyBullet(this.x, this.y + 20, 0, 5, 18, '#ffd600'),
          new EnemyBullet(this.x, this.y + 20, -2.2, 4.5, 18, '#ffd600'),
          new EnemyBullet(this.x, this.y + 20, 2.2, 4.5, 18, '#ffd600')
        );
      }

      if (this.y > this.game.height + 60) {
        this.active = false;
      }
      return this.active;
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      ctx.beginPath();
      ctx.moveTo(0, 32);
      ctx.lineTo(28, 6);
      ctx.lineTo(32, -24);
      ctx.lineTo(0, -32);
      ctx.lineTo(-32, -24);
      ctx.lineTo(-28, 6);
      ctx.closePath();

      ctx.fillStyle = '#1c1917';
      ctx.fill();
      ctx.strokeStyle = '#ffd600';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ffd600';
      ctx.shadowBlur = 12;
      ctx.stroke();

      // Barra de vida superior
      const barW = 40;
      const pct = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(-barW / 2, -42, barW, 4);
      ctx.fillStyle = '#ffd600';
      ctx.fillRect(-barW / 2, -42, barW * pct, 4);

      ctx.restore();
    }
  }

  // 6.4 Asteroide Galáctico Destructible
  class AsteroidHazard {
    constructor(game, x, y, radius = 34, splitLevel = 0) {
      this.game = game;
      this.x = x;
      this.y = y;
      this.radius = radius;
      this.splitLevel = splitLevel;
      this.hp = radius * 2.2;
      this.speed = 1.3 + Math.random() * 1.2;
      this.vx = (Math.random() - 0.5) * 1.5;
      this.rot = 0;
      this.rotSpeed = (Math.random() - 0.5) * 0.04;
      this.active = true;
      this.scoreValue = 80 * (splitLevel + 1);

      // Forma poligonal irregular
      this.points = [];
      const pts = 8;
      for (let i = 0; i < pts; i++) {
        const ang = (i / pts) * Math.PI * 2;
        const rad = radius * (0.75 + Math.random() * 0.45);
        this.points.push({ x: Math.cos(ang) * rad, y: Math.sin(ang) * rad });
      }
    }

    takeDamage(dmg) {
      this.hp -= dmg;
      if (this.hp <= 0 && this.active) {
        this.active = false;
        this.destroy();
      }
    }

    destroy() {
      this.game.kills++;
      this.game.addScore(this.scoreValue);
      this.game.sound.playExplosion(0.9);
      this.game.createExplosion(this.x, this.y, 14, '#94a3b8');

      // Dividir en 2 asteroides menores si es el inicial
      if (this.splitLevel === 0) {
        this.game.enemies.push(
          new AsteroidHazard(this.game, this.x - 16, this.y, 20, 1),
          new AsteroidHazard(this.game, this.x + 16, this.y, 20, 1)
        );
      } else if (Math.random() < 0.2) {
        this.game.powerups.push(new PowerupItem(this.x, this.y));
      }
    }

    update(dt) {
      this.y += this.speed;
      this.x += this.vx;
      this.rot += this.rotSpeed;

      if (this.y > this.game.height + 50) {
        this.active = false;
      }
      return this.active;
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);

      ctx.beginPath();
      ctx.moveTo(this.points[0].x, this.points[0].y);
      for (let i = 1; i < this.points.length; i++) {
        ctx.lineTo(this.points[i].x, this.points[i].y);
      }
      ctx.closePath();

      ctx.fillStyle = '#334155';
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    }
  }

  // 6.5 JEFE FINAL: DREADNOUGHT GALÁCTICO
  class GalacticBoss {
    constructor(game, x, y, wave) {
      this.game = game;
      this.x = x;
      this.y = y;
      this.wave = wave;
      this.radius = 70;
      this.hp = 1200 + wave * 400;
      this.maxHp = this.hp;
      this.targetY = 160;
      this.phase = 1;
      this.timer = 0;
      this.active = true;
      this.scoreValue = 3500;
      this.turretAngle = 0;
    }

    takeDamage(dmg) {
      this.hp -= dmg;
      this.game.updateHUD();

      // Transiciones de fase
      if (this.hp < this.maxHp * 0.4 && this.phase < 2) {
        this.phase = 2;
        this.game.sound.playBossAlert();
        this.game.addFloatingText(this.x, this.y + 40, '¡MODO FURIA ACTIVADO!', '#ff0055', 20);
      }

      if (this.hp <= 0 && this.active) {
        this.active = false;
        this.destroy();
      }
    }

    destroy() {
      this.game.kills++;
      this.game.addScore(this.scoreValue);
      this.game.sound.playExplosion(3.0);
      this.game.screenShake = 35;

      // Explosiones masivas en cadena
      for (let i = 0; i < 60; i++) {
        setTimeout(() => {
          const rx = this.x + (Math.random() - 0.5) * 120;
          const ry = this.y + (Math.random() - 0.5) * 120;
          this.game.createExplosion(rx, ry, 12, '#ff0055');
          this.game.sound.playExplosion(1.0);
        }, i * 35);
      }

      this.game.bossActive = false;
      this.game.bossEntity = null;
      this.game.dom.bossHud.classList.add('hidden');

      // Suelta múltiples mejoras
      this.game.powerups.push(
        new PowerupItem(this.x - 40, this.y, 'WEAPON'),
        new PowerupItem(this.x, this.y, 'BOMB'),
        new PowerupItem(this.x + 40, this.y, 'SHIELD')
      );

      this.game.addFloatingText(this.x, this.y, '¡DREADNOUGHT ANIQUILADO!', '#ffd600', 26);
    }

    update(dt) {
      this.timer++;

      // Entrada suave a pantalla
      if (this.y < this.targetY) {
        this.y += 1.4;
      } else {
        // Movimiento horizontal zig-zag
        this.x = this.game.width / 2 + Math.sin(this.timer * 0.02) * 180;
      }

      // Patrón de ataque según la fase
      if (this.phase === 1) {
        // Ráfagas laterales continuas
        if (this.timer % 75 === 0) {
          this.game.sound.playLaser('enemy');
          this.game.enemyBullets.push(
            new EnemyBullet(this.x - 55, this.y + 35, 0, 5, 16, '#ff0055'),
            new EnemyBullet(this.x + 55, this.y + 35, 0, 5, 16, '#ff0055')
          );
        }

        // Salva central espiral
        if (this.timer % 160 === 0) {
          for (let a = -0.6; a <= 0.6; a += 0.3) {
            this.game.enemyBullets.push(
              new EnemyBullet(this.x, this.y + 50, Math.sin(a) * 4.5, Math.cos(a) * 4.5, 18, '#ffd600')
            );
          }
        }
      } else {
        // FASE 2: Furia
        if (this.timer % 40 === 0) {
          this.game.sound.playLaser('enemy');
          const angle = (this.timer * 0.15) % (Math.PI * 2);
          this.game.enemyBullets.push(
            new EnemyBullet(this.x, this.y + 30, Math.cos(angle) * 4.5, Math.sin(angle) * 4.5, 20, '#ff0055')
          );
        }

        // Ataques dirigidos al jugador
        if (this.timer % 110 === 0 && this.game.player) {
          const aimAngle = Math.atan2(this.game.player.y - this.y, this.game.player.x - this.x);
          this.game.enemyBullets.push(
            new EnemyBullet(this.x, this.y + 40, Math.cos(aimAngle) * 6, Math.sin(aimAngle) * 6, 22, '#00f0ff')
          );
        }
      }

      return this.active;
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      // Sombra roja imponente
      ctx.shadowColor = this.phase === 2 ? '#ff0055' : '#e11d48';
      ctx.shadowBlur = 25;

      // Casco pesado del Dreadnought
      ctx.beginPath();
      ctx.moveTo(0, 75);
      ctx.lineTo(45, 45);
      ctx.lineTo(80, 20);
      ctx.lineTo(70, -45);
      ctx.lineTo(25, -65);
      ctx.lineTo(-25, -65);
      ctx.lineTo(-70, -45);
      ctx.lineTo(-80, 20);
      ctx.lineTo(-45, 45);
      ctx.closePath();

      ctx.fillStyle = '#0f051d';
      ctx.fill();
      ctx.strokeStyle = this.phase === 2 ? '#ff0055' : '#e11d48';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Reactor central pulsante
      const pulse = 14 + Math.sin(this.timer * 0.1) * 4;
      ctx.beginPath();
      ctx.arc(0, 0, pulse, 0, Math.PI * 2);
      ctx.fillStyle = this.phase === 2 ? '#ff0055' : '#ffd600';
      ctx.shadowColor = '#ffd600';
      ctx.shadowBlur = 18;
      ctx.fill();

      // Alas de ataque
      ctx.fillStyle = '#331024';
      ctx.fillRect(-65, -15, 20, 40);
      ctx.fillRect(45, -15, 20, 40);

      ctx.restore();
    }
  }

  /* ========================================================
     7. MEJORAS (POWER-UPS)
     ======================================================== */
  class PowerupItem {
    constructor(x, y, forcedType = null) {
      this.x = x;
      this.y = y;
      this.radius = 16;
      this.active = true;
      this.vy = 1.8;
      this.timer = 0;

      const types = ['WEAPON', 'SHIELD', 'BOMB', 'ENERGY'];
      this.type = forcedType || types[Math.floor(Math.random() * types.length)];
    }

    update() {
      this.timer += 0.05;
      this.y += this.vy;
      this.x += Math.sin(this.timer) * 0.8;

      if (this.y > 980) this.active = false;
      return this.active;
    }

    apply(player, game) {
      game.sound.playPowerup();

      switch (this.type) {
        case 'WEAPON':
          if (player.weaponLevel < player.maxWeaponLevel) {
            player.weaponLevel++;
            game.addFloatingText(player.x, player.y - 30, `¡ARMA NIVEL ${player.weaponLevel}!`, '#00f0ff', 18);
          } else {
            game.addScore(500);
            game.addFloatingText(player.x, player.y - 30, '+500 PTS MAX ARMA', '#ffd600', 16);
          }
          break;

        case 'SHIELD':
          player.shield = player.maxShield;
          player.hp = Math.min(player.maxHp, player.hp + 25);
          game.addFloatingText(player.x, player.y - 30, '¡ESCUDO RECARGADO!', '#00ff88', 18);
          break;

        case 'BOMB':
          if (player.bombs < 5) player.bombs++;
          game.addFloatingText(player.x, player.y - 30, '+1 BOMBA NOVA', '#ffd600', 18);
          break;

        case 'ENERGY':
          player.energy = player.maxEnergy;
          game.addScore(300);
          game.addFloatingText(player.x, player.y - 30, '¡TURBO MÁXIMO!', '#ffaa00', 18);
          break;
      }

      game.updateHUD();
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      let color = '#00f0ff';
      let icon = '⚡';

      if (this.type === 'WEAPON') {
        color = '#00f0ff';
        icon = '🔫';
      } else if (this.type === 'SHIELD') {
        color = '#00ff88';
        icon = '🛡️';
      } else if (this.type === 'BOMB') {
        color = '#ff3b30';
        icon = '💣';
      } else if (this.type === 'ENERGY') {
        color = '#ffaa00';
        icon = '⚡';
      }

      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(10, 16, 36, 0.9)';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.stroke();

      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, 0, 1);

      ctx.restore();
    }
  }

  /* ========================================================
     8. PARTÍCULAS Y EFECTOS VISUALES
     ======================================================== */
  class DebrisParticle {
    constructor(x, y, color = '#ff7700') {
      this.x = x;
      this.y = y;
      this.color = color;
      const angle = Math.random() * Math.PI * 2;
      const spd = 1 + Math.random() * 5.5;
      this.vx = Math.cos(angle) * spd;
      this.vy = Math.sin(angle) * spd;
      this.size = 2 + Math.random() * 3.5;
      this.life = 1.0;
      this.decay = 0.02 + Math.random() * 0.035;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life -= this.decay;
      return this.life > 0;
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.life);
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class ThrusterParticle {
    constructor(x, y, color = '#00f0ff') {
      this.x = x + (Math.random() - 0.5) * 4;
      this.y = y;
      this.color = color;
      this.vx = (Math.random() - 0.5) * 1.2;
      this.vy = 3.5 + Math.random() * 3.5;
      this.size = 2.5 + Math.random() * 2;
      this.life = 1.0;
      this.decay = 0.08;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life -= this.decay;
      return this.life > 0;
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.life);
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class ShockwaveParticle {
    constructor(x, y, maxRadius) {
      this.x = x;
      this.y = y;
      this.radius = 10;
      this.maxRadius = maxRadius;
      this.life = 1.0;
    }

    update() {
      this.radius += 24;
      this.life = 1.0 - this.radius / this.maxRadius;
      return this.life > 0;
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.life);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 6 * this.life;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 20;
      ctx.stroke();
      ctx.restore();
    }
  }

  class GhostShipParticle {
    constructor(x, y, roll, color) {
      this.x = x;
      this.y = y;
      this.roll = roll;
      this.color = color;
      this.life = 0.7;
    }

    update() {
      this.life -= 0.05;
      return this.life > 0;
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.roll);
      ctx.globalAlpha = Math.max(0, this.life * 0.4);

      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(26, 14);
      ctx.lineTo(-26, 14);
      ctx.closePath();

      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  class FloatingText {
    constructor(x, y, text, color = '#00f0ff', size = 16) {
      this.x = x;
      this.y = y;
      this.text = text;
      this.color = color;
      this.size = size;
      this.life = 1.0;
      this.vy = -1.2;
    }

    update() {
      this.y += this.vy;
      this.life -= 0.02;
      return this.life > 0;
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.life);
      ctx.font = `bold ${this.size}px 'Orbitron', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8;
      ctx.fillText(this.text, this.x, this.y);
      ctx.restore();
    }
  }

  // Inicialización al cargar el DOM
  window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new GalacticGame();
  });
})();

