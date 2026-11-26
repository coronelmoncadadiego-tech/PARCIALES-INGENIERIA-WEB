import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.querySelector('[data-scene-canvas]');
const stage = document.querySelector('[data-scene-stage]');

if (canvas instanceof HTMLCanvasElement && stage instanceof HTMLElement) {
  const loading = stage.querySelector('[data-scene-loading]');
  const loadingLabel = stage.querySelector('[data-scene-loading-label]');
  const progress = stage.querySelector('[data-scene-progress]');
  const progressLabel = stage.querySelector('[data-scene-progress-label]');
  const errorMessage = stage.querySelector('[data-scene-error]');
  const status = document.querySelector('[data-scene-status]');
  const animationButton = document.querySelector('[data-scene-animation]');
  const resetButton = document.querySelector('[data-scene-reset]');
  const presetSelect = document.querySelector('[data-scene-preset]');
  const lightSlider = document.querySelector('[data-scene-light]');
  const lightOutput = document.querySelector('[data-scene-light-output]');
  const fogToggle = document.querySelector('[data-scene-fog-toggle]');
  const fogSlider = document.querySelector('[data-scene-fog]');
  const fogOutput = document.querySelector('[data-scene-fog-output]');
  const cloudToggle = document.querySelector('[data-scene-cloud-toggle]');
  const cloudSlider = document.querySelector('[data-scene-cloud]');
  const cloudOutput = document.querySelector('[data-scene-cloud-output]');
  const sceneControls = stage.querySelector('.scene-controls');
  if (window.matchMedia('(max-width: 700px)').matches) sceneControls.open = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 1;
  controls.maxDistance = 100;
  controls.maxPolarAngle = Math.PI * 0.88;

  const hemisphere = new THREE.HemisphereLight(0x84a6e4, 0x17131f, 1.1);
  scene.add(hemisphere);

  const keyLight = new THREE.DirectionalLight(0x84a6e4, 2.4);
  keyLight.position.set(-5, 9, 7);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 80;
  keyLight.shadow.bias = -0.00015;
  scene.add(keyLight);

  const blueAccent = new THREE.PointLight(0x3b396d, 24, 45, 2);
  blueAccent.position.set(-7, 3, 1);
  scene.add(blueAccent);

  const goldAccent = new THREE.PointLight(0xe6b949, 18, 35, 2);
  goldAccent.position.set(6, 2.5, 2);
  scene.add(goldAccent);

  const presets = {
    night: {
      background: 0x090b14,
      sky: 0x3b396d,
      ground: 0x17131f,
      key: 0x84a6e4,
      blue: 0x3b396d,
      gold: 0xe6b949,
      cloud: 0x8493c9
    },
    eclipse: {
      background: 0x120814,
      sky: 0x7a398a,
      ground: 0x1e0e16,
      key: 0xb77ac8,
      blue: 0x7a398a,
      gold: 0x871a10,
      cloud: 0x9a5dc8
    },
    studio: {
      background: 0x242832,
      sky: 0xffffff,
      ground: 0x777b87,
      key: 0xffffff,
      blue: 0xd7e2ff,
      gold: 0xffe6a3,
      cloud: 0xffffff
    }
  };

  let baseLightIntensity = Number(lightSlider.value);
  let fogEnabled = fogToggle.checked;
  let cloudsEnabled = cloudToggle.checked;
  let cloudOpacity = Number(cloudSlider.value) / 100;
  let usedFallback = false;
  let mixer = null;
  let playing = false;
  let animationFrame = null;
  let isVisible = false;
  let modelCenter = new THREE.Vector3();
  let modelSize = new THREE.Vector3(10, 6, 10);
  let initialCameraPosition = new THREE.Vector3();
  let initialTarget = new THREE.Vector3();
  const clock = new THREE.Clock();
  const cloudPlanes = [];
  let dust = null;
  let cloudTexture = null;

  function updateFog() {
    const density = Number(fogSlider.value);
    fogOutput.value = density.toFixed(3);
    fogOutput.textContent = density.toFixed(3);
    scene.fog = fogEnabled ? new THREE.FogExp2(scene.background, density) : null;
  }

  function applyPreset(name) {
    const preset = presets[name] || presets.night;
    scene.background = new THREE.Color(preset.background);
    hemisphere.color.setHex(preset.sky);
    hemisphere.groundColor.setHex(preset.ground);
    keyLight.color.setHex(preset.key);
    blueAccent.color.setHex(preset.blue);
    goldAccent.color.setHex(preset.gold);
    keyLight.intensity = 2.4 * baseLightIntensity;
    hemisphere.intensity = 1.1 * baseLightIntensity;
    blueAccent.intensity = 24 * baseLightIntensity;
    goldAccent.intensity = 18 * baseLightIntensity;
    cloudPlanes.forEach(({ material }) => {
      material.color.setHex(preset.cloud);
      material.opacity = Math.min(cloudOpacity * baseLightIntensity, 1);
    });
    if (dust) {
      dust.material.color.setHex(preset.cloud);
      dust.material.opacity = Math.min(cloudOpacity * 0.8 * baseLightIntensity, 1);
    }
    updateFog();
  }

  function createAtmosphereTexture() {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 128;
    textureCanvas.height = 128;
    const context = textureCanvas.getContext('2d');
    if (!context) return null;

    const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 62);
    gradient.addColorStop(0, 'rgba(255,255,255,0.65)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.28)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  function createAtmosphere() {
    cloudTexture = createAtmosphereTexture();
    if (!cloudTexture) return;

    const cloudMaterial = new THREE.MeshBasicMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: cloudOpacity,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide
    });

    for (let index = 0; index < 9; index += 1) {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), cloudMaterial.clone());
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(
        (Math.random() - 0.5) * modelSize.x * 1.8,
        modelCenter.y - modelSize.y * 0.28 + Math.random() * modelSize.y * 0.7,
        (Math.random() - 0.5) * modelSize.z * 1.8
      );
      plane.scale.set(modelSize.x * (0.32 + Math.random() * 0.38), modelSize.z * (0.22 + Math.random() * 0.25), 1);
      plane.userData.drift = 0.08 + Math.random() * 0.12;
      scene.add(plane);
      cloudPlanes.push({ mesh: plane, material: plane.material });
    }

    const count = 260;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = modelCenter.x + (Math.random() - 0.5) * modelSize.x * 1.8;
      positions[index * 3 + 1] = modelCenter.y + Math.random() * modelSize.y * 1.4;
      positions[index * 3 + 2] = modelCenter.z + (Math.random() - 0.5) * modelSize.z * 1.8;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    dust = new THREE.Points(geometry, new THREE.PointsMaterial({
      color: presets.night.cloud,
      map: cloudTexture,
      size: Math.max(modelSize.x, modelSize.y) * 0.012,
      transparent: true,
      opacity: cloudOpacity * 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    }));
    scene.add(dust);
  }

  function setAtmosphereVisibility() {
    cloudPlanes.forEach(({ mesh }) => { mesh.visible = cloudsEnabled && cloudOpacity > 0; });
    if (dust) dust.visible = cloudsEnabled && cloudOpacity > 0;
  }

  function updateCloudOpacity() {
    cloudOpacity = Number(cloudSlider.value) / 100;
    cloudOutput.value = `${Math.round(cloudOpacity * 100)}%`;
    cloudOutput.textContent = cloudOutput.value;
    cloudPlanes.forEach(({ material }) => {
      material.opacity = Math.min(cloudOpacity * baseLightIntensity, 1);
    });
    if (dust) dust.material.opacity = Math.min(cloudOpacity * 0.8 * baseLightIntensity, 1);
    setAtmosphereVisibility();
  }

  function frameModel(root, prioritizeCharacters = false) {
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3();
    if (prioritizeCharacters) {
      ['ROBOT', 'NIÑACHIBO', 'villano'].forEach((name) => {
        const character = root.getObjectByName(name);
        if (character) bounds.union(new THREE.Box3().setFromObject(character));
      });
    }
    if (bounds.isEmpty()) bounds.setFromObject(root);
    if (bounds.isEmpty()) return;

    bounds.getCenter(modelCenter);
    bounds.getSize(modelSize);
    const maxDimension = Math.max(modelSize.x, modelSize.y, modelSize.z, 1);
    const distance = maxDimension / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.25;
    const offset = new THREE.Vector3(0.9, 0.48, 1).normalize().multiplyScalar(distance);
    initialTarget.copy(modelCenter);
    initialCameraPosition.copy(modelCenter).add(offset);
    camera.position.copy(initialCameraPosition);
    camera.near = Math.max(maxDimension / 1000, 0.01);
    camera.far = maxDimension * 30;
    camera.updateProjectionMatrix();
    controls.target.copy(initialTarget);
    controls.minDistance = maxDimension * 0.15;
    controls.maxDistance = maxDimension * 5;
    controls.update();

    keyLight.position.set(
      modelCenter.x - maxDimension * 1.2,
      modelCenter.y + maxDimension * 2,
      modelCenter.z + maxDimension * 1.2
    );
    blueAccent.position.set(
      modelCenter.x - maxDimension * 1.8,
      modelCenter.y + maxDimension * 0.5,
      modelCenter.z + maxDimension * 1.1
    );
    blueAccent.distance = maxDimension * 6;
    goldAccent.position.set(
      modelCenter.x + maxDimension * 1.8,
      modelCenter.y + maxDimension * 0.25,
      modelCenter.z - maxDimension * 0.5
    );
    goldAccent.distance = maxDimension * 5;
    keyLight.target.position.copy(modelCenter);
    keyLight.target.updateMatrixWorld();
    keyLight.shadow.camera.left = -maxDimension;
    keyLight.shadow.camera.right = maxDimension;
    keyLight.shadow.camera.top = maxDimension;
    keyLight.shadow.camera.bottom = -maxDimension;
    keyLight.shadow.camera.updateProjectionMatrix();
  }

  function setLoading(label, percent = 0) {
    loading.hidden = false;
    loadingLabel.textContent = label;
    progress.value = percent;
    progressLabel.textContent = `${Math.round(percent)}%`;
  }

  function loadGltf(loader, url, useFallback = false) {
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        resolve,
        (event) => {
          if (event.total > 0) {
            const percent = Math.min((event.loaded / event.total) * 100, 100);
            progress.value = percent;
            progressLabel.textContent = `${Math.round(percent)}%`;
            loadingLabel.textContent = useFallback
              ? 'Cargando escenario disponible…'
              : 'Cargando escenario 3D…';
          } else {
            loadingLabel.textContent = 'Descargando escenario 3D…';
          }
        },
        reject
      );
    });
  }

  async function loadScene() {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    dracoLoader.setDecoderConfig({ type: 'js' });
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    let gltf;
    try {
      gltf = await loadGltf(loader, 'personajes-3d/modelos/escenario-grupal.glb');
    } catch (primaryError) {
      console.warn('No se pudo cargar escenario-grupal.glb; se intentará el escenario existente.', primaryError);
      usedFallback = true;
      setLoading('Escenario grupal no disponible; cargando el modelo incluido…');
      try {
        gltf = await loadGltf(loader, 'personajes-3d/modelos/escenariolow.glb', true);
      } catch (fallbackError) {
        console.error('No se pudo cargar el escenario 3D.', fallbackError);
        loading.hidden = true;
        errorMessage.textContent = 'No se pudo cargar el escenario. Comprueba que los archivos GLB estén disponibles y sirve el sitio desde un servidor web.';
        errorMessage.hidden = false;
        status.textContent = 'El visor 3D no pudo iniciar.';
        dracoLoader.dispose();
        return;
      }
    }

    const model = gltf.scene;
    model.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    scene.add(model);
    frameModel(model, usedFallback);
    createAtmosphere();
    applyPreset(presetSelect.value);
    updateCloudOpacity();
    setAtmosphereVisibility();
    loading.hidden = true;
    errorMessage.hidden = true;

    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach((clip) => mixer.clipAction(clip).reset().play());
      playing = true;
      animationButton.disabled = false;
      animationButton.textContent = 'Pausar animaciones';
      animationButton.setAttribute('aria-pressed', 'true');
      status.textContent = usedFallback
        ? `Se muestra escenariolow.glb (escenario-grupal.glb aún no está disponible). ${gltf.animations.length} animación(es) en bucle.`
        : `${gltf.animations.length} animación(es) reproduciéndose en bucle.`;
    } else {
      animationButton.disabled = true;
      animationButton.textContent = 'Sin animaciones';
      status.textContent = usedFallback
        ? 'Se muestra escenariolow.glb (escenario-grupal.glb aún no está disponible). El modelo no contiene animaciones.'
        : 'El modelo no contiene animaciones.';
    }

    dracoLoader.dispose();
    requestRender();
  }

  function updateSize() {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    requestRender();
  }

  function render() {
    animationFrame = null;
    if (!isVisible) return;
    const delta = Math.min(clock.getDelta(), 0.05);
    if (mixer && playing) mixer.update(delta);
    cloudPlanes.forEach(({ mesh }) => {
      mesh.position.x += mesh.userData.drift * delta;
      if (mesh.position.x > modelCenter.x + modelSize.x) {
        mesh.position.x = modelCenter.x - modelSize.x;
      }
    });
    if (dust) dust.rotation.y += delta * 0.025;
    const controlsChanged = controls.update();
    renderer.render(scene, camera);
    if ((mixer && playing) || cloudsEnabled || controlsChanged) {
      animationFrame = window.requestAnimationFrame(render);
    }
  }

  function requestRender() {
    if (isVisible && animationFrame === null) {
      clock.getDelta();
      animationFrame = window.requestAnimationFrame(render);
    }
  }

  animationButton.addEventListener('click', () => {
    if (!mixer) return;
    playing = !playing;
    mixer.timeScale = playing ? 1 : 0;
    animationButton.textContent = playing ? 'Pausar animaciones' : 'Reproducir animaciones';
    animationButton.setAttribute('aria-pressed', String(playing));
    status.textContent = playing ? 'Animaciones reproduciéndose.' : 'Animaciones en pausa.';
    requestRender();
  });

  resetButton.addEventListener('click', () => {
    camera.position.copy(initialCameraPosition);
    controls.target.copy(initialTarget);
    controls.update();
    requestRender();
  });

  presetSelect.addEventListener('change', () => applyPreset(presetSelect.value));

  lightSlider.addEventListener('input', () => {
    baseLightIntensity = Number(lightSlider.value);
    lightOutput.value = baseLightIntensity.toFixed(1);
    lightOutput.textContent = lightOutput.value;
    applyPreset(presetSelect.value);
  });

  fogToggle.addEventListener('change', () => {
    fogEnabled = fogToggle.checked;
    updateFog();
  });

  fogSlider.addEventListener('input', updateFog);
  cloudToggle.addEventListener('change', () => {
    cloudsEnabled = cloudToggle.checked;
    setAtmosphereVisibility();
  });
  cloudSlider.addEventListener('input', updateCloudOpacity);

  controls.addEventListener('start', requestRender);
  controls.addEventListener('end', requestRender);

  const resizeObserver = new ResizeObserver(updateSize);
  resizeObserver.observe(stage);
  window.addEventListener('resize', updateSize, { passive: true });

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
    if (!isVisible && animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
      clock.getDelta();
      return;
    }
    if (isVisible) requestRender();
  }, { threshold: 0.01 });
  visibilityObserver.observe(stage);
  updateSize();
  applyPreset(presetSelect.value);
  loadScene();
}
