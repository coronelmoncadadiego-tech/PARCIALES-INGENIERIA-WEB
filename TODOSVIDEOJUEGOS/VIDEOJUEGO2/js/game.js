/**
 * GAME.JS - Bucle Principal, Desgaste Rápido de Lucidez, Batería de Linterna y Tableta
 */

class GameEngine {
  constructor() {
    this.state = 'MENU';

    // Medidor de Lucidez (decae más rápido según petición del usuario)
    this.lucidity = 100;
    this.baseDecayRate = 0.72; // % por segundo (desgaste acelerado y tenso)

    // Batería de Linterna (100% a 0%)
    this.flashlightBattery = 100;
    this.batteryDrainRate = 1.45; // % por segundo encendida
    this.isFlashlightOn = true;

    // Tableta de tareas
    this.isTabletOpen = false;

    // Reloj nocturno: 12:00 AM a 06:00 AM
    this.totalNightDuration = 300; // 5 minutos de supervivencia
    this.elapsedSeconds = 0;

    // ECG Canvas
    this.ecgCanvas = document.getElementById('ecg-canvas');
    this.ecgCtx = this.ecgCanvas ? this.ecgCanvas.getContext('2d') : null;
    this.ecgPoints = [];
    this.ecgStep = 0;

    // Referencias al HUD
    this.lucidityValueEl = document.getElementById('lucidity-value');
    this.lucidityBarEl = document.getElementById('lucidity-bar');
    this.lucidityStatusEl = document.getElementById('lucidity-status');
    this.clockDigitsEl = document.getElementById('clock-digits');
    this.distortionEl = document.querySelector('.sanity-distortion');
    this.warningEl = document.getElementById('hud-warning');
    this.batteryValEl = document.getElementById('battery-val');
    this.batteryBarEl = document.getElementById('battery-bar');
    this.roomBadgeEl = document.getElementById('room-locator');

    // Pantallas
    this.startScreen = document.getElementById('start-screen');
    this.defeatScreen = document.getElementById('defeat-screen');
    this.victoryScreen = document.getElementById('victory-screen');
    this.tabletModal = document.getElementById('tablet-modal');

    // Subsistemas
    this.sceneManager = null;
    this.fpsControls = null;
    this.sleepDemon = null;
    this.minigamesMgr = null;

    this.lastTickSecond = -1;

    this.initECG();
  }

  setDependencies(sceneManager, fpsControls, sleepDemon, minigamesMgr) {
    this.sceneManager = sceneManager;
    this.fpsControls = fpsControls;
    this.sleepDemon = sleepDemon;
    this.minigamesMgr = minigamesMgr;
  }

  start() {
    this.state = 'PLAYING';
    this.lucidity = 100;
    this.flashlightBattery = 100;
    this.elapsedSeconds = 0;
    this.isFlashlightOn = true;

    this.startScreen.classList.add('hidden');
    this.defeatScreen.classList.add('hidden');
    this.victoryScreen.classList.add('hidden');

    if (this.sceneManager) {
      this.sceneManager.setFlashlight(true);
    }

    if (this.fpsControls) {
      this.fpsControls.lock();
    }
  }

  restart() {
    this.start();

    if (this.sleepDemon) {
      this.sleepDemon.group.position.set(0, 0, -9.0);
      this.sleepDemon.adaptationLevel = 0;
      this.sleepDemon.isImmune = false;
    }

    if (this.minigamesMgr && this.minigamesMgr.activeMinigameId) {
      this.minigamesMgr.closeMinigame();
    }

    if (this.isTabletOpen) {
      this.toggleTablet(false);
    }
  }

  toggleFlashlight() {
    if (this.flashlightBattery <= 0) {
      if (typeof showNarrativeToast === 'function') {
        showNarrativeToast('[BATERÍA AGOTADA] Realiza tareas para recargar energía.');
      }
      return;
    }

    this.isFlashlightOn = !this.isFlashlightOn;
    if (this.sceneManager) {
      this.sceneManager.setFlashlight(this.isFlashlightOn);
    }
    if (typeof audioEngine !== 'undefined') {
      audioEngine.playFlashlightClick(this.isFlashlightOn);
    }
  }

  toggleTablet(forceState) {
    this.isTabletOpen = forceState !== undefined ? forceState : !this.isTabletOpen;

    if (this.tabletModal) {
      if (this.isTabletOpen) {
        this.tabletModal.classList.add('active');
        if (this.fpsControls) this.fpsControls.unlock();
        if (this.minigamesMgr) this.minigamesMgr.updateTabletUI();
      } else {
        this.tabletModal.classList.remove('active');
        if (this.fpsControls && !this.minigamesMgr.activeMinigameId) {
          this.fpsControls.lock();
        }
      }
    }

    if (typeof audioEngine !== 'undefined') {
      audioEngine.playTabletBeep();
    }
  }

  addBattery(amount) {
    this.flashlightBattery = Math.min(100, this.flashlightBattery + amount);
    this.updateBatteryHUD();
  }

  restoreLucidity(amount) {
    this.lucidity = Math.max(0, Math.min(100, this.lucidity + amount));
    this.updateHUD();
  }

  update(delta) {
    if (this.state !== 'PLAYING') return;

    // 1. Reloj de juego
    this.elapsedSeconds += delta;
    this.updateNightClock();

    // 2. Desgaste de batería de linterna
    if (this.isFlashlightOn) {
      this.flashlightBattery = Math.max(0, this.flashlightBattery - this.batteryDrainRate * delta);
      if (this.flashlightBattery <= 0) {
        this.isFlashlightOn = false;
        if (this.sceneManager) this.sceneManager.setFlashlight(false);
        if (typeof showNarrativeToast === 'function') {
          showNarrativeToast('[LA LINTERNA SE HA APAGADO] Sin batería.');
        }
      }
    }
    this.updateBatteryHUD();

    // 3. Pérdida acelerada de Lucidez
    let currentDecay = this.baseDecayRate;

    // Si la linterna está apagada en la oscuridad, la lucidez decae 50% más rápido
    if (!this.isFlashlightOn) {
      currentDecay += 0.45;
    }

    // Si el demonio está cerca (< 4.5 metros)
    let isFlashingDemon = false;
    if (this.sleepDemon && this.fpsControls) {
      const distToDemon = this.sleepDemon.group.position.distanceTo(this.fpsControls.camera.position);
      if (distToDemon < 5.0) {
        currentDecay += 1.2; // Pánico agudo
      }

      // Alumbrar al demonio
      isFlashingDemon = this.fpsControls.isFlashingDemon(this.sleepDemon);
      if (isFlashingDemon) {
        this.sleepDemon.shineFlashlightAtDemon(delta);
      }

      // Actualizar IA del demonio
      this.sleepDemon.update(delta, this.fpsControls.camera.position, isFlashingDemon);
    }

    this.lucidity = Math.max(0, this.lucidity - currentDecay * delta);

    // 4. Actualizar audio y entidad
    if (typeof audioEngine !== 'undefined') {
      audioEngine.updateLucidity(this.lucidity);
    }

    // 5. Actualizar localización de habitación en el HUD
    if (this.sceneManager && this.fpsControls && this.roomBadgeEl) {
      const room = this.sceneManager.getCurrentRoom(
        this.fpsControls.camera.position.x,
        this.fpsControls.camera.position.z
      );
      this.roomBadgeEl.innerText = room;
    }

    // 6. Actualizar subsistema de minijuegos
    if (this.minigamesMgr) {
      this.minigamesMgr.update(delta, this.lucidity);
    }

    this.updateHUD();
    this.updateECG(delta);

    // 7. Evaluar fin de partida
    if (this.lucidity <= 0) {
      this.triggerDefeat();
    } else if (this.elapsedSeconds >= this.totalNightDuration) {
      this.triggerVictory();
    }
  }

  updateBatteryHUD() {
    const val = Math.ceil(this.flashlightBattery);
    if (this.batteryValEl) this.batteryValEl.innerText = `${val}%`;
    if (this.batteryBarEl) this.batteryBarEl.style.width = `${this.flashlightBattery}%`;
  }

  updateNightClock() {
    const progress = Math.min(1.0, this.elapsedSeconds / this.totalNightDuration);
    const totalMinutes = Math.floor(progress * 360);
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;

    const displayHour = hour === 0 ? 12 : hour;
    const hourStr = String(displayHour).padStart(2, '0');
    const minStr = String(minute).padStart(2, '0');
    const timeFormatted = `${hourStr}:${minStr} AM`;

    if (this.clockDigitsEl) {
      this.clockDigitsEl.innerText = timeFormatted;
    }

    if (this.sceneManager) {
      const hourProgress = totalMinutes / 720;
      const minuteProgress = minute / 60;
      this.sceneManager.updateWallClock(hourProgress, minuteProgress);
    }

    const currentSec = Math.floor(this.elapsedSeconds);
    if (currentSec !== this.lastTickSecond) {
      this.lastTickSecond = currentSec;
      if (typeof audioEngine !== 'undefined') {
        audioEngine.playClockTick(currentSec % 2 === 0);
      }
    }
  }

  updateHUD() {
    const rounded = Math.ceil(this.lucidity);
    if (this.lucidityValueEl) this.lucidityValueEl.innerText = `${rounded}%`;
    if (this.lucidityBarEl) this.lucidityBarEl.style.width = `${this.lucidity}%`;

    if (this.lucidityStatusEl) {
      if (this.lucidity > 75) {
        this.lucidityStatusEl.innerText = 'ESTADO: ESTABLE';
        this.lucidityStatusEl.style.color = '#55efc4';
      } else if (this.lucidity > 50) {
        this.lucidityStatusEl.innerText = 'ESTADO: SOMNOLIENTO';
        this.lucidityStatusEl.style.color = '#ffeaa7';
      } else if (this.lucidity > 25) {
        this.lucidityStatusEl.innerText = 'ESTADO: ALUCINACIONES';
        this.lucidityStatusEl.style.color = '#fab1a0';
      } else {
        this.lucidityStatusEl.innerText = 'ESTADO: PÁNICO CRÍTICO';
        this.lucidityStatusEl.style.color = '#ff7675';
      }
    }

    if (this.distortionEl) {
      if (this.lucidity < 45) {
        const factor = (45 - this.lucidity) / 45;
        this.distortionEl.style.opacity = `${factor * 0.9}`;
      } else {
        this.distortionEl.style.opacity = '0';
      }
    }

    if (this.warningEl) {
      this.warningEl.style.display = this.lucidity < 30 ? 'block' : 'none';
    }
  }

  initECG() {
    if (!this.ecgCanvas || !this.ecgCtx) return;
    this.ecgCanvas.width = 240;
    this.ecgCanvas.height = 24;
    for (let x = 0; x < this.ecgCanvas.width; x++) {
      this.ecgPoints.push(this.ecgCanvas.height / 2);
    }
  }

  updateECG(delta) {
    if (!this.ecgCtx) return;

    this.ecgStep += delta * 18;
    const h = this.ecgCanvas.height;
    const mid = h / 2;

    let nextY = mid;
    const cycle = this.ecgStep % 10;

    if (this.lucidity > 50) {
      if (cycle > 8.0 && cycle < 8.6) nextY = mid - 8;
      else if (cycle >= 8.6 && cycle < 9.2) nextY = mid + 6;
      else nextY = mid + Math.sin(this.ecgStep * 3) * 1.5;
    } else if (this.lucidity > 15) {
      nextY = mid + (Math.random() - 0.5) * 12;
    } else {
      nextY = mid + (Math.random() - 0.5) * 3;
    }

    this.ecgPoints.shift();
    this.ecgPoints.push(nextY);

    this.ecgCtx.fillStyle = 'rgba(3, 6, 8, 0.45)';
    this.ecgCtx.fillRect(0, 0, this.ecgCanvas.width, h);

    this.ecgCtx.strokeStyle = this.lucidity > 35 ? '#00ff88' : '#ff4757';
    this.ecgCtx.lineWidth = 1.5;
    this.ecgCtx.beginPath();
    for (let x = 0; x < this.ecgPoints.length; x++) {
      if (x === 0) this.ecgCtx.moveTo(x, this.ecgPoints[x]);
      else this.ecgCtx.lineTo(x, this.ecgPoints[x]);
    }
    this.ecgCtx.stroke();
  }

  triggerDefeat() {
    this.state = 'GAMEOVER';
    if (this.fpsControls) this.fpsControls.unlock();
    if (typeof audioEngine !== 'undefined') audioEngine.playHorrorStinger();

    const timeSurvivedEl = document.getElementById('defeat-time-survived');
    if (timeSurvivedEl && this.clockDigitsEl) {
      timeSurvivedEl.innerText = this.clockDigitsEl.innerText;
    }
    this.defeatScreen.classList.remove('hidden');
  }

  triggerVictory() {
    this.state = 'VICTORY';
    if (this.fpsControls) this.fpsControls.unlock();

    if (this.sceneManager) {
      this.sceneManager.ambientLight.color.setHex(0x5e4832);
      this.sceneManager.ambientLight.intensity = 1.0;
    }

    if (typeof audioEngine !== 'undefined') {
      audioEngine.playClockBell();
      audioEngine.playLucidChime();
    }

    const victoryLucidityEl = document.getElementById('victory-final-lucidity');
    if (victoryLucidityEl) {
      victoryLucidityEl.innerText = `${Math.ceil(this.lucidity)}%`;
    }
    this.victoryScreen.classList.remove('hidden');
  }
}
