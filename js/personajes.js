document.querySelectorAll('[data-character-viewer]').forEach((viewer) => {
  const lightingSelect = document.querySelector('[data-lighting-select]');
  const fullscreenButton = document.querySelector('[data-fullscreen]');
  const status = document.querySelector('[data-viewer-status]');
  const fallback = document.querySelector('[data-viewer-fallback]');

  viewer.addEventListener('load', () => {
    if (fallback) fallback.hidden = true;
  });

  viewer.addEventListener('error', () => {
    if (fallback) fallback.hidden = false;
  });

  if (lightingSelect) {
    lightingSelect.addEventListener('change', () => {
      const option = lightingSelect.selectedOptions[0];
      viewer.setAttribute('environment-image', option.dataset.environment);
      viewer.setAttribute('exposure', option.dataset.exposure);
      viewer.style.setProperty('--viewer-background', option.dataset.background);
    });
  }

  if (fullscreenButton) {
    fullscreenButton.addEventListener('click', async () => {
      if (typeof viewer.requestFullscreen !== 'function') {
        status.textContent = 'La pantalla completa no está disponible en este navegador.';
        return;
      }

      try {
        await viewer.requestFullscreen();
        status.textContent = '';
      } catch (error) {
        status.textContent = 'No se pudo activar la pantalla completa. Revisa los permisos del navegador.';
      }
    });
  }
});

document.querySelectorAll('[data-animation-viewer]').forEach((viewer) => {
  const controls = document.querySelector('[data-animation-controls]');
  const picker = document.querySelector('[data-animation-picker]');
  const animationSelect = document.querySelector('[data-animation-select]');
  const playbackButton = document.querySelector('[data-animation-toggle]');
  const speedSelect = document.querySelector('[data-animation-speed]');
  const timeline = document.querySelector('[data-animation-timeline]');
  const timeOutput = document.querySelector('[data-animation-time]');
  const rotationButton = document.querySelector('[data-animation-rotate]');
  const fallback = document.querySelector('[data-animation-fallback]');
  const status = document.querySelector('[data-animation-status]');
  let timelineFrame = null;

  const formatTime = (seconds) => {
    const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = Math.floor(safeSeconds % 60);
    return `${minutes}:${String(remainder).padStart(2, '0')}`;
  };

  const updateTimeline = () => {
    const duration = Number.isFinite(viewer.duration) ? viewer.duration : 0;
    const currentTime = Number.isFinite(viewer.currentTime) ? viewer.currentTime : 0;
    timeline.max = String(duration);
    timeline.value = String(Math.min(currentTime, duration));
    timeOutput.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
  };

  const syncTimeline = () => {
    timelineFrame = null;
    updateTimeline();
    if (!viewer.paused) timelineFrame = requestAnimationFrame(syncTimeline);
  };

  const updatePlaybackButton = () => {
    const paused = viewer.paused;
    playbackButton.textContent = paused ? 'Reanudar' : 'Pausar';
    playbackButton.setAttribute('aria-pressed', String(paused));

    if (paused) {
      updateTimeline();
    } else if (timelineFrame === null) {
      timelineFrame = requestAnimationFrame(syncTimeline);
    }
  };

  viewer.addEventListener('load', () => {
    const animations = viewer.availableAnimations;
    fallback.hidden = true;

    if (animations.length === 0) {
      status.textContent = 'Este modelo no contiene clips de animación.';
      return;
    }

    controls.hidden = false;
    viewer.animationName = animations[0];
    viewer.timeScale = Number(speedSelect.value);

    if (animations.length > 1) {
      picker.hidden = false;
      animationSelect.replaceChildren(...animations.map((animationName) => {
        const option = document.createElement('option');
        option.value = animationName;
        option.textContent = animationName;
        return option;
      }));
      animationSelect.value = animations[0];
    }

    playbackButton.disabled = false;
    timeline.disabled = false;
    viewer.play();
    status.textContent = animations.length === 1
      ? `Reproduciendo: ${animations[0]}`
      : `Reproduciendo: ${animations[0]}. Selecciona otro clip para cambiar la animación.`;
    updatePlaybackButton();
    updateTimeline();
  });

  viewer.addEventListener('error', () => {
    fallback.hidden = false;
    controls.hidden = true;
    status.textContent = 'No se pudo cargar el modelo animado.';
  });

  viewer.addEventListener('play', updatePlaybackButton);
  viewer.addEventListener('pause', updatePlaybackButton);

  playbackButton.addEventListener('click', () => {
    if (viewer.paused) {
      viewer.play();
    } else {
      viewer.pause();
    }
  });

  animationSelect.addEventListener('change', () => {
    viewer.animationName = animationSelect.value;
    viewer.currentTime = 0;
    viewer.play();
    status.textContent = `Reproduciendo: ${animationSelect.value}`;
    updatePlaybackButton();
    updateTimeline();
  });

  speedSelect.addEventListener('change', () => {
    viewer.timeScale = Number(speedSelect.value);
  });

  timeline.addEventListener('input', () => {
    viewer.currentTime = Number(timeline.value);
    updateTimeline();
  });

  rotationButton.addEventListener('click', () => {
    const rotating = rotationButton.getAttribute('aria-pressed') !== 'true';
    viewer.toggleAttribute('auto-rotate', rotating);
    rotationButton.setAttribute('aria-pressed', String(rotating));
    rotationButton.textContent = rotating ? 'Desactivar rotación' : 'Activar rotación';
  });
});

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const disableAutoRotation = () => {
  if (!reducedMotion.matches) return;

  document.querySelectorAll('model-viewer[auto-rotate]').forEach((viewer) => {
    viewer.removeAttribute('auto-rotate');
  });
};

disableAutoRotation();
customElements.whenDefined('model-viewer').then(disableAutoRotation);
reducedMotion.addEventListener('change', disableAutoRotation);
