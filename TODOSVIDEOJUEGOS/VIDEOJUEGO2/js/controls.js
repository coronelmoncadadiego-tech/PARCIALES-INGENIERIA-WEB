/**
 * CONTROLS.JS - Controlador FPS con Linterna, Tableta y Colisiones Multi-Habitación
 */

class FPSController {
  constructor(camera, domElement, sceneManager) {
    this.camera = camera;
    this.domElement = domElement;
    this.sceneManager = sceneManager;

    this.isLocked = false;
    this.isInverted = false;

    this.pitch = 0;
    this.yaw = 0;
    this.eyeHeight = 1.65;

    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.moveSpeed = 3.6; // m/s
    this.damping = 9.5;

    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false
    };

    this.bobTimer = 0;
    this.bobFrequency = 9.0;
    this.bobAmplitude = 0.04;
    this.lastStepTime = 0;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 3.0;
    this.interactableObjects = [];
    this.hoveredInteractive = null;

    // Obstáculos y Paredes de la Casa (Cajas AABB)
    this.houseBounds = {
      minX: -9.6, maxX: 9.6,
      minZ: -11.6, maxZ: 9.6
    };

    this.wallObstacles = [
      // Paredes longitudinales del pasillo con vanos de puerta
      { minX: -2.1, maxX: -1.9, minZ: 7.5, maxZ: 9.8 },
      { minX: -2.1, maxX: -1.9, minZ: 1.0, maxZ: 4.0 },
      { minX: -2.1, maxX: -1.9, minZ: -5.8, maxZ: -3.2 },
      { minX: -2.1, maxX: -1.9, minZ: -11.8, maxZ: -9.5 },

      { minX: 1.9, maxX: 2.1, minZ: 7.5, maxZ: 9.8 },
      { minX: 1.9, maxX: 2.1, minZ: 1.0, maxZ: 4.0 },
      { minX: 1.9, maxX: 2.1, minZ: -5.8, maxZ: -3.2 },
      { minX: 1.9, maxX: 2.1, minZ: -11.8, maxZ: -9.5 },

      // Paredes transversales divisorias
      { minX: -9.8, maxX: -2.0, minZ: 1.4, maxZ: 1.6 },
      { minX: -9.8, maxX: -2.0, minZ: -5.1, maxZ: -4.9 },
      { minX: 2.0, maxX: 9.8, minZ: 1.4, maxZ: 1.6 },
      { minX: 2.0, maxX: 9.8, minZ: -5.1, maxZ: -4.9 }
    ];

    this.bindEvents();
  }

  bindEvents() {
    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;

      const sensitivity = 0.0022;
      const invertFactor = this.isInverted ? -1 : 1;

      const movementX = (e.movementX || 0) * invertFactor;
      const movementY = (e.movementY || 0) * invertFactor;

      this.yaw -= movementX * sensitivity;
      this.pitch -= movementY * sensitivity;

      const maxPitch = Math.PI / 2.15;
      this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

      this.updateCameraRotation();
    });

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  onKeyDown(e) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true;
        break;
      case 'KeyF':
        // Conmutar linterna
        if (typeof gameEngine !== 'undefined' && this.sceneManager) {
          gameEngine.toggleFlashlight();
        }
        break;
      case 'Tab':
        e.preventDefault();
        // Abrir / Cerrar tableta de tareas
        if (typeof gameEngine !== 'undefined') {
          gameEngine.toggleTablet();
        }
        break;
    }
  }

  onKeyUp(e) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
    }
  }

  lock() {
    this.domElement.requestPointerLock();
  }

  unlock() {
    document.exitPointerLock();
  }

  setInverted(state) {
    this.isInverted = state;
  }

  updateCameraRotation() {
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.x = this.pitch;
    euler.y = this.yaw;
    this.camera.quaternion.setFromEuler(euler);
  }

  registerInteractable(object, promptText, actionCallback) {
    object.userData.promptText = promptText;
    object.userData.actionCallback = actionCallback;
    this.interactableObjects.push(object);
  }

  update(delta) {
    if (!this.isLocked) return;

    this.direction.z = Number(this.keys.forward) - Number(this.keys.backward);
    this.direction.x = Number(this.keys.right) - Number(this.keys.left);
    this.direction.normalize();

    this.velocity.x -= this.velocity.x * this.damping * delta;
    this.velocity.z -= this.velocity.z * this.damping * delta;

    if (this.keys.forward || this.keys.backward) {
      this.velocity.z -= this.direction.z * this.moveSpeed * delta * 15;
    }
    if (this.keys.left || this.keys.right) {
      this.velocity.x += this.direction.x * this.moveSpeed * delta * 15;
    }

    const forwardVec = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const rightVec = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const moveStep = new THREE.Vector3();
    moveStep.addScaledVector(forwardVec, -this.velocity.z * delta);
    moveStep.addScaledVector(rightVec, this.velocity.x * delta);

    const newPos = this.camera.position.clone().add(moveStep);
    this.resolveCollisions(newPos);

    const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    if (speed > 0.4) {
      this.bobTimer += delta * this.bobFrequency;
      const bobY = Math.sin(this.bobTimer) * this.bobAmplitude;
      this.camera.position.y = this.eyeHeight + bobY;

      if (Math.sin(this.bobTimer) < -0.92 && performance.now() - this.lastStepTime > 340) {
        if (typeof audioEngine !== 'undefined') audioEngine.playFootstep();
        this.lastStepTime = performance.now();
      }
    } else {
      this.bobTimer = 0;
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, this.eyeHeight, delta * 6);
    }

    this.checkInteraction();
  }

  resolveCollisions(targetPos) {
    const playerRadius = 0.35;

    targetPos.x = Math.max(this.houseBounds.minX + playerRadius, Math.min(this.houseBounds.maxX - playerRadius, targetPos.x));
    targetPos.z = Math.max(this.houseBounds.minZ + playerRadius, Math.min(this.houseBounds.maxZ - playerRadius, targetPos.z));

    for (const obs of this.wallObstacles) {
      if (
        targetPos.x > obs.minX - playerRadius &&
        targetPos.x < obs.maxX + playerRadius &&
        targetPos.z > obs.minZ - playerRadius &&
        targetPos.z < obs.maxZ + playerRadius
      ) {
        const penLeft = Math.abs(targetPos.x - (obs.minX - playerRadius));
        const penRight = Math.abs(targetPos.x - (obs.maxX + playerRadius));
        const penTop = Math.abs(targetPos.z - (obs.minZ - playerRadius));
        const penBottom = Math.abs(targetPos.z - (obs.maxZ + playerRadius));

        const minPen = Math.min(penLeft, penRight, penTop, penBottom);
        if (minPen === penLeft) targetPos.x = obs.minX - playerRadius;
        else if (minPen === penRight) targetPos.x = obs.maxX + playerRadius;
        else if (minPen === penTop) targetPos.z = obs.minZ - playerRadius;
        else targetPos.z = obs.maxZ + playerRadius;
      }
    }

    this.camera.position.x = targetPos.x;
    this.camera.position.z = targetPos.z;
  }

  checkInteraction() {
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactableObjects, true);

    const crosshairEl = document.querySelector('.crosshair-container');
    const promptEl = document.getElementById('interaction-prompt');

    if (intersects.length > 0) {
      let target = intersects[0].object;
      while (target && !target.userData.promptText && target.parent) {
        target = target.parent;
      }

      if (target && target.userData && target.userData.promptText) {
        this.hoveredInteractive = target;
        if (crosshairEl) crosshairEl.classList.add('interactive');
        if (promptEl) {
          promptEl.innerText = target.userData.promptText;
          promptEl.classList.add('visible');
        }
        return;
      }
    }

    this.hoveredInteractive = null;
    if (crosshairEl) crosshairEl.classList.remove('interactive');
    if (promptEl) promptEl.classList.remove('visible');
  }

  triggerInteraction() {
    if (this.hoveredInteractive && this.hoveredInteractive.userData.actionCallback) {
      this.hoveredInteractive.userData.actionCallback();
    }
  }

  /**
   * Determina si la linterna encendida está alumbrando al demonio
   */
  isFlashingDemon(demon) {
    if (!this.sceneManager || !this.sceneManager.flashlightOn || !demon) return false;

    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);

    const toDemon = demon.group.position.clone().sub(this.camera.position);
    const dist = toDemon.length();

    if (dist > 14.0) return false; // Fuera del cono de luz

    toDemon.normalize();
    const dot = camDir.dot(toDemon);

    // Si el ángulo es menor a ~26 grados (dot > 0.89) está en el haz directo
    return dot > 0.89;
  }
}
