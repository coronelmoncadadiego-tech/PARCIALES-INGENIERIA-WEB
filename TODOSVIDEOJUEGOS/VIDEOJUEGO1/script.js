/**
 * ========================================================
 * HALLOWEEN SPOOKY PONG 2D - EDICIÓN NOCHE DE BRUJAS
 * Archivo principal: Físicas, Calavera Pixel Art y Audio
 * ========================================================
 */

// ========================================================
// 1. CONFIGURACIÓN Y ESTADO DEL JUEGO
// ========================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Desactivar suavizado para estética Pixel Art pura
ctx.imageSmoothingEnabled = false;

const GAME_CONFIG = {
  width: 800,
  height: 500,
  paddleWidth: 16,
  paddleHeight: 84,
  ballSize: 22, // Tamaño ideal para la calavera detallada (11x11 * 2px)
  initialBallSpeed: 6.8,
  maxBallSpeed: 15.5,
  speedIncrement: 0.38,
  paddleSpeed: 7.5,
};

const STATES = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  COUNTDOWN: 'COUNTDOWN',
  PAUSED: 'PAUSED',
  GAMEOVER: 'GAMEOVER'
};

let gameState = STATES.MENU;
let gameMode = '1P'; // '1P' (vs CPU) o '2P' (Local)
let difficulty = 'normal'; // 'easy', 'normal', 'hard'
let pointsToWin = 5;

// Variables de Audio (Web Audio API)
let audioCtx = null;
let soundMuted = false;

// Variables para sacudida de pantalla (Screen Shake)
let screenShakeTime = 0;
let screenShakeMagnitude = 0;

// Variables para cuenta regresiva
let countdownTimer = 0;
let countdownText = '';

// ========================================================
// 2. SISTEMA DE AUDIO SINTETIZADO RETRO HALLOWEEN
// ========================================================
function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Sonido de golpe a hueso (Bone Clack)
function soundBoneHit() {
  initAudio();
  if (soundMuted || !audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(750, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.06);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  } catch (e) {}
}

// Sonido de rebote contra cripta/pared
function soundWallHit() {
  initAudio();
  if (soundMuted || !audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.07);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  } catch (e) {}
}

// Acorde de órgano de horror al atrapar un alma (Score)
function soundSoulClaimed() {
  initAudio();
  if (soundMuted || !audioCtx) return;
  const now = audioCtx.currentTime;
  // Escala menor armónica espeluznante: Re menor (D4, F4, A4, C#5)
  const notes = [293.66, 349.23, 440.00, 554.37];
  notes.forEach((freq, idx) => {
    setTimeout(() => {
      if (soundMuted || !audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.22);
      } catch (e) {}
    }, idx * 75);
  });
}

// Fanfarria de victoria tenebrosa
function soundSpookyVictory() {
  initAudio();
  if (soundMuted || !audioCtx) return;
  const notes = [293.66, 277.18, 293.66, 415.30, 440.00, 587.33];
  notes.forEach((freq, idx) => {
    setTimeout(() => {
      if (soundMuted || !audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } catch (e) {}
    }, idx * 110);
  });
}

function soundButtonClick() {
  initAudio();
  if (soundMuted || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(520, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  } catch (e) {}
}

// ========================================================
// 3. PALETAS DE HUESO Y FANTASMA
// ========================================================
class Paddle {
  constructor(x, y, theme, isPlayer2 = false) {
    this.initialX = x;
    this.initialY = y;
    this.x = x;
    this.y = y;
    this.width = GAME_CONFIG.paddleWidth;
    this.height = GAME_CONFIG.paddleHeight;
    this.theme = theme; // 'pumpkin' o 'witch'
    this.primaryColor = theme === 'pumpkin' ? '#ff6b00' : '#9d4edd';
    this.accentColor = theme === 'pumpkin' ? '#ffe600' : '#39ff14';
    this.isPlayer2 = isPlayer2;
    this.score = 0;
    this.speed = GAME_CONFIG.paddleSpeed;
    this.vy = 0;
    this.hitGlow = 0;
  }

  reset() {
    this.x = this.initialX;
    this.y = this.initialY;
    this.vy = 0;
    this.hitGlow = 0;
  }

  update(moveUp, moveDown) {
    this.vy = 0;
    if (moveUp) this.vy -= this.speed;
    if (moveDown) this.vy += this.speed;

    this.y += this.vy;

    if (this.y < 12) this.y = 12;
    if (this.y + this.height > GAME_CONFIG.height - 12) {
      this.y = GAME_CONFIG.height - 12 - this.height;
    }

    if (this.hitGlow > 0) this.hitGlow -= 0.05;
  }

  updateAI(skull) {
    let targetY = skull.y - this.height / 2;
    let aiSpeed = this.speed;
    let reactionError = 0;

    switch (difficulty) {
      case 'easy':
        aiSpeed = 4.3;
        reactionError = 32 * Math.sin(Date.now() / 280);
        if (skull.vx < 0 && skull.x < GAME_CONFIG.width * 0.6) return;
        break;
      case 'normal':
        aiSpeed = 6.4;
        reactionError = 14 * Math.sin(Date.now() / 380);
        if (skull.vx < 0 && skull.x < GAME_CONFIG.width * 0.4) return;
        break;
      case 'hard':
        aiSpeed = 8.1;
        reactionError = 4 * Math.sin(Date.now() / 450);
        break;
    }

    targetY += reactionError;
    const diff = targetY - this.y;
    if (Math.abs(diff) > 4) {
      if (diff > 0) {
        this.y += Math.min(diff, aiSpeed);
        this.vy = aiSpeed;
      } else {
        this.y -= Math.min(-diff, aiSpeed);
        this.vy = -aiSpeed;
      }
    } else {
      this.vy = 0;
    }

    if (this.y < 12) this.y = 12;
    if (this.y + this.height > GAME_CONFIG.height - 12) {
      this.y = GAME_CONFIG.height - 12 - this.height;
    }

    if (this.hitGlow > 0) this.hitGlow -= 0.05;
  }

  draw() {
    ctx.save();
    const rx = Math.round(this.x);
    const ry = Math.round(this.y);

    // Resplandor espectral al golpear
    if (this.hitGlow > 0) {
      ctx.shadowColor = this.accentColor;
      ctx.shadowBlur = 18;
    } else {
      ctx.shadowColor = this.primaryColor;
      ctx.shadowBlur = 8;
    }

    // 1. Base hueso/lápida
    ctx.fillStyle = this.hitGlow > 0 ? '#ffffff' : this.primaryColor;
    ctx.fillRect(rx, ry, this.width, this.height);

    // 2. Interior con textura de vértebras de hueso
    ctx.fillStyle = '#f4f1e8';
    ctx.fillRect(rx + 2, ry + 2, this.width - 4, this.height - 4);

    // 3. Segmentos de hueso / runas misteriosas
    const segments = 4;
    const segH = Math.floor((this.height - 8) / segments);
    for (let i = 0; i < segments; i++) {
      const sy = ry + 4 + i * segH;
      // Sombra entre vértebras
      ctx.fillStyle = '#b3ab96';
      ctx.fillRect(rx + 3, sy + segH - 2, this.width - 6, 2);

      // Runa central de poder
      ctx.fillStyle = this.accentColor;
      ctx.fillRect(rx + Math.floor(this.width / 2) - 1, sy + 3, 2, segH - 6);
    }

    // 4. Calavera pequeña o gema en el centro de la paleta
    const midY = ry + Math.floor(this.height / 2);
    ctx.fillStyle = this.primaryColor;
    ctx.fillRect(rx + 3, midY - 4, this.width - 6, 8);
    ctx.fillStyle = this.accentColor;
    ctx.fillRect(rx + 5, midY - 2, 2, 2);
    ctx.fillRect(rx + this.width - 7, midY - 2, 2, 2);

    ctx.restore();
  }
}

// ========================================================
// 4. LA CALAVERA PIXEL ART (PELOTA DEL JUEGO)
// ========================================================
/**
 * Matriz 11x11 de la Calavera Pixel Art
 * 0: Transparente
 * 1: Hueso claro (#f7f5ee)
 * 2: Sombra de hueso (#b8b19e)
 * 3: Ojo/Cavidad oscura (#12041c)
 * 4: Fuego ocular brillante / Ojo rojo demonio (#ff1e42)
 * 5: Fosa nasal oscura (#12041c)
 * 6: Hendidura de dientes (#38144f)
 */
const SKULL_PIXELS = [
  [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0], // Frente alta
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], // Cabeza redondeada
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // Cráneo superior
  [1, 1, 3, 4, 1, 1, 1, 4, 3, 1, 1], // Ojos brillantes
  [1, 1, 4, 4, 1, 1, 1, 4, 4, 1, 1], // Fuego en cuencas oculares
  [1, 2, 3, 1, 1, 5, 1, 1, 3, 2, 1], // Pómulos y nariz
  [0, 1, 2, 1, 5, 5, 5, 1, 2, 1, 0], // Cavidad nasal
  [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0], // Comienzo de mandíbula
  [0, 0, 1, 6, 1, 6, 1, 6, 1, 0, 0], // Dientes superiores
  [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0], // Dientes inferiores
  [0, 0, 0, 2, 2, 2, 2, 2, 0, 0, 0], // Barbilla/Sombra
];

class SkullBall {
  constructor() {
    this.size = GAME_CONFIG.ballSize; // 22px (cada píxel de la matriz = 2x2)
    this.pixelScale = 2;
    this.baseSpeed = GAME_CONFIG.initialBallSpeed;
    this.speed = this.baseSpeed;
    this.x = GAME_CONFIG.width / 2 - this.size / 2;
    this.y = GAME_CONFIG.height / 2 - this.size / 2;
    this.vx = this.speed;
    this.vy = 0;
    this.trail = [];
    this.maxTrail = 7;
    this.eyeColor = '#ff2a00'; // Ojos rojos incandescentes
    this.ghostFireTimer = 0;
  }

  reset(servingPlayer = 1) {
    this.x = GAME_CONFIG.width / 2 - this.size / 2;
    this.y = GAME_CONFIG.height / 2 - this.size / 2;
    this.speed = this.baseSpeed;
    this.trail = [];

    const direction = (servingPlayer === 1) ? 1 : -1;
    const randomAngle = (Math.random() * 0.6 - 0.3);

    this.vx = direction * this.speed * Math.cos(randomAngle);
    this.vy = this.speed * Math.sin(randomAngle);
  }

  update() {
    this.ghostFireTimer += 0.15;

    // Guardar rastro de estela espectral
    this.trail.push({ 
      x: this.x, 
      y: this.y, 
      color: Math.sin(this.ghostFireTimer) > 0 ? 'rgba(255, 107, 0, 0.4)' : 'rgba(157, 78, 221, 0.4)'
    });

    if (this.trail.length > this.maxTrail) {
      this.trail.shift();
    }

    this.x += this.vx;
    this.y += this.vy;

    // FÍSICA: Colisión superior
    if (this.y <= 12) {
      this.y = 12;
      this.vy = -this.vy;
      soundWallHit();
      createSpookyParticles(this.x + this.size / 2, this.y, '#39ff14', 9);
      triggerScreenShake(2, 4);
    }
    // FÍSICA: Colisión inferior
    else if (this.y + this.size >= GAME_CONFIG.height - 12) {
      this.y = GAME_CONFIG.height - 12 - this.size;
      this.vy = -this.vy;
      soundWallHit();
      createSpookyParticles(this.x + this.size / 2, this.y + this.size, '#39ff14', 9);
      triggerScreenShake(2, 4);
    }
  }

  draw() {
    // 1. Dibujar estela de fuego espectral / niebla fantasmal
    this.trail.forEach((pos, idx) => {
      const alpha = (idx + 1) / (this.trail.length + 1) * 0.55;
      const tSize = Math.max(6, this.size - (this.trail.length - idx) * 2);
      const offset = (this.size - tSize) / 2;

      ctx.save();
      ctx.fillStyle = idx % 2 === 0 ? `rgba(255, 107, 0, ${alpha})` : `rgba(157, 78, 221, ${alpha})`;
      ctx.fillRect(Math.round(pos.x + offset), Math.round(pos.y + offset), tSize, tSize);
      ctx.restore();
    });

    // 2. Dibujar la CALAVERA PIXEL ART usando la matriz
    ctx.save();
    const bx = Math.round(this.x);
    const by = Math.round(this.y);
    const p = this.pixelScale;

    // Resplandor diabólico alrededor de la calavera
    ctx.shadowColor = '#ff3c00';
    ctx.shadowBlur = 12;

    for (let r = 0; r < SKULL_PIXELS.length; r++) {
      for (let c = 0; c < SKULL_PIXELS[r].length; c++) {
        const val = SKULL_PIXELS[r][c];
        if (val === 0) continue;

        switch (val) {
          case 1: // Hueso puro
            ctx.fillStyle = '#f7f4e9';
            break;
          case 2: // Sombra de hueso
            ctx.fillStyle = '#b5ad9b';
            break;
          case 3: // Hueco del cráneo
            ctx.fillStyle = '#140320';
            break;
          case 4: // Ojos rojos ardientes
            // Efecto de parpadeo de fuego en los ojos
            ctx.fillStyle = Math.sin(this.ghostFireTimer * 3) > 0.3 ? '#ffef47' : '#ff193c';
            break;
          case 5: // Fosa nasal
            ctx.fillStyle = '#140320';
            break;
          case 6: // Dientes
            ctx.fillStyle = '#3a1352';
            break;
        }

        ctx.fillRect(bx + c * p, by + r * p, p, p);
      }
    }

    ctx.restore();
  }
}

// ========================================================
// 5. SISTEMA DE PARTÍCULAS TERRORÍFICAS
// ========================================================
let particles = [];

class SpookyParticle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = Math.floor(Math.random() * 4) + 3;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4.5 + 1.2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1.0;
    this.decay = Math.random() * 0.045 + 0.03;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
  }

  draw() {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.fillRect(Math.round(this.x), Math.round(this.y), this.size, this.size);
    ctx.restore();
  }
}

function createSpookyParticles(x, y, color, count = 12) {
  // Mezcla de colores de Halloween: color base, naranja fuego y fragmento de hueso
  const colors = [color, '#ff6b00', '#f7f4e9', '#39ff14'];
  for (let i = 0; i < count; i++) {
    const pColor = colors[Math.floor(Math.random() * colors.length)];
    particles.push(new SpookyParticle(x, y, pColor));
  }
}

function triggerScreenShake(magnitude, durationFrames) {
  screenShakeMagnitude = magnitude;
  screenShakeTime = durationFrames;
}

// ========================================================
// 6. INSTANCIAS DE JUEGO Y EVENTOS
// ========================================================
const player1 = new Paddle(25, GAME_CONFIG.height / 2 - GAME_CONFIG.paddleHeight / 2, 'pumpkin');
const player2 = new Paddle(GAME_CONFIG.width - 25 - GAME_CONFIG.paddleWidth, GAME_CONFIG.height / 2 - GAME_CONFIG.paddleHeight / 2, 'witch', true);
const skull = new SkullBall();

const keys = {};

window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  keys[e.code] = true;

  initAudio();

  if (e.key === 'p' || e.key === 'P') {
    if (gameState === STATES.PLAYING) pauseGame();
    else if (gameState === STATES.PAUSED) resumeGame();
  }

  if (e.key === 'm' || e.key === 'M') {
    toggleAudio();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
  keys[e.code] = false;
});

// ========================================================
// 7. MOTOR DE FÍSICAS Y COLISIONES
// ========================================================
function checkPaddleCollision(skullObj, paddle, isLeftPaddle) {
  const sLeft = skullObj.x;
  const sRight = skullObj.x + skullObj.size;
  const sTop = skullObj.y;
  const sBottom = skullObj.y + skullObj.size;

  const padLeft = paddle.x;
  const padRight = paddle.x + paddle.width;
  const padTop = paddle.y;
  const padBottom = paddle.y + paddle.height;

  const isColliding = 
    sRight >= padLeft &&
    sLeft <= padRight &&
    sBottom >= padTop &&
    sTop <= padBottom;

  if (isColliding) {
    if (isLeftPaddle && skullObj.vx < 0) {
      skullObj.x = paddle.x + paddle.width;
    } else if (!isLeftPaddle && skullObj.vx > 0) {
      skullObj.x = paddle.x - skullObj.size;
    } else {
      return;
    }

    // FÍSICA DE REBOTE ANGULAR:
    const skullCenterY = skullObj.y + skullObj.size / 2;
    const paddleCenterY = paddle.y + paddle.height / 2;
    let hitOffset = (skullCenterY - paddleCenterY) / (paddle.height / 2);
    hitOffset = Math.max(-1, Math.min(1, hitOffset));

    const maxBounceAngle = Math.PI / 3; // 60 grados max
    const bounceAngle = hitOffset * maxBounceAngle;

    // Incremento de velocidad con cada golpe
    skullObj.speed = Math.min(skullObj.speed + GAME_CONFIG.speedIncrement, GAME_CONFIG.maxBallSpeed);

    const direction = isLeftPaddle ? 1 : -1;
    skullObj.vx = direction * skullObj.speed * Math.cos(bounceAngle);
    
    // Inercia/efecto con el movimiento de la paleta
    const spinInfluence = paddle.vy * 0.22;
    skullObj.vy = skullObj.speed * Math.sin(bounceAngle) + spinInfluence;

    // Efectos de sonido y visuales
    soundBoneHit();
    paddle.hitGlow = 1;
    createSpookyParticles(
      isLeftPaddle ? paddle.x + paddle.width : paddle.x,
      skullCenterY,
      paddle.primaryColor,
      14
    );
    triggerScreenShake(3, 5);
  }
}

// ========================================================
// 8. CICLO PRINCIPAL
// ========================================================
function update() {
  if (gameState !== STATES.PLAYING && gameState !== STATES.COUNTDOWN) return;

  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    if (particles[i].life <= 0) particles.splice(i, 1);
  }

  if (gameState === STATES.COUNTDOWN) {
    countdownTimer--;
    if (countdownTimer <= 0) gameState = STATES.PLAYING;
    return;
  }

  // Jugador 1
  const p1Up = keys['w'] || keys['keyw'] || (gameMode === '1P' && (keys['arrowup'] || keys['arrow_up']));
  const p1Down = keys['s'] || keys['keys'] || (gameMode === '1P' && (keys['arrowdown'] || keys['arrow_down']));
  player1.update(p1Up, p1Down);

  // Jugador 2 / CPU
  if (gameMode === '2P') {
    const p2Up = keys['arrowup'] || keys['arrow_up'];
    const p2Down = keys['arrowdown'] || keys['arrow_down'];
    player2.update(p2Up, p2Down);
  } else {
    player2.updateAI(skull);
  }

  // Movimiento de la Calavera
  skull.update();

  // Colisiones
  checkPaddleCollision(skull, player1, true);
  checkPaddleCollision(skull, player2, false);

  // Anotaciones (Reclamar almas)
  if (skull.x + skull.size < 0) {
    player2.score++;
    handleScore(2);
  } else if (skull.x > GAME_CONFIG.width) {
    player1.score++;
    handleScore(1);
  }
}

function handleScore(scorer) {
  soundSoulClaimed();
  triggerScreenShake(5, 9);
  createSpookyParticles(
    scorer === 1 ? GAME_CONFIG.width - 20 : 20,
    skull.y,
    scorer === 1 ? player1.primaryColor : player2.primaryColor,
    30
  );

  if (player1.score >= pointsToWin || player2.score >= pointsToWin) {
    endGame(player1.score >= pointsToWin ? 1 : 2);
    return;
  }

  skull.reset(scorer === 1 ? 2 : 1);
  startCountdown('¡ALMA RECLAMADA!');
}

function startCountdown(message) {
  gameState = STATES.COUNTDOWN;
  countdownTimer = 65;
  countdownText = message;
}

// Dibujo de la cancha del inframundo
function drawCourt() {
  ctx.save();
  // Bordes estilo cripta
  ctx.fillStyle = '#260f3b';
  ctx.fillRect(0, 0, GAME_CONFIG.width, 10);
  ctx.fillRect(0, GAME_CONFIG.height - 10, GAME_CONFIG.width, 10);

  // Línea brillante naranja calabaza
  ctx.fillStyle = '#ff7518';
  ctx.fillRect(0, 9, GAME_CONFIG.width, 1);
  ctx.fillRect(0, GAME_CONFIG.height - 10, GAME_CONFIG.width, 1);

  // Línea central de lápidas/huesos
  const dashWidth = 4;
  const dashHeight = 16;
  const gap = 12;
  const centerX = GAME_CONFIG.width / 2 - dashWidth / 2;

  for (let y = 14; y < GAME_CONFIG.height - 14; y += dashHeight + gap) {
    ctx.fillStyle = '#4c1e75';
    ctx.fillRect(centerX, y, dashWidth, dashHeight);

    // Cruz / Runa en el centro de cada lápida
    ctx.fillStyle = '#ff6b00';
    ctx.fillRect(centerX - 1, y + 4, 6, 2);
    ctx.fillRect(centerX + 1, y + 2, 2, 6);
  }

  ctx.restore();
}

function drawScores() {
  ctx.save();
  ctx.font = '32px "Press Start 2P", monospace';
  ctx.textAlign = 'center';

  // P1 Score (Calabaza)
  ctx.fillStyle = player1.primaryColor;
  ctx.shadowColor = player1.primaryColor;
  ctx.shadowBlur = 12;
  ctx.fillText(player1.score.toString(), GAME_CONFIG.width / 2 - 80, 56);

  // P2 Score (Bruja)
  ctx.fillStyle = player2.primaryColor;
  ctx.shadowColor = player2.primaryColor;
  ctx.shadowBlur = 12;
  ctx.fillText(player2.score.toString(), GAME_CONFIG.width / 2 + 80, 56);

  ctx.restore();
}

function render() {
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (screenShakeTime > 0) {
    const offsetX = (Math.random() * 2 - 1) * screenShakeMagnitude;
    const offsetY = (Math.random() * 2 - 1) * screenShakeMagnitude;
    ctx.translate(offsetX, offsetY);
    screenShakeTime--;
  }

  drawCourt();
  drawScores();

  player1.draw();
  player2.draw();

  if (gameState !== STATES.COUNTDOWN || countdownTimer % 12 > 4) {
    skull.draw();
  }

  particles.forEach(p => p.draw());

  if (gameState === STATES.COUNTDOWN) {
    ctx.save();
    ctx.font = '15px "Press Start 2P", monospace';
    ctx.fillStyle = '#ff6b00';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 6;
    ctx.fillText(countdownText, GAME_CONFIG.width / 2, GAME_CONFIG.height / 2 + 60);
    ctx.restore();
  }

  ctx.restore();
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

// ========================================================
// 9. GESTIÓN DE MENÚS Y BOTONES (UI)
// ========================================================
const mainMenu = document.getElementById('mainMenu');
const pauseMenu = document.getElementById('pauseMenu');
const gameOverMenu = document.getElementById('gameOverMenu');
const gameHUD = document.getElementById('gameHUD');
const winnerText = document.getElementById('winnerText');
const finalP1Score = document.getElementById('finalP1Score');
const finalP2Score = document.getElementById('finalP2Score');
const finalP2Label = document.getElementById('finalP2Label');

const btnStart = document.getElementById('btnStart');
const btnResume = document.getElementById('btnResume');
const btnRestart = document.getElementById('btnRestart');
const btnQuit = document.getElementById('btnQuit');
const btnPlayAgain = document.getElementById('btnPlayAgain');
const btnBackToMenu = document.getElementById('btnBackToMenu');
const btnAudioToggle = document.getElementById('btnAudioToggle');
const btnPauseToggle = document.getElementById('btnPauseToggle');

const btnMode1P = document.getElementById('btnMode1P');
const btnMode2P = document.getElementById('btnMode2P');
const difficultyGroup = document.getElementById('difficultyGroup');
const p2Guide = document.getElementById('p2Guide');

btnMode1P.addEventListener('click', () => {
  soundButtonClick();
  gameMode = '1P';
  btnMode1P.classList.add('active');
  btnMode2P.classList.remove('active');
  difficultyGroup.style.display = 'flex';
  p2Guide.innerHTML = '<span class="player-tag p2-tag">👻 DEMONIO CPU</span><span class="keys">Automático</span>';
});

btnMode2P.addEventListener('click', () => {
  soundButtonClick();
  gameMode = '2P';
  btnMode2P.classList.add('active');
  btnMode1P.classList.remove('active');
  difficultyGroup.style.display = 'none';
  p2Guide.innerHTML = '<span class="player-tag p2-tag">👻 JUGADOR 2</span><span class="keys"><kbd>▲</kbd> Subir / <kbd>▼</kbd> Bajar</span>';
});

document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    soundButtonClick();
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    difficulty = e.target.getAttribute('data-diff');
  });
});

document.querySelectorAll('.pts-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    soundButtonClick();
    document.querySelectorAll('.pts-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    pointsToWin = parseInt(e.target.getAttribute('data-pts'), 10);
  });
});

btnStart.addEventListener('click', () => {
  soundButtonClick();
  startGame();
});

function startGame() {
  player1.score = 0;
  player2.score = 0;
  player1.reset();
  player2.reset();
  skull.reset(1);

  mainMenu.classList.add('hidden');
  pauseMenu.classList.add('hidden');
  gameOverMenu.classList.add('hidden');
  gameHUD.classList.remove('hidden');

  startCountdown('¡INVOCANDO A LA CALAVERA!');
}

function pauseGame() {
  if (gameState !== STATES.PLAYING && gameState !== STATES.COUNTDOWN) return;
  gameState = STATES.PAUSED;
  pauseMenu.classList.remove('hidden');
}

function resumeGame() {
  if (gameState !== STATES.PAUSED) return;
  pauseMenu.classList.add('hidden');
  gameState = STATES.PLAYING;
}

btnPauseToggle.addEventListener('click', () => {
  soundButtonClick();
  if (gameState === STATES.PLAYING) pauseGame();
  else if (gameState === STATES.PAUSED) resumeGame();
});

btnResume.addEventListener('click', () => {
  soundButtonClick();
  resumeGame();
});

btnRestart.addEventListener('click', () => {
  soundButtonClick();
  startGame();
});

btnQuit.addEventListener('click', () => {
  soundButtonClick();
  backToMainMenu();
});

function endGame(winner) {
  gameState = STATES.GAMEOVER;
  soundSpookyVictory();

  const isP1 = winner === 1;
  const p2Name = gameMode === '1P' ? 'DEMONIO CPU' : 'JUGADOR 2';

  winnerText.textContent = isP1 ? '¡EL JUGADOR 1 RECLAMA TU ALMA! 🎃' : `¡${p2Name} CONSUME TODO! 💀`;
  winnerText.style.color = isP1 ? player1.primaryColor : player2.primaryColor;

  finalP1Score.textContent = player1.score;
  finalP2Score.textContent = player2.score;
  finalP2Label.textContent = p2Name;

  gameHUD.classList.add('hidden');
  gameOverMenu.classList.remove('hidden');
}

btnPlayAgain.addEventListener('click', () => {
  soundButtonClick();
  startGame();
});

btnBackToMenu.addEventListener('click', () => {
  soundButtonClick();
  backToMainMenu();
});

function backToMainMenu() {
  gameState = STATES.MENU;
  mainMenu.classList.remove('hidden');
  pauseMenu.classList.add('hidden');
  gameOverMenu.classList.add('hidden');
  gameHUD.classList.add('hidden');

  player1.score = 0;
  player2.score = 0;
  player1.reset();
  player2.reset();
  skull.reset(1);
}

function toggleAudio() {
  soundMuted = !soundMuted;
  btnAudioToggle.textContent = soundMuted ? '🔇' : '🔊';
  if (!soundMuted) soundButtonClick();
}

btnAudioToggle.addEventListener('click', () => {
  toggleAudio();
});

// ========================================================
// 10. ARRANQUE DEL JUEGO
// ========================================================
requestAnimationFrame(gameLoop);
