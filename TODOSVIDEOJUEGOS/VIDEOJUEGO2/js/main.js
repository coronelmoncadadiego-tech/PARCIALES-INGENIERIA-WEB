/**
 * MAIN.JS - Punto de Entrada y Orquestador General (Casa Completa & 10 Minijuegos)
 */

window.addEventListener('DOMContentLoaded', () => {
  const canvasContainer = document.getElementById('canvas-container');

  // 1. Inicializar Subsistemas
  const horrorScene = new HorrorScene(canvasContainer);
  const fpsControls = new FPSController(horrorScene.camera, horrorScene.renderer.domElement, horrorScene);
  const sleepDemon = new SleepDemon(horrorScene.scene);
  horrorScene.demon = sleepDemon;

  const gameEngine = new GameEngine();
  const minigamesMgr = new MinigamesManager(gameEngine, fpsControls, horrorScene);

  // Vincular dependencias
  gameEngine.setDependencies(horrorScene, fpsControls, sleepDemon, minigamesMgr);

  // Helper de Notificaciones en Pantalla
  window.showNarrativeToast = function(text) {
    const toast = document.getElementById('narrative-toast');
    if (toast) {
      toast.innerText = text;
      toast.classList.add('visible');
      setTimeout(() => toast.classList.remove('visible'), 4600);
    }
  };

  // 2. Registrar los Objetos Interactivos Diegéticos de las 6 Habitaciones
  // --- Dormitorio ---
  if (horrorScene.wallClockMesh) {
    fpsControls.registerInteractable(
      horrorScene.wallClockMesh,
      '[E] Sincronizar Reloj Mental (Lógica Invertida)',
      () => minigamesMgr.openMinigame('reloj')
    );
  }

  if (horrorScene.deskLampMesh) {
    fpsControls.registerInteractable(
      horrorScene.deskLampMesh,
      '[E] Calor de la Lámpara (+8% Lucidez)',
      () => {
        if (typeof audioEngine !== 'undefined') audioEngine.playClick();
        gameEngine.restoreLucidity(8);
        showNarrativeToast('La calidez de la bombilla aleja momentáneamente el frío.');
      }
    );
  }

  if (horrorScene.noteMesh) {
    fpsControls.registerInteractable(
      horrorScene.noteMesh,
      '[E] Leer Diario del Sonámbulo',
      () => {
        if (typeof audioEngine !== 'undefined') audioEngine.playClick();
        showNarrativeToast('DIARIO: "La linterna asusta al demonio, pero si lo alumbras demasiado se volverá inmune. Pulsa [TAB] para ver tus tareas."');
      }
    );
  }

  if (horrorScene.bedMesh) {
    fpsControls.registerInteractable(
      horrorScene.bedMesh,
      '[E] Tu Cuerpo Inmóvil',
      () => {
        if (typeof audioEngine !== 'undefined') audioEngine.playClick();
        showNarrativeToast('Tu cuerpo real sigue atrapado en la cama. Sobrevive hasta las 06:00 AM.');
      }
    );
  }

  // --- Baño ---
  if (horrorScene.sinkMesh) {
    fpsControls.registerInteractable(
      horrorScene.sinkMesh,
      '[E] Lavarse la Cara con Agua Fría',
      () => minigamesMgr.openMinigame('lavamanos')
    );
  }

  if (horrorScene.mirrorMesh) {
    fpsControls.registerInteractable(
      horrorScene.mirrorMesh,
      '[E] Desempañar Espejo Manchado',
      () => minigamesMgr.openMinigame('espejo')
    );
  }

  // --- Cocina ---
  if (horrorScene.kettleMesh) {
    fpsControls.registerInteractable(
      horrorScene.kettleMesh,
      '[E] Hervir Infusión de Cafeína',
      () => minigamesMgr.openMinigame('tetera')
    );
  }

  if (horrorScene.pipeMesh) {
    fpsControls.registerInteractable(
      horrorScene.pipeMesh,
      '[E] Cerrar Fuga de Tubería',
      () => minigamesMgr.openMinigame('tuberia')
    );
  }

  // --- Sala de Estar ---
  if (horrorScene.tvMesh) {
    fpsControls.registerInteractable(
      horrorScene.tvMesh,
      '[E] Sintonizar Frecuencia de TV CRT',
      () => minigamesMgr.openMinigame('television')
    );
  }

  if (horrorScene.cassetteMesh) {
    fpsControls.registerInteractable(
      horrorScene.cassetteMesh,
      '[E] Rebobinar Casete de Grabadora',
      () => minigamesMgr.openMinigame('casete')
    );
  }

  // --- Estudio ---
  if (horrorScene.typewriterMesh) {
    fpsControls.registerInteractable(
      horrorScene.typewriterMesh,
      '[E] Máquina de Escribir (Anclaje Mental)',
      () => minigamesMgr.openMinigame('maquinilla')
    );
  }

  // --- Cuarto Eléctrico / Sótano ---
  if (horrorScene.fuseboxMesh) {
    fpsControls.registerInteractable(
      horrorScene.fuseboxMesh,
      '[E] Restablecer Caja de Fusibles',
      () => minigamesMgr.openMinigame('fusibles')
    );
  }

  // 3. Manejo de Teclas Globales de Acción
  window.addEventListener('keydown', (e) => {
    if ((e.code === 'KeyE' || e.key === 'e' || e.key === 'E') && fpsControls.isLocked) {
      fpsControls.triggerInteraction();
    }
  });

  window.addEventListener('mousedown', (e) => {
    if (fpsControls.isLocked && e.button === 0 && !minigamesMgr.activeMinigameId && !gameEngine.isTabletOpen) {
      fpsControls.triggerInteraction();
    }
  });

  // 4. Conectar Botones de la Interfaz
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      audioEngine.init();
      audioEngine.resume();
      gameEngine.start();
    });
  }

  const defeatRestartBtn = document.getElementById('defeat-restart-btn');
  if (defeatRestartBtn) {
    defeatRestartBtn.addEventListener('click', () => {
      audioEngine.resume();
      gameEngine.restart();
    });
  }

  const victoryRestartBtn = document.getElementById('victory-restart-btn');
  if (victoryRestartBtn) {
    victoryRestartBtn.addEventListener('click', () => {
      audioEngine.resume();
      gameEngine.restart();
    });
  }

  const tabletCloseBtn = document.getElementById('tablet-close-btn');
  if (tabletCloseBtn) {
    tabletCloseBtn.addEventListener('click', () => gameEngine.toggleTablet(false));
  }

  horrorScene.renderer.domElement.addEventListener('click', () => {
    if (gameEngine.state === 'PLAYING' && !minigamesMgr.activeMinigameId && !gameEngine.isTabletOpen && !fpsControls.isLocked) {
      fpsControls.lock();
    }
  });

  // 5. Bucle Principal de Renderizado y Física
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1);

    fpsControls.update(delta);
    horrorScene.update(delta);
    gameEngine.update(delta);
    horrorScene.render();
  }

  animate();
});
