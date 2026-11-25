/**
 * Defensa Orbital AR — Lógica de juego y componentes personalizados A-Frame (ES6+)
 */

const STORAGE_KEY = 'defensa_orbital_ar_highscore';
const STATION_CENTER = { x: 0, y: 1.6, z: 0 };
const FUSE_DURATION_MS = 900;

/**
 * Motor de audio procedural basado en Web Audio API (sin archivos externos).
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted) {
    this.muted = muted;
  }

  playLaser(isCharged = false) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isCharged ? 'sawtooth' : 'triangle';
    const startFreq = isCharged ? 1280 : 980;
    const endFreq = isCharged ? 160 : 210;
    const duration = isCharged ? 0.22 : 0.14;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    gain.gain.setValueAtTime(isCharged ? 0.22 : 0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  playExplosion(isBig = false) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = isBig ? 0.45 : 0.3;

    // Ruido filtrado para estallido espacial
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isBig ? 950 : 750, now);
    filter.frequency.exponentialRampToValueAtTime(90, now + duration);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(isBig ? 0.28 : 0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(now);

    // Sub-grave de impacto
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(isBig ? 140 : 110, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + duration);
    subGain.gain.setValueAtTime(0.24, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + duration);
  }

  playShieldRecharge() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.055;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.13, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.19);
    });
  }

  playDamageAlert() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [0, 0.13].forEach((offset) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + offset;
      osc.type = 'square';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.setValueAtTime(165, t + 0.06);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    });
  }

  playWaveStart() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.28);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }
}

const soundEngine = new SoundEngine();

function triggerHaptic(ms = 40) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(ms);
    } catch (_) {
      // Ignorar si el navegador bloquea vibración sin gesto previo
    }
  }
}

function safeRemoveEntity(el) {
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
}

function disableChildRaycast(el) {
  const apply = () => {
    if (el.object3D) {
      el.object3D.traverse((obj) => {
        if (obj.isMesh) {
          obj.raycast = () => {};
        }
      });
    }
  };
  if (el.hasLoaded) {
    apply();
  } else {
    el.addEventListener('loaded', apply, { once: true });
  }
}

/**
 * Componente 1: Campo de estrellas procedural 3D para el entorno espacial.
 */
AFRAME.registerComponent('starfield', {
  schema: {
    count: { type: 'int', default: 260 },
    radius: { type: 'number', default: 75 }
  },

  init() {
    const THREE = AFRAME.THREE;
    const { count, radius } = this.data;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const palette = [
      new THREE.Color('#ffffff'),
      new THREE.Color('#8be9ff'),
      new THREE.Color('#b6d4ff'),
      new THREE.Color('#ffd99b')
    ];

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = radius * (0.65 + Math.random() * 0.35);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const col = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.45,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(geometry, material);
    this.el.setObject3D('mesh', this.points);
  },

  remove() {
    if (this.points) {
      this.points.geometry.dispose();
      this.points.material.dispose();
      this.el.removeObject3D('mesh');
    }
  }
});

/**
 * Componente 2: Feedback visual del cursor virtual (escala, color cian -> rojo y progreso fuse).
 */
AFRAME.registerComponent('reticle-feedback', {
  init() {
    this.ringEl = document.getElementById('reticle-ring');
    this.fuseRingEl = document.getElementById('reticle-fuse-ring');
    this.dotEl = document.getElementById('reticle-dot');
    this.lockIndicatorEl = document.getElementById('lock-indicator');
    this.mobileFireBtn = document.getElementById('mobile-fire-btn');

    this.isFusing = false;
    this.fuseStartTime = 0;
    this.currentTarget = null;

    this.onMouseEnter = this.onMouseEnter.bind(this);
    this.onFusing = this.onFusing.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);

    this.el.addEventListener('mouseenter', this.onMouseEnter);
    this.el.addEventListener('fusing', this.onFusing);
    this.el.addEventListener('mouseleave', this.onMouseLeave);
  },

  remove() {
    this.el.removeEventListener('mouseenter', this.onMouseEnter);
    this.el.removeEventListener('fusing', this.onFusing);
    this.el.removeEventListener('mouseleave', this.onMouseLeave);
  },

  resolveTarget(evt) {
    const raw = evt.detail && evt.detail.intersectedEl;
    if (!raw) return null;
    return raw.classList.contains('target') ? raw : raw.closest('.target');
  },

  onMouseEnter(evt) {
    const target = this.resolveTarget(evt);
    if (!target) return;
    this.currentTarget = target;
    this.setLockedAppearance(true, target.dataset.enemyType === 'capsule');
  },

  onFusing(evt) {
    const target = this.resolveTarget(evt);
    if (!target) return;
    this.currentTarget = target;
    this.isFusing = true;
    this.fuseStartTime = performance.now();
    this.setLockedAppearance(true, target.dataset.enemyType === 'capsule');
  },

  onMouseLeave() {
    this.resetAppearance();
  },

  setLockedAppearance(locked, isCapsule = false) {
    const activeColor = locked ? (isCapsule ? '#00ff88' : '#ff2a55') : '#00f0ff';
    const scale = locked ? '1.38 1.38 1.38' : '1 1 1';

    if (this.ringEl) {
      this.ringEl.setAttribute('color', activeColor);
      this.ringEl.setAttribute('scale', scale);
    }
    if (this.dotEl) {
      this.dotEl.setAttribute('color', activeColor);
    }
    if (this.fuseRingEl) {
      this.fuseRingEl.setAttribute('color', activeColor);
    }
    if (this.mobileFireBtn) {
      this.mobileFireBtn.classList.toggle('target-locked', locked);
    }
    if (this.lockIndicatorEl) {
      if (locked) {
        this.lockIndicatorEl.textContent = isCapsule
          ? 'CÁPSULA DE ENERGÍA // FIJANDO...'
          : 'OBJETIVO FIJADO // CARGANDO LÁSER';
        this.lockIndicatorEl.classList.toggle('bonus-lock', isCapsule);
        this.lockIndicatorEl.classList.remove('hidden');
      } else {
        this.lockIndicatorEl.classList.add('hidden');
      }
    }
  },

  resetAppearance() {
    this.isFusing = false;
    this.fuseStartTime = 0;
    this.currentTarget = null;
    if (this.fuseRingEl) {
      this.fuseRingEl.setAttribute('theta-length', 0);
    }
    this.setLockedAppearance(false);
  },

  tick() {
    if (!this.isFusing) return;
    if (!this.currentTarget || !this.currentTarget.parentNode) {
      this.resetAppearance();
      return;
    }

    const elapsed = performance.now() - this.fuseStartTime;
    const progress = Math.min(1, elapsed / FUSE_DURATION_MS);
    if (this.fuseRingEl) {
      this.fuseRingEl.setAttribute('theta-length', progress * 360);
    }
  }
});

/**
 * Componente 3: Meteoritos (dodecaedros rotatorios que avanzan hacia la estación).
 */
AFRAME.registerComponent('meteorite', {
  schema: {
    speed: { type: 'number', default: 3.2 },
    radius: { type: 'number', default: 1.05 }
  },

  init() {
    const THREE = AFRAME.THREE;
    this.hp = 1;
    this.destroyed = false;
    this.rotSpeed = new THREE.Vector3(
      (Math.random() - 0.5) * 2.2,
      (Math.random() - 0.5) * 2.2,
      (Math.random() - 0.5) * 2.2
    );

    this.el.classList.add('target');
    this.el.dataset.enemyType = 'meteorite';
    this.el.setAttribute('geometry', {
      primitive: 'dodecahedron',
      radius: this.data.radius,
      detail: 0
    });
    this.el.setAttribute('material', {
      color: '#9c4221',
      emissive: '#ff4500',
      emissiveIntensity: 0.28,
      roughness: 0.78,
      metalness: 0.25,
      flatShading: true
    });

    this.targetPos = new THREE.Vector3(STATION_CENTER.x, STATION_CENTER.y, STATION_CENTER.z);
    this.direction = new THREE.Vector3();
  },

  applyDamage(amount, hitPoint) {
    if (this.destroyed) return false;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.destroyed = true;
      this.el.sceneEl.emit('enemy-destroyed', {
        type: 'meteorite',
        points: 100,
        position: hitPoint || this.el.object3D.position.clone(),
        color: '#ff6b2b',
        el: this.el
      });
      safeRemoveEntity(this.el);
      return true;
    }
    return false;
  },

  tick(time, delta) {
    if (this.destroyed || !delta) return;
    const dt = Math.min(delta / 1000, 0.1);
    const pos = this.el.object3D.position;
    const rot = this.el.object3D.rotation;

    rot.x += this.rotSpeed.x * dt;
    rot.y += this.rotSpeed.y * dt;
    rot.z += this.rotSpeed.z * dt;

    this.direction.subVectors(this.targetPos, pos);
    const dist = this.direction.length();

    if (dist < 2.15) {
      this.destroyed = true;
      this.el.sceneEl.emit('station-hit', {
        damage: 15,
        position: pos.clone(),
        color: '#ff4500',
        el: this.el
      });
      safeRemoveEntity(this.el);
      return;
    }

    this.direction.normalize();
    pos.addScaledVector(this.direction, this.data.speed * dt);
  }
});

/**
 * Componente 4: Drones Invasores (núcleo + anillo orbital, movimiento en zigzag, 2 HP o 1 disparo cargado).
 */
AFRAME.registerComponent('drone', {
  schema: {
    speed: { type: 'number', default: 3.6 },
    zigAmplitude: { type: 'number', default: 3.4 },
    zigFrequency: { type: 'number', default: 2.6 }
  },

  init() {
    const THREE = AFRAME.THREE;
    this.hp = 2;
    this.destroyed = false;
    this.phase = Math.random() * Math.PI * 2;
    this.age = 0;

    this.el.classList.add('target');
    this.el.dataset.enemyType = 'drone';

    // Hitbox y núcleo esférico brillante en la entidad principal
    this.el.setAttribute('geometry', {
      primitive: 'sphere',
      radius: 0.72
    });
    this.el.setAttribute('material', {
      color: '#ff1e56',
      emissive: '#ff2a55',
      emissiveIntensity: 0.75,
      roughness: 0.2,
      metalness: 0.6
    });

    // Anillo orbital externo (decorativo, sin bloquear raycast de la entidad padre)
    this.orbitalRing = document.createElement('a-torus');
    this.orbitalRing.setAttribute('radius', '1.15');
    this.orbitalRing.setAttribute('radius-tubular', '0.075');
    this.orbitalRing.setAttribute('color', '#00f0ff');
    this.orbitalRing.setAttribute('material', 'emissive: #00f0ff; emissiveIntensity: 0.85; metalness: 0.7');
    this.orbitalRing.setAttribute('rotation', '65 20 0');
    disableChildRaycast(this.orbitalRing);
    this.el.appendChild(this.orbitalRing);

    // Segundo aro energético cruzado
    this.innerRing = document.createElement('a-torus');
    this.innerRing.setAttribute('radius', '0.92');
    this.innerRing.setAttribute('radius-tubular', '0.045');
    this.innerRing.setAttribute('color', '#ff88a8');
    this.innerRing.setAttribute('material', 'emissive: #ff2a55; emissiveIntensity: 0.65');
    this.innerRing.setAttribute('rotation', '-45 55 0');
    disableChildRaycast(this.innerRing);
    this.el.appendChild(this.innerRing);

    this.targetPos = new THREE.Vector3(STATION_CENTER.x, STATION_CENTER.y, STATION_CENTER.z);
    this.basePos = this.el.object3D.position.clone();
    this.toCenter = new THREE.Vector3();
    this.sideAxis = new THREE.Vector3();
    this.upAxis = new THREE.Vector3(0, 1, 0);
  },

  applyDamage(amount, hitPoint) {
    if (this.destroyed) return false;
    this.hp -= amount;

    if (this.hp <= 0) {
      this.destroyed = true;
      this.el.sceneEl.emit('enemy-destroyed', {
        type: 'drone',
        points: 250,
        position: hitPoint || this.el.object3D.position.clone(),
        color: '#ff2a55',
        el: this.el
      });
      safeRemoveEntity(this.el);
      return true;
    }

    // Primer impacto: feedback visual de daño (cambia color a ámbar y acelera)
    this.el.setAttribute('material', 'color', '#ffaa00');
    this.el.setAttribute('material', 'emissive', '#ffaa00');
    this.el.setAttribute('material', 'emissiveIntensity', 0.95);
    this.data.speed *= 1.18;

    this.el.sceneEl.emit('enemy-damaged', {
      position: hitPoint || this.el.object3D.position.clone(),
      color: '#ffd166'
    });
    return false;
  },

  tick(time, delta) {
    if (this.destroyed || !delta) return;
    const dt = Math.min(delta / 1000, 0.1);
    this.age += dt;

    // Rotación de los anillos orbitales
    if (this.orbitalRing && this.orbitalRing.object3D) {
      this.orbitalRing.object3D.rotation.x += 2.6 * dt;
      this.orbitalRing.object3D.rotation.y += 3.2 * dt;
    }
    if (this.innerRing && this.innerRing.object3D) {
      this.innerRing.object3D.rotation.z -= 3.4 * dt;
    }

    // Avance de la posición base hacia el centro
    this.toCenter.subVectors(this.targetPos, this.basePos);
    const dist = this.toCenter.length();

    if (dist < 2.2) {
      this.destroyed = true;
      this.el.sceneEl.emit('station-hit', {
        damage: 25,
        position: this.el.object3D.position.clone(),
        color: '#ff2a55',
        el: this.el
      });
      safeRemoveEntity(this.el);
      return;
    }

    this.toCenter.normalize();
    this.basePos.addScaledVector(this.toCenter, this.data.speed * dt);

    // Eje perpendicular para el zigzag (se atenúa cerca de la estación)
    this.sideAxis.crossVectors(this.toCenter, this.upAxis).normalize();
    if (this.sideAxis.lengthSq() < 0.001) {
      this.sideAxis.set(1, 0, 0);
    }

    const damping = Math.min(1, Math.max(0, (dist - 2.5) / 6));
    const lateralOffset = Math.sin(this.age * this.data.zigFrequency + this.phase) * this.data.zigAmplitude * damping;
    const verticalOffset = Math.cos(this.age * (this.data.zigFrequency * 0.8) + this.phase) * (this.data.zigAmplitude * 0.45) * damping;

    const pos = this.el.object3D.position;
    pos.copy(this.basePos);
    pos.addScaledVector(this.sideAxis, lateralOffset);
    pos.y += verticalOffset;
  }
});

/**
 * Componente 5: Cápsulas de Energía Bonus (+20% escudo al ser apuntadas/disparadas).
 */
AFRAME.registerComponent('energy-capsule', {
  schema: {
    lifetime: { type: 'number', default: 15 }
  },

  init() {
    const THREE = AFRAME.THREE;
    this.collected = false;
    this.age = 0;
    this.orbitSpeed = (Math.random() > 0.5 ? 1 : -1) * 0.28;

    this.el.classList.add('target');
    this.el.dataset.enemyType = 'capsule';

    this.el.setAttribute('geometry', {
      primitive: 'sphere',
      radius: 0.72
    });
    this.el.setAttribute('material', {
      color: '#00ff88',
      emissive: '#00ff88',
      emissiveIntensity: 0.85,
      roughness: 0.15,
      metalness: 0.35
    });

    // Aro dorado exterior decorativo
    this.goldHalo = document.createElement('a-torus');
    this.goldHalo.setAttribute('radius', '1.05');
    this.goldHalo.setAttribute('radius-tubular', '0.06');
    this.goldHalo.setAttribute('color', '#ffd166');
    this.goldHalo.setAttribute('material', 'emissive: #ffd166; emissiveIntensity: 0.9');
    disableChildRaycast(this.goldHalo);
    this.el.appendChild(this.goldHalo);

    this.center = new THREE.Vector3(STATION_CENTER.x, STATION_CENTER.y, STATION_CENTER.z);
    this.offset = new THREE.Vector3();
  },

  applyDamage(_amount, hitPoint) {
    if (this.collected) return false;
    this.collected = true;
    this.el.sceneEl.emit('capsule-collected', {
      heal: 20,
      points: 50,
      position: hitPoint || this.el.object3D.position.clone(),
      color: '#00ff88',
      el: this.el
    });
    safeRemoveEntity(this.el);
    return true;
  },

  tick(time, delta) {
    if (this.collected || !delta) return;
    const dt = Math.min(delta / 1000, 0.1);
    this.age += dt;

    if (this.age >= this.data.lifetime) {
      this.collected = true;
      safeRemoveEntity(this.el);
      return;
    }

    const pos = this.el.object3D.position;
    this.offset.subVectors(pos, this.center);
    this.offset.applyAxisAngle(new AFRAME.THREE.Vector3(0, 1, 0), this.orbitSpeed * dt);
    pos.copy(this.center).add(this.offset);
    pos.y += Math.sin(this.age * 3.2) * 0.018;

    if (this.goldHalo && this.goldHalo.object3D) {
      this.goldHalo.object3D.rotation.x += 2.2 * dt;
      this.goldHalo.object3D.rotation.y += 2.8 * dt;
    }
  }
});

/**
 * Componente 6: Partícula de explosión 3D con auto-eliminación garantizada del DOM.
 */
AFRAME.registerComponent('debris-particle', {
  schema: {
    vx: { type: 'number', default: 0 },
    vy: { type: 'number', default: 0 },
    vz: { type: 'number', default: 0 },
    color: { type: 'color', default: '#ff6b2b' },
    life: { type: 'number', default: 0.62 }
  },

  init() {
    this.elapsed = 0;
    this.initialScale = 0.14 + Math.random() * 0.14;
    this.el.setAttribute('geometry', {
      primitive: 'tetrahedron',
      radius: 1
    });
    this.el.setAttribute('material', {
      color: this.data.color,
      emissive: this.data.color,
      emissiveIntensity: 0.85,
      shader: 'flat',
      transparent: true,
      opacity: 1
    });
    this.el.setAttribute('scale', `${this.initialScale} ${this.initialScale} ${this.initialScale}`);
  },

  tick(time, delta) {
    if (!delta) return;
    const dt = Math.min(delta / 1000, 0.1);
    this.elapsed += dt;

    const t = this.elapsed / this.data.life;
    if (t >= 1) {
      safeRemoveEntity(this.el);
      return;
    }

    const pos = this.el.object3D.position;
    pos.x += this.data.vx * dt;
    pos.y += this.data.vy * dt;
    pos.z += this.data.vz * dt;

    this.el.object3D.rotation.x += 6 * dt;
    this.el.object3D.rotation.y += 5 * dt;

    const scale = Math.max(0.001, this.initialScale * (1 - t));
    this.el.object3D.scale.set(scale, scale, scale);

    const mesh = this.el.getObject3D('mesh');
    if (mesh && mesh.material) {
      mesh.material.opacity = 1 - t;
    }
  }
});

/**
 * Componente Principal: Orquestador del juego, oleadas, raycaster dual, láser, AR y persistencia.
 */
AFRAME.registerComponent('game-manager', {
  init() {
    this.state = 'menu'; // 'menu' | 'playing' | 'gameover'
    this.score = 0;
    this.shield = 100;
    this.wave = 1;
    this.waveKills = 0;
    this.waveTarget = 6;
    this.highScore = this.loadHighScore();

    this.spawnTimer = 0;
    this.capsuleTimer = 0;
    this.lastManualFireTime = 0;
    this.lastLaserTime = 0;

    // Referencias de escena
    this.spaceEnvEl = document.getElementById('space-environment');
    this.enemiesContainer = document.getElementById('enemies-container');
    this.fxContainer = document.getElementById('fx-container');
    this.cameraEl = document.getElementById('player-camera');
    this.reticleEl = document.getElementById('reticle');

    // Referencias HUD
    this.hudEl = document.getElementById('hud');
    this.topHudEl = document.getElementById('top-hud');
    this.startScreenEl = document.getElementById('start-screen');
    this.gameoverScreenEl = document.getElementById('gameover-screen');
    this.mobileFireBtn = document.getElementById('mobile-fire-btn');
    this.waveBannerEl = document.getElementById('wave-banner');
    this.damageFlashEl = document.getElementById('damage-flash');
    this.healFlashEl = document.getElementById('heal-flash');

    this.scoreValueEl = document.getElementById('score-value');
    this.hudHighScoreEl = document.getElementById('hud-high-score');
    this.shieldValueEl = document.getElementById('shield-value');
    this.shieldBarEl = document.getElementById('shield-bar');
    this.waveValueEl = document.getElementById('wave-value');

    this.startHighScoreEl = document.getElementById('start-high-score');
    this.finalScoreEl = document.getElementById('final-score');
    this.finalWaveEl = document.getElementById('final-wave');
    this.gameoverHighScoreEl = document.getElementById('gameover-high-score');
    this.newRecordBadgeEl = document.getElementById('new-record-badge');

    this.startBtn = document.getElementById('start-btn');
    this.startArBtn = document.getElementById('start-ar-btn');
    this.hudArBtn = document.getElementById('hud-ar-btn');
    this.restartBtn = document.getElementById('restart-btn');
    this.muteBtn = document.getElementById('mute-btn');
    this.toggleTouchBtn = document.getElementById('toggle-touch-btn');
    this.alwaysShowFireChk = document.getElementById('always-show-fire-chk');

    this.bindEvents();
    this.checkARSupport();
    this.syncHUD();
  },

  loadHighScore() {
    try {
      const saved = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
      return Number.isFinite(saved) && saved > 0 ? saved : 0;
    } catch (_) {
      return 0;
    }
  },

  saveHighScore(value) {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch (_) {
      // Ignorar si almacenamiento no disponible
    }
  },

  checkARSupport() {
    if (navigator.xr && typeof navigator.xr.isSessionSupported === 'function') {
      navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
        if (supported) {
          this.startArBtn?.classList.remove('hidden');
          this.hudArBtn?.classList.remove('hidden');
        }
      }).catch(() => {});
    }
  },

  bindEvents() {
    // Evitar que los botones del HUD disparen eventos XR select en WebAR dom-overlay
    document.querySelectorAll('.hud-interactive').forEach((el) => {
      el.addEventListener('beforexrselect', (evt) => evt.preventDefault());
    });

    // Ocultar entorno espacial al entrar en modo AR y restaurar al salir
    this.el.addEventListener('enter-vr', () => {
      const isAR = this.el.is('ar-mode');
      if (isAR && this.spaceEnvEl) {
        this.spaceEnvEl.setAttribute('visible', false);
        if (this.el.object3D) {
          this.el.object3D.background = null;
        }
      }
      if (this.hudArBtn) {
        this.hudArBtn.classList.add('hidden');
      }
    });

    this.el.addEventListener('exit-vr', () => {
      if (this.spaceEnvEl) {
        this.spaceEnvEl.setAttribute('visible', true);
      }
      this.checkARSupport();
    });

    // Botones de menú y reinicio
    this.startBtn?.addEventListener('click', () => {
      soundEngine.init();
      this.startGame();
    });

    this.startArBtn?.addEventListener('click', async () => {
      soundEngine.init();
      this.startGame();
      try {
        await this.el.enterAR();
      } catch (_) {
        // Si el navegador cancela o falla AR, el juego continúa en modo 360°
      }
    });

    this.hudArBtn?.addEventListener('click', async () => {
      try {
        await this.el.enterAR();
      } catch (_) {}
    });

    this.restartBtn?.addEventListener('click', () => {
      soundEngine.init();
      this.startGame();
    });

    this.muteBtn?.addEventListener('click', () => {
      const nextMuted = !soundEngine.muted;
      soundEngine.setMuted(nextMuted);
      this.muteBtn.textContent = nextMuted ? '🔇' : '🔊';
    });

    const setForceTouch = (enabled) => {
      this.hudEl?.classList.toggle('force-show-touch', enabled);
      this.toggleTouchBtn?.classList.toggle('active', enabled);
      if (this.alwaysShowFireChk) {
        this.alwaysShowFireChk.checked = enabled;
      }
    };

    this.alwaysShowFireChk?.addEventListener('change', (e) => {
      setForceTouch(e.target.checked);
    });

    this.toggleTouchBtn?.addEventListener('click', () => {
      const current = this.hudEl?.classList.contains('force-show-touch');
      setForceTouch(!current);
    });

    // Disparo táctil instantáneo desde #mobile-fire-btn
    const onTouchFire = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      if (this.state !== 'playing') return;
      this.lastManualFireTime = performance.now();
      this.fireShot(false);
    };
    this.mobileFireBtn?.addEventListener('pointerdown', onTouchFire);

    // Disparo instantáneo con clic de mouse o toque en el lienzo (sin confundir con arrastre de cámara)
    let downX = 0;
    let downY = 0;
    const attachCanvasListeners = () => {
      const canvas = this.el.canvas;
      if (!canvas) return;
      canvas.addEventListener('pointerdown', (e) => {
        downX = e.clientX;
        downY = e.clientY;
      });
      canvas.addEventListener('pointerup', (e) => {
        if (this.state !== 'playing') return;
        const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
        if (moved < 10) {
          this.lastManualFireTime = performance.now();
          this.fireShot(false);
        }
      });
    };
    if (this.el.canvas) {
      attachCanvasListeners();
    } else {
      this.el.addEventListener('renderstart', attachCanvasListeners, { once: true });
    }

    // Disparo automático por fijación (fuse 0.9s) desde el cursor de A-Frame
    this.reticleEl?.addEventListener('click', () => {
      if (this.state !== 'playing') return;
      // Evita doble disparo si acaba de ocurrir un clic/toque manual
      if (performance.now() - this.lastManualFireTime < 260) return;

      const feedback = this.reticleEl.components['reticle-feedback'];
      const isChargedFuse = Boolean(
        feedback &&
        feedback.isFusing &&
        performance.now() - feedback.fuseStartTime >= FUSE_DURATION_MS - 120
      );

      this.fireShot(isChargedFuse);
      feedback?.resetAppearance();
    });

    // Eventos de combate emitidos por enemigos y cápsulas
    this.el.addEventListener('enemy-destroyed', (evt) => {
      if (this.state !== 'playing') return;
      const { type, points, position, color } = evt.detail;
      this.score += points;
      this.waveKills += 1;
      soundEngine.playExplosion(type === 'drone');
      this.spawnExplosion(position, color, type === 'drone' ? 16 : 11);

      if (this.waveKills >= this.waveTarget) {
        this.advanceWave();
      }
      this.syncHUD();
    });

    this.el.addEventListener('enemy-damaged', (evt) => {
      if (this.state !== 'playing') return;
      const { position, color } = evt.detail;
      soundEngine.playExplosion(false);
      this.spawnExplosion(position, color, 6);
    });

    this.el.addEventListener('capsule-collected', (evt) => {
      if (this.state !== 'playing') return;
      const { heal, points, position, color } = evt.detail;
      this.shield = Math.min(100, this.shield + heal);
      this.score += points;
      soundEngine.playShieldRecharge();
      this.spawnExplosion(position, color, 14);
      this.triggerScreenFlash(this.healFlashEl);
      this.syncHUD();
    });

    this.el.addEventListener('station-hit', (evt) => {
      if (this.state !== 'playing') return;
      const { damage, position, color } = evt.detail;
      this.shield = Math.max(0, this.shield - damage);
      soundEngine.playDamageAlert();
      triggerHaptic(40);
      this.spawnExplosion(position, color, 12);
      this.triggerScreenFlash(this.damageFlashEl);
      this.syncHUD();

      if (this.shield <= 0) {
        this.endGame();
      }
    });
  },

  startGame() {
    this.clearDynamicEntities();
    this.score = 0;
    this.shield = 100;
    this.wave = 1;
    this.waveKills = 0;
    this.waveTarget = 6;
    this.spawnTimer = 0.6;
    this.capsuleTimer = 11;
    this.state = 'playing';

    this.startScreenEl?.classList.add('hidden');
    this.gameoverScreenEl?.classList.add('hidden');
    this.newRecordBadgeEl?.classList.add('hidden');
    this.topHudEl?.classList.remove('hidden');
    this.mobileFireBtn?.classList.remove('hidden');
    this.reticleEl?.components['reticle-feedback']?.resetAppearance();

    this.syncHUD();
    this.showWaveBanner(`OLEADA ${this.wave}`);
    soundEngine.playWaveStart();

    // Lanzar amenaza inicial inmediata para acción instantánea
    this.spawnThreat();
  },

  endGame() {
    this.state = 'gameover';
    this.clearDynamicEntities();
    this.reticleEl?.components['reticle-feedback']?.resetAppearance();

    let isNewRecord = false;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore(this.highScore);
      isNewRecord = true;
    }

    this.topHudEl?.classList.add('hidden');
    this.mobileFireBtn?.classList.add('hidden');
    document.getElementById('lock-indicator')?.classList.add('hidden');

    if (this.finalScoreEl) this.finalScoreEl.textContent = String(this.score);
    if (this.finalWaveEl) this.finalWaveEl.textContent = String(this.wave);
    if (this.gameoverHighScoreEl) this.gameoverHighScoreEl.textContent = String(this.highScore);
    if (this.newRecordBadgeEl) {
      this.newRecordBadgeEl.classList.toggle('hidden', !isNewRecord);
    }

    this.syncHUD();
    this.gameoverScreenEl?.classList.remove('hidden');
  },

  clearDynamicEntities() {
    while (this.enemiesContainer && this.enemiesContainer.firstChild) {
      this.enemiesContainer.removeChild(this.enemiesContainer.firstChild);
    }
    while (this.fxContainer && this.fxContainer.firstChild) {
      this.fxContainer.removeChild(this.fxContainer.firstChild);
    }
  },

  advanceWave() {
    this.wave += 1;
    this.waveKills = 0;
    this.waveTarget = 6 + this.wave * 2;
    soundEngine.playWaveStart();
    this.showWaveBanner(`OLEADA ${this.wave}`);
  },

  showWaveBanner(text) {
    if (!this.waveBannerEl) return;
    this.waveBannerEl.textContent = text;
    this.waveBannerEl.classList.remove('hidden');
    clearTimeout(this.bannerTimeout);
    this.bannerTimeout = setTimeout(() => {
      this.waveBannerEl?.classList.add('hidden');
    }, 1800);
  },

  triggerScreenFlash(el) {
    if (!el) return;
    el.classList.add('active');
    setTimeout(() => el.classList.remove('active'), 190);
  },

  syncHUD() {
    if (this.scoreValueEl) this.scoreValueEl.textContent = String(this.score);
    if (this.hudHighScoreEl) this.hudHighScoreEl.textContent = String(Math.max(this.score, this.highScore));
    if (this.startHighScoreEl) this.startHighScoreEl.textContent = String(this.highScore);
    if (this.waveValueEl) this.waveValueEl.textContent = String(this.wave);
    if (this.shieldValueEl) this.shieldValueEl.textContent = `${this.shield}%`;

    if (this.shieldBarEl) {
      this.shieldBarEl.style.width = `${this.shield}%`;
      this.shieldBarEl.classList.toggle('warning', this.shield <= 55 && this.shield > 25);
      this.shieldBarEl.classList.toggle('critical', this.shield <= 25);
    }
  },

  /**
   * Dispara un rayo láser usando el raycaster del cursor virtual.
   * @param {boolean} isCharged - true cuando proviene de fijación (fuse 0.9s), false en disparo instantáneo.
   */
  fireShot(isCharged = false) {
    const now = performance.now();
    if (now - this.lastLaserTime < 90) return;
    this.lastLaserTime = now;

    soundEngine.playLaser(isCharged);
    triggerHaptic(40);

    const THREE = AFRAME.THREE;
    const raycasterComp = this.reticleEl?.components?.raycaster;
    const camObj = this.cameraEl?.object3D;
    if (!camObj) return;

    // Origen del láser ligeramente desplazado bajo la cámara para ser visible en perspectiva 3D
    const startWorld = new THREE.Vector3(0, -0.18, -0.35);
    camObj.localToWorld(startWorld);

    let targetEl = null;
    let endWorld = null;

    if (raycasterComp && raycasterComp.intersectedEls.length > 0) {
      const rawEl = raycasterComp.intersectedEls[0];
      targetEl = rawEl.classList.contains('target') ? rawEl : rawEl.closest('.target');
      const intersection = raycasterComp.getIntersection(rawEl);
      if (intersection && intersection.point) {
        endWorld = intersection.point.clone();
      } else if (targetEl) {
        endWorld = targetEl.object3D.getWorldPosition(new THREE.Vector3());
      }
    }

    if (!endWorld) {
      endWorld = new THREE.Vector3(0, 0, -45);
      camObj.localToWorld(endWorld);
    }

    const laserColor = isCharged ? '#ff2a55' : '#00f0ff';
    this.spawnLaserBeam(startWorld, endWorld, laserColor, isCharged);

    if (targetEl) {
      const damage = isCharged ? 2 : 1;
      const comp = targetEl.components.meteorite || targetEl.components.drone || targetEl.components['energy-capsule'];
      if (comp) {
        comp.applyDamage(damage, endWorld);
      }
    }
  },

  spawnLaserBeam(start, end, color, isCharged) {
    if (!this.fxContainer) return;

    const beam = document.createElement('a-entity');
    beam.setAttribute('line', {
      start: `${start.x} ${start.y} ${start.z}`,
      end: `${end.x} ${end.y} ${end.z}`,
      color,
      opacity: 0.95
    });

    // Pulso secundario para mayor grosor visual
    if (isCharged) {
      beam.setAttribute('line__outer', {
        start: `${start.x + 0.02} ${start.y + 0.02} ${start.z}`,
        end: `${end.x} ${end.y} ${end.z}`,
        color: '#ffffff',
        opacity: 0.8
      });
    }

    // Destello en la punta de impacto
    const impact = document.createElement('a-sphere');
    impact.setAttribute('position', `${end.x} ${end.y} ${end.z}`);
    impact.setAttribute('radius', isCharged ? '0.26' : '0.16');
    impact.setAttribute('color', color);
    impact.setAttribute('material', 'shader: flat; transparent: true; opacity: 0.9');

    this.fxContainer.appendChild(beam);
    this.fxContainer.appendChild(impact);

    setTimeout(() => {
      safeRemoveEntity(beam);
      safeRemoveEntity(impact);
    }, isCharged ? 180 : 120);
  },

  spawnExplosion(position, color = '#ff6b2b', count = 12) {
    if (!this.fxContainer || !position) return;

    for (let i = 0; i < count; i++) {
      const p = document.createElement('a-entity');
      p.setAttribute('position', `${position.x} ${position.y} ${position.z}`);

      const speed = 2.4 + Math.random() * 5.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const vx = speed * Math.sin(phi) * Math.cos(theta);
      const vy = speed * Math.cos(phi);
      const vz = speed * Math.sin(phi) * Math.sin(theta);

      p.setAttribute('debris-particle', {
        vx,
        vy,
        vz,
        color,
        life: 0.48 + Math.random() * 0.28
      });

      this.fxContainer.appendChild(p);
    }
  },

  getRandomSpawnPosition(minRadius = 25, maxRadius = 34) {
    const radius = minRadius + Math.random() * (maxRadius - minRadius);
    const azimuth = Math.random() * Math.PI * 2; // 360 grados alrededor del jugador
    const elevation = (-12 + Math.random() * 54) * (Math.PI / 180); // Distintas alturas cómodas

    const x = STATION_CENTER.x + radius * Math.cos(elevation) * Math.cos(azimuth);
    const y = STATION_CENTER.y + radius * Math.sin(elevation);
    const z = STATION_CENTER.z + radius * Math.cos(elevation) * Math.sin(azimuth);

    return { x, y: Math.max(0.7, y), z };
  },

  spawnThreat() {
    if (!this.enemiesContainer) return;

    // Limitar entidades activas simultáneas para mantener 60 FPS fluidos en móviles
    if (this.enemiesContainer.children.length >= 16) return;

    const pos = this.getRandomSpawnPosition(25, 34);
    const droneChance = this.wave === 1 ? 0.2 : Math.min(0.55, 0.22 + (this.wave - 1) * 0.08);
    const isDrone = Math.random() < droneChance;

    const entity = document.createElement('a-entity');
    entity.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);

    if (isDrone) {
      entity.setAttribute('drone', {
        speed: 3.1 + Math.min(3.2, (this.wave - 1) * 0.42),
        zigAmplitude: 2.6 + Math.min(2.2, (this.wave - 1) * 0.25),
        zigFrequency: 2.2 + Math.random() * 0.9
      });
    } else {
      entity.setAttribute('meteorite', {
        speed: 2.8 + Math.min(3.5, (this.wave - 1) * 0.45) + Math.random() * 0.6,
        radius: 0.95 + Math.random() * 0.45
      });
    }

    this.enemiesContainer.appendChild(entity);
  },

  spawnEnergyCapsule() {
    if (!this.enemiesContainer) return;
    const pos = this.getRandomSpawnPosition(13, 19);
    const capsule = document.createElement('a-entity');
    capsule.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
    capsule.setAttribute('energy-capsule', { lifetime: 14 });
    this.enemiesContainer.appendChild(capsule);
  },

  tick(time, delta) {
    if (this.state !== 'playing' || !delta) return;
    const dt = Math.min(delta / 1000, 0.1);

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnThreat();
      const baseInterval = Math.max(0.75, 2.35 - (this.wave - 1) * 0.2);
      this.spawnTimer = baseInterval * (0.8 + Math.random() * 0.45);
    }

    this.capsuleTimer -= dt;
    if (this.capsuleTimer <= 0) {
      if (this.shield < 100 || Math.random() < 0.45) {
        this.spawnEnergyCapsule();
      }
      this.capsuleTimer = 14 + Math.random() * 7;
    }
  }
});
