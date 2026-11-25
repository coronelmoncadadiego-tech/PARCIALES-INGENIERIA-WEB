/**
 * MINIGAMES.JS - Sistema Integral de los 10 Minijuegos Diegéticos y Tableta
 * Implementa enfriamiento progresivo que aumenta tras cada realización.
 */

class MinigamesManager {
  constructor(game, controls, scene) {
    this.game = game;
    this.controls = controls;
    this.scene = scene;

    this.activeMinigameId = null;

    // Definición de las 10 Tareas Distribuidas por la Casa
    this.tasks = {
      enfoque: {
        id: 'enfoque',
        name: 'Enfoque Biológico',
        room: 'Dormitorio Principal',
        desc: 'Forzar la vista ante la caída de párpados y somnolencia.',
        baseCooldown: 22,
        cooldownTimer: 0,
        completions: 0,
        lucidReward: 20,
        batteryReward: 5
      },
      reloj: {
        id: 'reloj',
        name: 'Sincronizar Reloj Mental',
        room: 'Dormitorio Principal',
        desc: 'Alinear las manecillas bajo distorsión de perspectiva invertida 180°.',
        baseCooldown: 28,
        cooldownTimer: 0,
        completions: 0,
        lucidReward: 35,
        batteryReward: 10
      },
      lavamanos: {
        id: 'lavamanos',
        name: 'Lavarse la Cara (Agua Fría)',
        room: 'Cuarto de Baño',
        desc: 'Golpear agua helada en el rostro para reactivar el sistema nervioso.',
        baseCooldown: 24,
        cooldownTimer: 0,
        completions: 0,
        lucidReward: 25,
        batteryReward: 15
      },
      espejo: {
        id: 'espejo',
        name: 'Desempañar Espejo',
        room: 'Cuarto de Baño',
        desc: 'Frotar el vapor acumulado para recuperar el contacto con tu reflejo.',
        baseCooldown: 30,
        cooldownTimer: 0,
        completions: 0,
        lucidReward: 22,
        batteryReward: 10
      },
      tetera: {
        id: 'tetera',
        name: 'Hervir Infusión de Cafeína',
        room: 'Cocina',
        desc: 'Regular la presión y calor del quemador en el punto óptimo.',
        baseCooldown: 26,
        cooldownTimer: 0,
        completions: 0,
        lucidReward: 28,
        batteryReward: 20
      },
      tuberia: {
        id: 'tuberia',
        name: 'Cerrar Fuga de Tubería',
        room: 'Cocina',
        desc: 'Ajustar la válvula con ritmo para silenciar el goteo enloquecedor.',
        baseCooldown: 25,
        cooldownTimer: 0,
        completions: 0,
        lucidReward: 24,
        batteryReward: 15
      },
      television: {
        id: 'television',
        name: 'Sintonizar TV CRT',
        room: 'Sala de Estar',
        desc: 'Calibrar la perilla de frecuencia hasta interceptar emisión lúcida.',
        baseCooldown: 32,
        cooldownTimer: 0,
        completions: 0,
        lucidReward: 30,
        batteryReward: 25
      },
      casete: {
        id: 'casete',
        name: 'Rebobinar Cinta de Grabadora',
        room: 'Sala de Estar',
        desc: 'Girar los carretes magnéticos sin romper la cinta de recuerdos.',
        baseCooldown: 28,
        cooldownTimer: 0,
        completions: 0,
        lucidReward: 26,
        batteryReward: 15
      },
      maquinilla: {
        id: 'maquinilla',
        name: 'Máquina de Escribir (Anclaje)',
        room: 'Estudio',
        desc: 'Mecanografiar palabra de afirmación de vigilia: D-E-S-P-I-E-R-T-A.',
        baseCooldown: 35,
        cooldownTimer: 0,
        completions: 0,
        lucidReward: 35,
        batteryReward: 15
      },
      fusibles: {
        id: 'fusibles',
        name: 'Restablecer Caja de Fusibles',
        room: 'Cuarto Eléctrico',
        desc: 'Reactivar los interruptores térmicos para estabilizar la energía.',
        baseCooldown: 36,
        cooldownTimer: 0,
        completions: 0,
        lucidReward: 32,
        batteryReward: 40
      }
    };

    // Sub-estados internos de minijuegos
    this.initFocusState();
    this.initClockState();
    this.initSinkState();
    this.initMirrorState();
    this.initKettleState();
    this.initPipeState();
    this.initTVState();
    this.initTapeState();
    this.initTypewriterState();
    this.initFuseboxState();

    this.bindGlobalEvents();
  }

  // ================= 1. ENFOQUE BIOLÓGICO =================
  initFocusState() {
    this.focusProgress = 0;
    this.isHoldingSpace = false;
    this.focusReticle = document.querySelector('.focus-reticle');
    this.focusProgressFill = document.querySelector('.focus-progress-fill');
    this.focusText = document.querySelector('.focus-text');
    this.topEyelid = document.querySelector('.eyelid-top');
    this.bottomEyelid = document.querySelector('.eyelid-bottom');

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.activeMinigameId === 'enfoque') {
        this.isHoldingSpace = true;
        if (typeof audioEngine !== 'undefined') audioEngine.playFocusBreathe(false);
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') this.isHoldingSpace = false;
    });
  }

  // ================= 2. RELOJ INVERTIDO =================
  initClockState() {
    this.clockCurrentAngle = 0;
    this.clockTargetAngle = 180;
    this.clockStabilized = 0;
    this.clockMinuteHand = document.querySelector('.clock-hand-minute');
    this.clockTargetZone = document.querySelector('.clock-target-zone');
    this.clockStatusText = document.getElementById('clock-puzzle-status');

    const leftBtn = document.getElementById('clock-turn-left');
    const rightBtn = document.getElementById('clock-turn-right');
    const exitBtn = document.getElementById('clock-exit-btn');

    if (leftBtn) leftBtn.addEventListener('click', () => this.rotateClockNeedle(18));
    if (rightBtn) rightBtn.addEventListener('click', () => this.rotateClockNeedle(-18));
    if (exitBtn) exitBtn.addEventListener('click', () => this.closeMinigame());
  }

  rotateClockNeedle(amt) {
    this.clockCurrentAngle = (this.clockCurrentAngle + amt + 360) % 360;
    if (this.clockMinuteHand) {
      this.clockMinuteHand.style.transform = `rotate(${this.clockCurrentAngle}deg)`;
    }
    if (typeof audioEngine !== 'undefined') audioEngine.playClockTick(amt > 0);
  }

  // ================= 3. LAVAMANOS (AGUA FRÍA) =================
  initSinkState() {
    this.sinkClicks = 0;
    this.requiredSinkClicks = 6;
    const splashBtn = document.getElementById('sink-splash-btn');
    const exitBtn = document.getElementById('sink-exit-btn');

    if (splashBtn) {
      splashBtn.addEventListener('click', () => {
        this.sinkClicks++;
        if (typeof audioEngine !== 'undefined') audioEngine.playWaterSplash();

        const wave = document.querySelector('.sink-water-wave');
        if (wave) wave.style.height = `${(this.sinkClicks / this.requiredSinkClicks) * 100}%`;

        const stat = document.getElementById('sink-status-text');
        if (stat) stat.innerText = `SALPICADAS: ${this.sinkClicks} / ${this.requiredSinkClicks}`;

        if (this.sinkClicks >= this.requiredSinkClicks) {
          this.completeTask('lavamanos');
        }
      });
    }
    if (exitBtn) exitBtn.addEventListener('click', () => this.closeMinigame());
  }

  // ================= 4. DESEMPAÑAR ESPEJO =================
  initMirrorState() {
    this.mirrorCanvas = document.getElementById('mirror-canvas');
    this.mirrorCtx = this.mirrorCanvas ? this.mirrorCanvas.getContext('2d') : null;
    this.mirrorClearedPixels = 0;
    this.isScrubbing = false;

    if (this.mirrorCanvas) {
      this.mirrorCanvas.width = 260;
      this.mirrorCanvas.height = 220;

      this.mirrorCanvas.addEventListener('mousedown', () => (this.isScrubbing = true));
      window.addEventListener('mouseup', () => (this.isScrubbing = false));
      this.mirrorCanvas.addEventListener('mousemove', (e) => {
        if (!this.isScrubbing || !this.mirrorCtx) return;
        const rect = this.mirrorCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.mirrorCtx.globalCompositeOperation = 'destination-out';
        this.mirrorCtx.beginPath();
        this.mirrorCtx.arc(x, y, 22, 0, Math.PI * 2);
        this.mirrorCtx.fill();

        this.mirrorClearedPixels += 1;
        if (this.mirrorClearedPixels > 55) {
          this.completeTask('espejo');
        }
      });
    }

    const exitBtn = document.getElementById('mirror-exit-btn');
    if (exitBtn) exitBtn.addEventListener('click', () => this.closeMinigame());
  }

  resetMirrorCanvas() {
    if (!this.mirrorCtx) return;
    this.mirrorClearedPixels = 0;
    this.mirrorCtx.globalCompositeOperation = 'source-over';
    this.mirrorCtx.fillStyle = 'rgba(180, 200, 215, 0.95)';
    this.mirrorCtx.fillRect(0, 0, 260, 220);

    // Texto tétrico oculto tras el vapor
    this.mirrorCtx.fillStyle = 'rgba(160, 20, 20, 0.4)';
    this.mirrorCtx.font = 'bold 22px Courier New';
    this.mirrorCtx.textAlign = 'center';
    this.mirrorCtx.fillText('ESTÁS DORMIDO', 130, 115);
  }

  // ================= 5. TETERA / HERVIR CAFÉ =================
  initKettleState() {
    this.kettlePressure = 0;
    this.kettleHoldTime = 0;
    const pumpBtn = document.getElementById('kettle-heat-btn');
    const exitBtn = document.getElementById('kettle-exit-btn');

    if (pumpBtn) {
      pumpBtn.addEventListener('click', () => {
        this.kettlePressure = Math.min(100, this.kettlePressure + 16);
        if (typeof audioEngine !== 'undefined') audioEngine.playClick();
      });
    }
    if (exitBtn) exitBtn.addEventListener('click', () => this.closeMinigame());
  }

  // ================= 6. CERRAR FUGA DE TUBERÍA =================
  initPipeState() {
    this.pipePos = 0;
    this.pipeDir = 1;
    this.pipeSpeed = 120;
    const tightenBtn = document.getElementById('pipe-tighten-btn');
    const exitBtn = document.getElementById('pipe-exit-btn');

    if (tightenBtn) {
      tightenBtn.addEventListener('click', () => {
        if (this.pipePos >= 40 && this.pipePos <= 65) {
          if (typeof audioEngine !== 'undefined') audioEngine.playPipeWrench();
          this.completeTask('tuberia');
        } else {
          if (typeof audioEngine !== 'undefined') audioEngine.playClick();
          const stat = document.getElementById('pipe-status-text');
          if (stat) stat.innerText = '¡FALLO! AJUSTA EN LA ZONA AZUL';
        }
      });
    }
    if (exitBtn) exitBtn.addEventListener('click', () => this.closeMinigame());
  }

  // ================= 7. SINTONIZAR TV CRT =================
  initTVState() {
    this.tvSlider = document.getElementById('tv-tuner-slider');
    this.tvTargetFreq = 74;
    this.tvCanvas = document.getElementById('tv-static-canvas');
    this.tvCtx = this.tvCanvas ? this.tvCanvas.getContext('2d') : null;
    const exitBtn = document.getElementById('tv-exit-btn');

    if (this.tvCanvas) {
      this.tvCanvas.width = 260;
      this.tvCanvas.height = 180;
    }

    if (this.tvSlider) {
      this.tvSlider.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        const diff = Math.abs(val - this.tvTargetFreq);
        const stat = document.getElementById('tv-status-text');

        if (diff <= 3) {
          if (stat) {
            stat.innerText = '¡FRECUENCIA ALINEADA! SEÑAL RECIBIDA';
            stat.style.color = '#2ed573';
          }
          setTimeout(() => this.completeTask('television'), 600);
        } else {
          if (stat) {
            stat.innerText = `SINTONIZANDO: ${val} MHz (BUSCA RESONANCIA)`;
            stat.style.color = '#00d2d3';
          }
        }
      });
    }
    if (exitBtn) exitBtn.addEventListener('click', () => this.closeMinigame());
  }

  renderTVStatic(clearedFactor) {
    if (!this.tvCtx) return;
    const imgData = this.tvCtx.createImageData(260, 180);
    const buf = new Uint32Array(imgData.data.buffer);
    const noiseLevel = 1 - clearedFactor;

    for (let i = 0; i < buf.length; i++) {
      if (Math.random() < noiseLevel) {
        const shade = Math.random() * 255;
        buf[i] = (255 << 24) | (shade << 16) | (shade << 8) | shade;
      } else {
        buf[i] = (255 << 24) | (200 << 16) | (100 << 8) | 50;
      }
    }
    this.tvCtx.putImageData(imgData, 0, 0);
  }

  // ================= 8. REBOBINAR CASETE =================
  initTapeState() {
    this.tapeTension = 0;
    const spinBtn = document.getElementById('tape-spin-btn');
    const exitBtn = document.getElementById('tape-exit-btn');

    if (spinBtn) {
      spinBtn.addEventListener('click', () => {
        this.tapeTension += 14;
        const reels = document.querySelectorAll('.tape-reel');
        reels.forEach(r => (r.style.transform = `rotate(${this.tapeTension * 6}deg)`));

        const stat = document.getElementById('tape-status-text');
        if (stat) stat.innerText = `REBOBINADO: ${Math.min(100, Math.floor(this.tapeTension))}%`;

        if (this.tapeTension >= 100) {
          this.completeTask('casete');
        }
      });
    }
    if (exitBtn) exitBtn.addEventListener('click', () => this.closeMinigame());
  }

  // ================= 9. MÁQUINA DE ESCRIBIR =================
  initTypewriterState() {
    this.targetWord = 'DESPIERTA';
    this.currentTyped = '';
    const exitBtn = document.getElementById('typewriter-exit-btn');

    const keypad = document.querySelector('.typewriter-keypad');
    if (keypad) {
      const letters = ['D', 'E', 'S', 'P', 'I', 'R', 'T', 'A', 'BORRAR'];
      letters.forEach(char => {
        const btn = document.createElement('button');
        btn.className = 'type-key-btn';
        btn.innerText = char;
        if (char === 'BORRAR') btn.style.width = '75px';

        btn.addEventListener('click', () => {
          if (char === 'BORRAR') {
            this.currentTyped = this.currentTyped.slice(0, -1);
          } else {
            this.currentTyped += char;
            if (typeof audioEngine !== 'undefined') audioEngine.playTypewriterKey(false);
          }

          const disp = document.getElementById('typewriter-typed');
          if (disp) disp.innerText = this.currentTyped || '...';

          if (this.currentTyped === this.targetWord) {
            if (typeof audioEngine !== 'undefined') audioEngine.playTypewriterKey(true);
            setTimeout(() => this.completeTask('maquinilla'), 500);
          }
        });
        keypad.appendChild(btn);
      });
    }
    if (exitBtn) exitBtn.addEventListener('click', () => this.closeMinigame());
  }

  // ================= 10. CAJA DE FUSIBLES =================
  initFuseboxState() {
    this.activeSwitches = [false, false, false, false];
    const exitBtn = document.getElementById('fusebox-exit-btn');
    const switches = document.querySelectorAll('.fuse-switch');

    switches.forEach((sw, idx) => {
      sw.addEventListener('click', () => {
        this.activeSwitches[idx] = !this.activeSwitches[idx];
        if (this.activeSwitches[idx]) sw.classList.add('on');
        else sw.classList.remove('on');

        if (typeof audioEngine !== 'undefined') audioEngine.playFuseClick();

        // Evaluar si todos los breakers están activos
        if (this.activeSwitches.every(s => s === true)) {
          setTimeout(() => this.completeTask('fusibles'), 400);
        }
      });
    });

    if (exitBtn) exitBtn.addEventListener('click', () => this.closeMinigame());
  }

  // ================= VINCULACIÓN Y MANEJO GLOBAL =================
  bindGlobalEvents() {
    // Tecla ESC para cerrar cualquier minijuego o la tableta
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        if (this.activeMinigameId) this.closeMinigame();
        if (this.game && this.game.isTabletOpen) this.game.toggleTablet(false);
      }
    });
  }

  openMinigame(taskId) {
    const task = this.tasks[taskId];
    if (!task) return;

    if (task.cooldownTimer > 0) {
      if (typeof showNarrativeToast === 'function') {
        showNarrativeToast(`[EN ESPERA: ${Math.ceil(task.cooldownTimer)}s] ${task.name} aún no está disponible.`);
      }
      return;
    }

    this.activeMinigameId = taskId;

    // Pausar movimiento del ratón
    if (this.controls) {
      this.controls.unlock();
      if (taskId === 'reloj') {
        this.controls.setInverted(true);
        document.body.classList.add('cognitive-inversion-active');
      }
    }

    const modal = document.getElementById(`modal-${taskId}`);
    if (modal) modal.classList.add('active');

    // Inicializaciones específicas por minijuego
    if (taskId === 'espejo') this.resetMirrorCanvas();
    if (taskId === 'lavamanos') this.sinkClicks = 0;
    if (taskId === 'tetera') { this.kettlePressure = 10; this.kettleHoldTime = 0; }
    if (taskId === 'casete') this.tapeTension = 0;
    if (taskId === 'maquinilla') {
      this.currentTyped = '';
      const disp = document.getElementById('typewriter-typed');
      if (disp) disp.innerText = '...';
    }
    if (taskId === 'fusibles') {
      this.activeSwitches = [false, false, false, false];
      document.querySelectorAll('.fuse-switch').forEach(s => s.classList.remove('on'));
    }

    if (typeof audioEngine !== 'undefined') audioEngine.playClick();
  }

  closeMinigame() {
    if (!this.activeMinigameId) return;

    const modal = document.getElementById(`modal-${this.activeMinigameId}`);
    if (modal) modal.classList.remove('active');

    if (this.activeMinigameId === 'reloj') {
      document.body.classList.remove('cognitive-inversion-active');
      if (this.controls) this.controls.setInverted(false);
    }

    this.activeMinigameId = null;

    if (this.controls) this.controls.lock();
  }

  /**
   * Finalización exitosa de tarea: Recompensa y Cooldown Progresivo
   */
  completeTask(taskId) {
    const task = this.tasks[taskId];
    if (!task) return;

    task.completions++;

    // CÁLCULO DE ENFRIAMIENTO PROGRESIVO:
    // Cada vez que se completa, se incrementa el tiempo de espera (+75% por repetición)
    const multiplier = 1 + (task.completions - 1) * 0.75;
    task.cooldownTimer = task.baseCooldown * multiplier;

    // Recompensas al jugador
    this.game.restoreLucidity(task.lucidReward);
    this.game.addBattery(task.batteryReward);

    if (typeof audioEngine !== 'undefined') {
      audioEngine.playLucidChime();
    }

    // Destello de alivio
    const flash = document.querySelector('.flash-lucid');
    if (flash) {
      flash.style.opacity = '0.85';
      setTimeout(() => (flash.style.opacity = '0'), 350);
    }

    if (typeof showNarrativeToast === 'function') {
      showNarrativeToast(`¡TAREA COMPLETADA! +${task.lucidReward}% Lucidez | Enfriamiento: ${Math.round(task.cooldownTimer)}s`);
    }

    this.closeMinigame();
    this.updateTabletUI();
  }

  update(delta, currentLucidity) {
    // 1. Actualizar enfriamiento progresivo de todas las tareas
    for (const key in this.tasks) {
      const task = this.tasks[key];
      if (task.cooldownTimer > 0) {
        task.cooldownTimer = Math.max(0, task.cooldownTimer - delta);
      }
    }

    // 2. Comportamiento especial de Enfoque Biológico
    if (currentLucidity < 50) {
      const severity = (50 - currentLucidity) / 50;
      const closeAmt = severity * 42;
      this.topEyelid.style.transform = `translateY(-${100 - closeAmt}%)`;
      this.bottomEyelid.style.transform = `translateY(${100 - closeAmt}%)`;

      const focusTask = this.tasks.enfoque;
      if (focusTask.cooldownTimer <= 0 && this.activeMinigameId !== 'enfoque') {
        this.activeMinigameId = 'enfoque';
        document.getElementById('minigame-focus').classList.add('active');
        this.focusProgress = 0;
      }
    } else {
      this.topEyelid.style.transform = 'translateY(-100%)';
      this.bottomEyelid.style.transform = 'translateY(100%)';
      if (this.activeMinigameId === 'enfoque') {
        document.getElementById('minigame-focus').classList.remove('active');
        this.activeMinigameId = null;
      }
    }

    if (this.activeMinigameId === 'enfoque') {
      if (this.isHoldingSpace) {
        this.focusProgress += delta * 45;
        this.focusText.innerText = 'FORZANDO LA VISTA... MANTÉN EL ENFOQUE';
        this.focusText.style.color = '#55efc4';
      } else {
        this.focusProgress = Math.max(0, this.focusProgress - delta * 30);
        this.focusText.innerText = 'VISIÓN BORROSA: MANTÉN [ESPACIO]';
        this.focusText.style.color = '#ff7675';
      }
      this.focusProgressFill.style.width = `${Math.min(100, this.focusProgress)}%`;
      if (this.focusProgress >= 100) {
        document.getElementById('minigame-focus').classList.remove('active');
        this.activeMinigameId = null;
        this.completeTask('enfoque');
      }
    }

    // 3. Actualizar Reloj Invertido
    if (this.activeMinigameId === 'reloj') {
      let diff = Math.abs(this.clockCurrentAngle - this.clockTargetAngle);
      if (diff > 180) diff = 360 - diff;
      if (diff <= 22) {
        this.clockStabilized += delta;
        if (this.clockStatusText) {
          const pct = Math.min(100, Math.floor((this.clockStabilized / 1.3) * 100));
          this.clockStatusText.innerText = `RESONANCIA TEMPORAL: ${pct}%`;
          this.clockStatusText.style.color = '#2ed573';
        }
        if (this.clockStabilized >= 1.3) {
          if (typeof audioEngine !== 'undefined') audioEngine.playClockBell();
          this.completeTask('reloj');
        }
      } else {
        this.clockStabilized = 0;
      }
    }

    // 4. Actualizar Tetera / Hervidor
    if (this.activeMinigameId === 'tetera') {
      this.kettlePressure = Math.max(0, this.kettlePressure - delta * 12);
      const needle = document.querySelector('.kettle-needle-indicator');
      if (needle) needle.style.left = `${this.kettlePressure}%`;

      if (this.kettlePressure >= 55 && this.kettlePressure <= 82) {
        this.kettleHoldTime += delta;
        const stat = document.getElementById('kettle-status-text');
        if (stat) stat.innerText = `TEMPERATURA ESTABLE: ${Math.floor((this.kettleHoldTime / 2.0) * 100)}%`;
        if (this.kettleHoldTime >= 2.0) {
          if (typeof audioEngine !== 'undefined') audioEngine.playKettleWhistle();
          this.completeTask('tetera');
        }
      } else {
        this.kettleHoldTime = 0;
      }
    }

    // 5. Actualizar Tubería oscilante
    if (this.activeMinigameId === 'tuberia') {
      this.pipePos += this.pipeDir * this.pipeSpeed * delta;
      if (this.pipePos > 94) { this.pipePos = 94; this.pipeDir = -1; }
      if (this.pipePos < 0) { this.pipePos = 0; this.pipeDir = 1; }
      const cursor = document.querySelector('.pipe-cursor');
      if (cursor) cursor.style.left = `${this.pipePos}%`;
    }

    // 6. Actualizar Estática de TV
    if (this.activeMinigameId === 'television') {
      const val = this.tvSlider ? Number(this.tvSlider.value) : 0;
      const diff = Math.abs(val - this.tvTargetFreq);
      const cleared = Math.max(0, 1 - diff / 40);
      this.renderTVStatic(cleared);
    }
  }

  updateTabletUI() {
    const grid = document.querySelector('.tablet-tasks-grid');
    if (!grid) return;

    grid.innerHTML = '';
    for (const key in this.tasks) {
      const task = this.tasks[key];
      const isAvailable = task.cooldownTimer <= 0;

      const card = document.createElement('div');
      card.className = `tablet-task-card ${isAvailable ? 'available' : 'cooldown'}`;

      const statusTag = isAvailable
        ? '<span class="task-status-tag status-avail">[DISPONIBLE]</span>'
        : `<span class="task-status-tag status-wait">[EN ESPERA: ${Math.ceil(task.cooldownTimer)}s]</span>`;

      card.innerHTML = `
        <div class="task-card-top">
          <div class="task-name">${task.name}</div>
          <div class="task-room">${task.room}</div>
        </div>
        <div class="task-desc">${task.desc}</div>
        <div class="task-footer">
          ${statusTag}
          <div class="task-completions">Realizado: ${task.completions}x</div>
        </div>
      `;
      grid.appendChild(card);
    }
  }
}
