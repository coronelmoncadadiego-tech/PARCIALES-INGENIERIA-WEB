/**
 * SCENE.JS - Casa Completa de Terror Multi-Habitación con Linterna 3D
 */

class HorrorScene {
  constructor(canvasContainer) {
    this.container = canvasContainer;

    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // Linterna del jugador
    this.flashlight = null;
    this.flashlightOn = true;
    this.flashlightFlickerTimer = 0;

    // Luces de habitaciones
    this.ambientLight = null;
    this.hallwayLight = null;
    this.deskLampLight = null;
    this.tvLight = null;

    // Componentes del reloj y objetos interactivos
    this.clockHourHand = null;
    this.clockMinuteHand = null;
    this.wallClockMesh = null;
    this.deskLampMesh = null;
    this.noteMesh = null;
    this.bedMesh = null;

    // Nuevos interactables de la casa
    this.sinkMesh = null;
    this.mirrorMesh = null;
    this.kettleMesh = null;
    this.pipeMesh = null;
    this.tvMesh = null;
    this.cassetteMesh = null;
    this.typewriterMesh = null;
    this.fuseboxMesh = null;

    this.init();
    this.buildHouseFloorsAndCeiling();
    this.buildHouseWalls();
    this.buildHouseFurniture();
    this.setupHouseLighting();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x010204, 0.14);

    this.camera = new THREE.PerspectiveCamera(
      74,
      window.innerWidth / window.innerHeight,
      0.1,
      45
    );
    // Iniciar en el dormitorio principal
    this.camera.position.set(-5.5, 1.65, 5.5);
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.container.appendChild(this.renderer.domElement);

    // LINTERNA DEL JUGADOR (SpotLight montada en la cámara)
    this.setupFlashlight();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupFlashlight() {
    this.flashlight = new THREE.SpotLight(0xfff6dd, 2.8, 16, Math.PI / 7.2, 0.42, 1.6);
    this.flashlight.position.set(0.18, -0.15, 0.1);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.width = 1024;
    this.flashlight.shadow.mapSize.height = 1024;
    this.flashlight.shadow.bias = -0.001;

    const flashTarget = new THREE.Object3D();
    flashTarget.position.set(0, 0, -5);
    this.camera.add(flashTarget);
    this.flashlight.target = flashTarget;

    this.camera.add(this.flashlight);
  }

  setFlashlight(state) {
    this.flashlightOn = state;
    this.flashlight.visible = state;
    const vignette = document.querySelector('.flashlight-vignette');
    if (vignette) {
      if (state) vignette.classList.add('active');
      else vignette.classList.remove('active');
    }
  }

  setupHouseLighting() {
    // Ambiente frío de penumbra extrema
    this.ambientLight = new THREE.AmbientLight(0x050912, 0.22);
    this.scene.add(this.ambientLight);

    // Luz parpadeante en el pasillo central
    this.hallwayLight = new THREE.PointLight(0xffd8a6, 0.8, 8, 2);
    this.hallwayLight.position.set(0, 2.8, 0);
    this.scene.add(this.hallwayLight);

    // Lámpara del escritorio en el dormitorio
    this.deskLampLight = new THREE.PointLight(0xff9933, 1.2, 5.5, 2);
    this.deskLampLight.position.set(-8.2, 1.45, 7.5);
    this.scene.add(this.deskLampLight);

    // Resplandor azulado del televisor CRT en la sala
    this.tvLight = new THREE.PointLight(0x3498db, 0.9, 6.0, 2);
    this.tvLight.position.set(6.0, 1.3, -2.0);
    this.scene.add(this.tvLight);
  }

  /**
   * Construye los suelos diferenciados por habitación y el techo continuo
   */
  buildHouseFloorsAndCeiling() {
    const woodTex = TextureGenerator.createWoodFloor();
    const bathTex = TextureGenerator.createBathroomTileFloor();
    const kitchenTex = TextureGenerator.createKitchenTileFloor();
    const ceilingTex = TextureGenerator.createCeiling();

    // 1. Suelo Dormitorio (-9.5 a -2, Z: 1.5 a 9.5)
    this.createFloorSection(-5.75, 5.5, 7.5, 8.0, woodTex);

    // 2. Suelo Pasillo (-2 a 2, Z: -11.5 a 9.5)
    this.createFloorSection(0, -1.0, 4.0, 21.0, woodTex);

    // 3. Suelo Baño (-9.5 a -2, Z: -5 a 1.5)
    this.createFloorSection(-5.75, -1.75, 7.5, 6.5, bathTex);

    // 4. Suelo Cocina (2 a 9.5, Z: 1.5 a 9.5)
    this.createFloorSection(5.75, 5.5, 7.5, 8.0, kitchenTex);

    // 5. Suelo Sala de Estar (2 a 9.5, Z: -5 a 1.5)
    this.createFloorSection(5.75, -1.75, 7.5, 6.5, woodTex);

    // 6. Suelo Estudio (-9.5 a -2, Z: -11.5 a -5)
    this.createFloorSection(-5.75, -8.25, 7.5, 6.5, woodTex);

    // 7. Suelo Cuarto Eléctrico / Sótano (2 a 9.5, Z: -11.5 a -5)
    this.createFloorSection(5.75, -8.25, 7.5, 6.5, kitchenTex);

    // Techo general continuo
    const ceilingGeo = new THREE.PlaneGeometry(20, 22);
    const ceilingMat = new THREE.MeshStandardMaterial({ map: ceilingTex, roughness: 0.95 });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.position.set(0, 3.2, -1.0);
    ceiling.rotation.x = Math.PI / 2;
    this.scene.add(ceiling);
  }

  createFloorSection(x, z, w, d, texture) {
    const geo = new THREE.PlaneGeometry(w, d);
    const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7, metalness: 0.1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0, z);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  /**
   * Construye las paredes interiores y exteriores de la casa con marcos de puertas
   */
  buildHouseWalls() {
    const wallTex = TextureGenerator.createWallpaper();
    const hallTex = TextureGenerator.createHallwayWall();
    const bathWallTex = TextureGenerator.createBathroomWall();

    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85 });
    const hallMat = new THREE.MeshStandardMaterial({ map: hallTex, roughness: 0.9 });
    const bathMat = new THREE.MeshStandardMaterial({ map: bathWallTex, roughness: 0.6 });

    const h = 3.2;

    // Paredes Perimetrales Exteriores
    this.addWall(0, -12, 20, h, 0, hallMat); // Norte
    this.addWall(0, 10, 20, h, 0, hallMat);  // Sur
    this.addWall(-10, -1, 22, h, Math.PI / 2, hallMat); // Oeste
    this.addWall(10, -1, 22, h, Math.PI / 2, hallMat);  // Este

    // Paredes divisoras interiores longitudinales (Separando Pasillo de Habitaciones)
    // Pared Oeste del Pasillo (X = -2) con 3 vanos de puerta (Z = 5.5, Z = -1.5, Z = -8)
    this.addWallSegment(-2, 8.5, 2.0, h, Math.PI / 2, hallMat);
    this.addWallSegment(-2, 2.5, 3.0, h, Math.PI / 2, hallMat);
    this.addWallSegment(-2, -4.5, 2.5, h, Math.PI / 2, hallMat);
    this.addWallSegment(-2, -10.5, 2.0, h, Math.PI / 2, hallMat);

    // Pared Este del Pasillo (X = 2) con 3 vanos de puerta (Z = 5.5, Z = -1.5, Z = -8)
    this.addWallSegment(2, 8.5, 2.0, h, Math.PI / 2, hallMat);
    this.addWallSegment(2, 2.5, 3.0, h, Math.PI / 2, hallMat);
    this.addWallSegment(2, -4.5, 2.5, h, Math.PI / 2, hallMat);
    this.addWallSegment(2, -10.5, 2.0, h, Math.PI / 2, hallMat);

    // Paredes transversales (Separando habitaciones entre sí)
    this.addWall(-5.75, 1.5, 7.5, h, 0, bathMat); // Separa Dormitorio y Baño
    this.addWall(-5.75, -5.0, 7.5, h, 0, wallMat); // Separa Baño y Estudio
    this.addWall(5.75, 1.5, 7.5, h, 0, wallMat);  // Separa Cocina y Sala
    this.addWall(5.75, -5.0, 7.5, h, 0, hallMat);  // Separa Sala y Cuarto Eléctrico
  }

  addWall(x, z, length, height, rotationY, material) {
    const geo = new THREE.BoxGeometry(length, height, 0.18);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, height / 2, z);
    mesh.rotation.y = rotationY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  addWallSegment(x, z, length, height, rotationY, material) {
    this.addWall(x, z, length, height, rotationY, material);
  }

  /**
   * Muebles y Props de las 6 Habitaciones con los 10 Interactables
   */
  buildHouseFurniture() {
    const woodTex = TextureGenerator.createFurnitureWood();
    const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.75 });
    const metalTex = TextureGenerator.createMetalPanel();
    const metalMat = new THREE.MeshStandardMaterial({ map: metalTex, metalness: 0.7, roughness: 0.4 });

    // ================= 1. DORMITORIO PRINCIPAL =================
    // Cama
    this.buildBed(woodMat);

    // Escritorio, Lámpara y Diario
    this.buildDesk(woodMat);

    // Reloj de Pared (Interactable Minigame 2)
    this.buildWallClock(woodMat);

    // ================= 2. BAÑO =================
    // Lavamanos con Grifo (Interactable Minigame 3: Agua Fría)
    this.buildBathroomSink(metalMat);

    // Espejo Empañado (Interactable Minigame 4: Desempañar)
    this.buildBathroomMirror();

    // ================= 3. COCINA =================
    // Estufa con Tetera / Caldera (Interactable Minigame 5: Hervir Café)
    this.buildKitchenStove(metalMat);

    // Tubería con fuga bajo fregadero (Interactable Minigame 6: Cerrar fuga)
    this.buildKitchenPipe(metalMat);

    // ================= 4. SALA DE ESTAR =================
    // Televisor CRT Retro (Interactable Minigame 7: Sintonizar TV)
    this.buildLivingRoomTV();

    // Grabadora de Casete VHS (Interactable Minigame 8: Rebobinar cinta)
    this.buildCassettePlayer(woodMat);

    // ================= 5. ESTUDIO =================
    // Máquina de Escribir (Interactable Minigame 9: Frase de vigilia)
    this.buildTypewriterDesk(woodMat);

    // ================= 6. CUARTO ELÉCTRICO / SÓTANO =================
    // Caja de Fusibles en pared (Interactable Minigame 10: Breakers)
    this.buildFuseBox(metalMat);
  }

  buildBed(woodMat) {
    const bedGroup = new THREE.Group();
    bedGroup.position.set(-6.5, 0, 7.5);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 2.2), woodMat);
    frame.position.y = 0.2;
    bedGroup.add(frame);

    const sheetTex = TextureGenerator.createFabric();
    const mattressMat = new THREE.MeshStandardMaterial({ map: sheetTex, roughness: 0.9 });
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.3, 2.1), mattressMat);
    mattress.position.y = 0.5;
    bedGroup.add(mattress);

    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.45), mattressMat);
    pillow.position.set(0, 0.7, 0.7);
    bedGroup.add(pillow);

    this.bedMesh = bedGroup;
    this.scene.add(bedGroup);
  }

  buildDesk(woodMat) {
    const deskGroup = new THREE.Group();
    deskGroup.position.set(-8.2, 0, 7.5);
    deskGroup.rotation.y = Math.PI / 2;

    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.8), woodMat);
    tableTop.position.set(0, 0.85, 0);
    deskGroup.add(tableTop);

    // Lámpara
    const lampShade = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.16, 12, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x2c3539, metalness: 0.8 })
    );
    lampShade.position.set(0.2, 1.25, 0);
    lampShade.rotation.x = Math.PI - 0.3;
    deskGroup.add(lampShade);

    // Diario
    const note = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.02, 0.28),
      new THREE.MeshStandardMaterial({ color: 0xdfd9cb })
    );
    note.position.set(-0.2, 0.9, 0.05);
    deskGroup.add(note);

    this.deskLampMesh = lampShade;
    this.noteMesh = note;
    this.scene.add(deskGroup);
  }

  buildWallClock(woodMat) {
    const clockGroup = new THREE.Group();
    clockGroup.position.set(-2.15, 2.0, 7.0);
    clockGroup.rotation.y = Math.PI / 2;

    const clockCase = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.08, 20), woodMat);
    clockCase.rotation.x = Math.PI / 2;
    clockGroup.add(clockCase);

    const dialTex = TextureGenerator.createClockDial();
    const dial = new THREE.Mesh(
      new THREE.CircleGeometry(0.38, 24),
      new THREE.MeshStandardMaterial({ map: dialTex })
    );
    dial.position.z = 0.045;
    clockGroup.add(dial);

    const handMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    this.clockHourHand = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.008), handMat);
    this.clockHourHand.position.set(0, 0.08, 0.05);
    clockGroup.add(this.clockHourHand);

    this.clockMinuteHand = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.28, 0.008),
      new THREE.MeshBasicMaterial({ color: 0x8a1c14 })
    );
    this.clockMinuteHand.position.set(0, 0.12, 0.052);
    clockGroup.add(this.clockMinuteHand);

    this.wallClockMesh = clockGroup;
    this.scene.add(clockGroup);
  }

  buildBathroomSink(metalMat) {
    const sinkGroup = new THREE.Group();
    sinkGroup.position.set(-5.5, 0, 1.35); // En la pared del baño

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 0.85, 12),
      new THREE.MeshStandardMaterial({ color: 0xe0e6ed, roughness: 0.2 })
    );
    pedestal.position.y = 0.425;
    sinkGroup.add(pedestal);

    const basin = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.2, 0.55),
      new THREE.MeshStandardMaterial({ color: 0xf1f2f6, roughness: 0.15 })
    );
    basin.position.y = 0.9;
    sinkGroup.add(basin);

    const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8), metalMat);
    faucet.position.set(0, 1.05, -0.15);
    sinkGroup.add(faucet);

    this.sinkMesh = sinkGroup;
    this.scene.add(sinkGroup);
  }

  buildBathroomMirror() {
    const mirrorGroup = new THREE.Group();
    mirrorGroup.position.set(-5.5, 1.6, 1.4);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.0, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x3d434d, roughness: 0.6 })
    );
    mirrorGroup.add(frame);

    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.92),
      new THREE.MeshPhysicalMaterial({
        color: 0x8ea3b5,
        roughness: 0.45,
        transmission: 0.3,
        reflectivity: 0.9
      })
    );
    glass.position.z = 0.025;
    glass.rotation.y = Math.PI;
    mirrorGroup.add(glass);

    this.mirrorMesh = mirrorGroup;
    this.scene.add(mirrorGroup);
  }

  buildKitchenStove(metalMat) {
    const stoveGroup = new THREE.Group();
    stoveGroup.position.set(6.0, 0, 9.35); // Cocina al sur

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.8), metalMat);
    body.position.y = 0.45;
    stoveGroup.add(body);

    // Tetera / Hervidor
    const kettle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 0.22, 12),
      new THREE.MeshStandardMaterial({ color: 0xb33939, metalness: 0.8, roughness: 0.3 })
    );
    kettle.position.set(0, 1.02, 0);
    stoveGroup.add(kettle);

    this.kettleMesh = kettle;
    this.scene.add(stoveGroup);
  }

  buildKitchenPipe(metalMat) {
    const pipeGroup = new THREE.Group();
    pipeGroup.position.set(8.5, 0.4, 5.5);

    const pipeV = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8), metalMat);
    pipeGroup.add(pipeV);

    const valve = new THREE.Mesh(
      new THREE.TorusGeometry(0.08, 0.02, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xe74c3c })
    );
    valve.position.y = 0.15;
    valve.rotation.x = Math.PI / 2;
    pipeGroup.add(valve);

    this.pipeMesh = pipeGroup;
    this.scene.add(pipeGroup);
  }

  buildLivingRoomTV() {
    const tvGroup = new THREE.Group();
    tvGroup.position.set(6.0, 0, -1.8);

    const table = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.6, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x22150f })
    );
    table.position.y = 0.3;
    tvGroup.add(table);

    // Chasis TV
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.65, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x2f3640, roughness: 0.8 })
    );
    chassis.position.y = 0.95;
    tvGroup.add(chassis);

    // Pantalla abombada
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x54a0ff })
    );
    screen.position.set(0, 0.95, 0.26);
    tvGroup.add(screen);

    this.tvMesh = tvGroup;
    this.scene.add(tvGroup);
  }

  buildCassettePlayer(woodMat) {
    const playerGroup = new THREE.Group();
    playerGroup.position.set(8.5, 0.85, 0.0);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.15, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x474787, roughness: 0.5 })
    );
    playerGroup.add(box);

    this.cassetteMesh = playerGroup;
    this.scene.add(playerGroup);
  }

  buildTypewriterDesk(woodMat) {
    const deskGroup = new THREE.Group();
    deskGroup.position.set(-6.5, 0, -9.0);

    const table = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.8), woodMat);
    table.position.y = 0.4;
    deskGroup.add(table);

    // Máquina de escribir
    const tw = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.18, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x1e272e, metalness: 0.7, roughness: 0.4 })
    );
    tw.position.y = 0.9;
    deskGroup.add(tw);

    this.typewriterMesh = tw;
    this.scene.add(deskGroup);
  }

  buildFuseBox(metalMat) {
    const fuseGroup = new THREE.Group();
    fuseGroup.position.set(6.0, 1.6, -11.88); // En la pared del cuarto eléctrico

    const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.16), metalMat);
    fuseGroup.add(box);

    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.35, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xff3838 })
    );
    handle.position.set(0.2, 0, 0.1);
    fuseGroup.add(handle);

    this.fuseboxMesh = fuseGroup;
    this.scene.add(fuseGroup);
  }

  getCurrentRoom(x, z) {
    if (x >= -2 && x <= 2) return 'Pasillo Central';
    if (x < -2) {
      if (z > 1.5) return 'Dormitorio Principal';
      if (z > -5.0) return 'Cuarto de Baño';
      return 'Estudio';
    } else {
      if (z > 1.5) return 'Cocina';
      if (z > -5.0) return 'Sala de Estar';
      return 'Cuarto Eléctrico';
    }
  }

  updateWallClock(hourProgress, minuteProgress) {
    if (this.clockHourHand && this.clockMinuteHand) {
      this.clockHourHand.rotation.z = -hourProgress * Math.PI * 2;
      this.clockMinuteHand.rotation.z = -minuteProgress * Math.PI * 2;
    }
  }

  update(delta) {
    // Parpadeo de la luz del pasillo
    if (this.hallwayLight) {
      if (Math.random() < 0.05) this.hallwayLight.intensity = 0.2 + Math.random() * 0.7;
      else this.hallwayLight.intensity = 0.8;
    }

    // Parpadeo de linterna cuando batería baja
    if (this.flashlight && this.flashlightOn && typeof gameEngine !== 'undefined') {
      if (gameEngine.flashlightBattery < 20) {
        if (Math.random() < 0.15) this.flashlight.intensity = 0.4 + Math.random() * 1.5;
        else this.flashlight.intensity = 2.8;
      } else {
        this.flashlight.intensity = 2.8;
      }
    }
  }

  onWindowResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
