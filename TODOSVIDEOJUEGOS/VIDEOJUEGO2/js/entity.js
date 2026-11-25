/**
 * ENTITY.JS - Demonio del Sueño Acechador de la Casa Completa
 * Reacciona a la linterna con tolerancia / adaptación progresiva e inmunidad.
 */

class SleepDemon {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    // Estado del Demonio
    this.health = 100;
    this.adaptationLevel = 0; // 0% a 100% (al llegar a 100% se vuelve inmune)
    this.isImmune = false;
    this.immuneTimer = 0;
    this.stalkSpeed = 1.35; // m/s
    this.immuneSpeed = 2.4; // m/s en furia inmune

    // Puntos de patrulla / acecho en las 6 habitaciones
    this.roomWaypoints = [
      { name: 'Dormitorio Principal', pos: new THREE.Vector3(-6.5, 0, 4.5) },
      { name: 'Pasillo Central Norte', pos: new THREE.Vector3(0, 0, -8.0) },
      { name: 'Pasillo Central Sur', pos: new THREE.Vector3(0, 0, 6.0) },
      { name: 'Cuarto de Baño', pos: new THREE.Vector3(-6.0, 0, -2.0) },
      { name: 'Cocina', pos: new THREE.Vector3(6.5, 0, 5.5) },
      { name: 'Sala de Estar', pos: new THREE.Vector3(6.5, 0, -2.0) },
      { name: 'Estudio', pos: new THREE.Vector3(-6.0, 0, -8.0) },
      { name: 'Cuarto Eléctrico', pos: new THREE.Vector3(6.0, 0, -8.0) }
    ];

    this.currentWaypointIndex = 1;
    this.targetPosition = this.roomWaypoints[1].pos.clone();

    // Materiales
    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x040407,
      roughness: 0.95,
      metalness: 0.1,
      transparent: true,
      opacity: 0.92
    });

    this.eyeMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0022
    });

    this.buildDemonModel();
    this.scene.add(this.group);

    // Iniciar en el extremo norte del pasillo
    this.group.position.set(0, 0, -9.0);
  }

  buildDemonModel() {
    // Torso demacrado y largo
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.16, 1.45, 8), this.bodyMaterial);
    torso.position.y = 1.4;
    torso.castShadow = true;
    this.group.add(torso);

    // Cabeza alargada
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), this.bodyMaterial);
    head.scale.set(1.0, 1.35, 1.1);
    head.position.y = 2.35;
    this.head = head;
    this.group.add(head);

    // Ojos ardientes
    const eyeGeo = new THREE.SphereGeometry(0.035, 6, 6);
    this.leftEye = new THREE.Mesh(eyeGeo, this.eyeMaterial);
    this.leftEye.position.set(-0.07, 2.38, 0.2);
    this.group.add(this.leftEye);

    this.rightEye = new THREE.Mesh(eyeGeo, this.eyeMaterial);
    this.rightEye.position.set(0.07, 2.38, 0.2);
    this.group.add(this.rightEye);

    // Luz propia de ojos
    this.eyeLight = new THREE.PointLight(0xff0022, 1.2, 3.5);
    this.eyeLight.position.set(0, 2.38, 0.25);
    this.group.add(this.eyeLight);

    // Brazos con garras espigadas
    this.group.add(this.createLimb(-0.32, 1));
    this.group.add(this.createLimb(0.32, -1));

    // Sudario de sombras
    const shroud = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 1.7, 7, 1, true),
      this.bodyMaterial
    );
    shroud.position.y = 0.85;
    this.group.add(shroud);
  }

  createLimb(offsetX, side) {
    const armGroup = new THREE.Group();
    armGroup.position.set(offsetX, 1.95, 0);

    const bicep = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.03, 0.8, 5), this.bodyMaterial);
    bicep.position.y = -0.4;
    armGroup.add(bicep);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.015, 0.9, 5), this.bodyMaterial);
    forearm.position.y = -1.1;
    armGroup.add(forearm);

    return armGroup;
  }

  /**
   * Mecánica central: Cuando el jugador alumbra al demonio con la linterna
   */
  shineFlashlightAtDemon(delta) {
    if (this.isImmune) {
      // Si es inmune, no huye: ruge y se acelera
      return;
    }

    // Aumentar tolerancia a la luz
    this.adaptationLevel += delta * 65; // ~1.5 segundos de luz continua provocan inmunidad

    this.updateToleranceHUD();

    if (this.adaptationLevel >= 100) {
      this.triggerImmunity();
    } else {
      // Quemar al demonio y forzarlo a huir temporalmente a otra habitación
      if (typeof audioEngine !== 'undefined') {
        audioEngine.playDemonBurn();
      }
      this.fleeToRandomRoom();
    }
  }

  triggerImmunity() {
    this.isImmune = true;
    this.immuneTimer = 18.0; // 18 segundos de inmunidad total a la luz
    this.adaptationLevel = 100;

    // Cambiar ojos a violeta/eléctrico furioso
    this.eyeMaterial.color.setHex(0x9b59b6);
    this.eyeLight.color.setHex(0x9b59b6);
    this.eyeLight.intensity = 2.5;

    const badge = document.querySelector('.demon-immune-badge');
    if (badge) badge.style.display = 'block';

    if (typeof audioEngine !== 'undefined') {
      audioEngine.playDemonRoarImmune();
    }
  }

  fleeToRandomRoom() {
    // Escoger una habitación lejana
    const randomIndex = Math.floor(Math.random() * this.roomWaypoints.length);
    this.currentWaypointIndex = randomIndex;
    this.group.position.copy(this.roomWaypoints[randomIndex].pos);

    // Breve enfriamiento tras huir
    this.adaptationLevel = Math.max(0, this.adaptationLevel - 10);
    this.updateToleranceHUD();
  }

  updateToleranceHUD() {
    const fill = document.querySelector('.demon-tolerance-bar-fill');
    if (fill) {
      fill.style.width = `${Math.min(100, this.adaptationLevel)}%`;
    }
  }

  /**
   * Bucle del Demonio: Acechar al jugador, perseguir y actualizar inmunidad
   */
  update(delta, playerPosition, isPlayerFlashingDemon) {
    // 1. Manejo del temporizador de inmunidad
    if (this.isImmune) {
      this.immuneTimer -= delta;
      if (this.immuneTimer <= 0) {
        this.isImmune = false;
        this.adaptationLevel = 0;
        this.eyeMaterial.color.setHex(0xff0022);
        this.eyeLight.color.setHex(0xff0022);
        this.eyeLight.intensity = 1.2;

        const badge = document.querySelector('.demon-immune-badge');
        if (badge) badge.style.display = 'none';
        this.updateToleranceHUD();
      }
    } else {
      // Disipar tolerancia gradualmente si no es alumbrado
      if (!isPlayerFlashingDemon && this.adaptationLevel > 0) {
        this.adaptationLevel = Math.max(0, this.adaptationLevel - delta * 4.5);
        this.updateToleranceHUD();
      }
    }

    // 2. Navegación hacia el jugador
    if (playerPosition) {
      const distToPlayer = this.group.position.distanceTo(playerPosition);
      const currentSpeed = this.isImmune ? this.immuneSpeed : this.stalkSpeed;

      // Mirar hacia el jugador
      const dx = playerPosition.x - this.group.position.x;
      const dz = playerPosition.z - this.group.position.z;
      const angle = Math.atan2(dx, dz);
      this.group.rotation.y = angle;

      // Avanzar hacia el jugador si está en rango de percepción
      if (distToPlayer > 1.1) {
        const moveVec = new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(currentSpeed * delta);
        this.group.position.add(moveVec);
      } else {
        // ATAQUE DEL DEMONIO: daño masivo de lucidez al alcanzar al jugador
        if (typeof gameEngine !== 'undefined') {
          gameEngine.restoreLucidity(-30);
          if (typeof audioEngine !== 'undefined') audioEngine.playHorrorStinger();
          const flash = document.querySelector('.sanity-distortion');
          if (flash) {
            flash.style.opacity = '1';
            setTimeout(() => (flash.style.opacity = '0'), 600);
          }
          // El demonio se repliega tras asestar el golpe
          this.fleeToRandomRoom();
        }
      }

      // Micro-temblores espasmódicos
      if (this.head) {
        this.head.rotation.z = (Math.random() - 0.5) * (this.isImmune ? 0.35 : 0.12);
        this.head.rotation.x = (Math.random() - 0.5) * (this.isImmune ? 0.25 : 0.08);
      }
    }
  }
}
