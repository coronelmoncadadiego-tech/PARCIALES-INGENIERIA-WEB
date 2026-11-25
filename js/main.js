/**
 * Main Application Logic
 * Pure ES6 Script for Nav, Animations, Video Games Modal, and Form Handling
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initAnimatedCounters();
  initContactForm();
  initModals();
});

/**
 * 1. Mobile Navigation Toggle & Accessibility Management
 */
function initMobileNav() {
  const menuToggle = document.getElementById('menuToggle');
  const primaryNav = document.getElementById('primaryNav');
  const navItems = primaryNav ? primaryNav.querySelectorAll('.nav-item') : [];

  if (!menuToggle || !primaryNav) return;

  function toggleMenu() {
    const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', !isExpanded);
    primaryNav.classList.toggle('active');
  }

  menuToggle.addEventListener('click', toggleMenu);

  // Close menu when clicking navigation links
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      if (primaryNav.classList.contains('active')) {
        toggleMenu();
      }
    });
  });
}

/**
 * 2. Animated Numerical Counters using IntersectionObserver
 */
function initAnimatedCounters() {
  const statNumbers = document.querySelectorAll('.stat-number');
  if (statNumbers.length === 0) return;

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const observerOptions = {
    root: null,
    threshold: 0.5
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = entry.target;
        const targetValue = parseInt(target.getAttribute('data-target'), 10);

        if (prefersReducedMotion) {
          target.textContent = targetValue;
        } else {
          animateValue(target, 0, targetValue, 1500);
        }
        obs.unobserve(target);
      }
    });
  }, observerOptions);

  statNumbers.forEach(stat => observer.observe(stat));
}

function animateValue(element, start, end, duration) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    element.textContent = Math.floor(progress * (end - start) + start);
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

/**
 * 3. Form Validation & Submission Handling
 */
function initContactForm() {
  const contactForm = document.getElementById('contactForm');
  const formStatus = document.getElementById('formStatus');

  if (!contactForm) return;

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Basic native validation trigger
    if (!contactForm.checkValidity()) {
      formStatus.textContent = 'Por favor completa todos los campos requeridos correctamente.';
      formStatus.style.color = '#ff7b72';
      return;
    }

    // UX feedback state
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    formStatus.textContent = '';

    // Simulated Async Operations (e.g., API call)
    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
      
      formStatus.textContent = '¡Mensaje enviado con éxito! Me pondré en contacto pronto.';
      formStatus.style.color = '#34d399';
      
      contactForm.reset();
    }, 1200);
  });
}

/**
 * 4. Video Games Showcase & Modal Logic
 */
const GAMES_DATA = {
  game1: {
    title: 'Halloween Pong 2D',
    category: 'ARCADE RETRO • PIXEL ART',
    url: 'TODOSVIDEOJUEGOS/VIDEOJUEGO1/index.html',
    desc: 'Un intenso juego arcade de tenis paranormal con ambientación de Noche de Brujas. Cuenta con emulación de monitor CRT con scanlines, física de rebote reactiva, calavera espectral en pixel art y audio procedural de 8 bits.',
    controls: [
      { key: 'W / S', action: 'Mover Pala Jugador 1 (Subir / Bajar)' },
      { key: '▲ / ▼', action: 'Mover Pala Jugador 2 (Modo 2P Local)' },
      { key: 'P', action: 'Pausar o Reanudar el Duelo' },
      { key: 'M', action: 'Activar o Silenciar Audio 8-bit' },
      { key: 'Mouse / Touch', action: 'Navegar en menú de selección de almas y dificultad' }
    ],
    features: [
      'Modo 1 Jugador contra IA Demonio con 3 dificultades (Espíritu, Monstruo, Pesadilla).',
      'Modo 2 Jugadores competitivo mano a mano en el mismo teclado.',
      'Límite de puntuación configurable (partidas a 5, 10 o 15 almas para triunfar).',
      'Efectos visuales CRT: curvatura de fósforo, scanlines y resplandor fantasmal.',
      'Efectos sonoros generados en tiempo real con Web Audio API.'
    ],
    tags: ['HTML5 Canvas', 'Pixel Art 8-bit', 'Web Audio API', 'Retro CRT Shader', 'JavaScript ES6']
  },
  game2: {
    title: 'La Habitación del Sonámbulo (Edición Casa Completa)',
    category: 'SURVIVAL HORROR 3D • DIEGÉTICO',
    url: 'TODOSVIDEOJUEGOS/VIDEOJUEGO2/index.html',
    desc: 'Experiencia inmersiva en primera persona de terror psicológico en 3D desarrollada con Three.js. Explora una casa entera de 7 habitaciones interconectadas mientras una entidad demoníaca acecha activamente tus pasos. Debes gestionar tu batería y completar 10 tareas diegéticas para conservar tu lucidez cerebral hasta las 06:00 AM.',
    controls: [
      { key: 'W A S D / Flechas', action: 'Desplazamiento por las habitaciones de la casa' },
      { key: 'Ratón (Mouse)', action: 'Mirar en 360° (Control de cámara en primera persona)' },
      { key: 'F', action: 'Encender / Apagar Linterna (Consume batería)' },
      { key: 'TAB', action: 'Abrir / Cerrar Neuro-Monitor Somno-Pad (Tableta de tareas)' },
      { key: 'Clic Izquierdo / E', action: 'Interactuar con minijuegos y objetos diegéticos' },
      { key: 'ESC', action: 'Salir de minijuegos activos o liberar puntero del ratón' }
    ],
    features: [
      'Casa 3D completa de 20x22 metros con 7 estancias (Dormitorio, Baño, Cocina, Sala CRT, Despacho, Sótano eléctrico y Pasillo).',
      'Demonio del Sueño acechador con medidor de tolerancia: alumbrarlo en exceso lo vuelve inmune a la luz y doblemente veloz.',
      '10 Minijuegos diegéticos: sintonizar televisor CRT, rebobinar cinta VHS, ajustar fusibles eléctricos, desempañar espejo, purgar tuberías, etc.',
      'Mecánica de enfriamiento progresivo que exige rotar constantemente de habitaciones.',
      'Sistemas de post-procesado visual: grano VHS, distorsión mental, pestañeo de ojos y monitor ECG de ondas cerebrales en tiempo real.'
    ],
    tags: ['Three.js', 'WebGL 3D', 'Web Audio API 3D', 'First-Person Controls', 'Procedural Textures', 'Atmospheric Lighting']
  },
  game3: {
    title: 'Cazas Galácticos (Galactic Starfighter)',
    category: 'ARCADE ESPACIAL • ACTION SCI-FI 2D',
    url: 'TODOSVIDEOJUEGOS/VIDEOJUEGO3/index.html',
    desc: 'Shoot \'em up espacial en tiempo real con renderizado vectorial procedural y banda sonora synthwave dinámica. Pilota cazas estelares, enfrenta naves de asalto y asteroides destructibles, activa bombas Nova y vence al Acorazado Némesis.',
    controls: [
      { key: 'W A S D / Flechas / Ratón', action: 'Maniobrar Caza Estelar por la pantalla' },
      { key: 'Espacio / Clic Izq', action: 'Fuego Láser Continuo / Cañones de Plasma' },
      { key: 'Shift / Clic Der', action: 'Maniobra Turbo / Esquiva Rápida' },
      { key: 'B / Doble Clic', action: 'Bomba Nova (Destruye proyectiles y daña todo el sector)' },
      { key: 'P / Escape', action: 'Pausar / Reanudar Misión' }
    ],
    features: [
      '3 Cazas estelares seleccionables con atributos distintos: Aurora X-1 (Equilibrado), Espectro V (Hiperrápido) y Titán MK-II (Blindado).',
      'Enemigos variados: Cazas exploradores sinusoidales, naves de asalto teledirigidas, fragatas pesadas y asteroides fragmentables.',
      'Batalla contra Jefe Colosal (Dreadnought Némesis) con barra de salud dedicada y fases furia.',
      'Sistema de progresión de armamento en 5 niveles y recolección de drops (escudos, bombas, turbo).',
      'Sintetizador procedural nativo con Web Audio API generando música synthwave y efectos sonoros en tiempo real.'
    ],
    tags: ['HTML5 Canvas 2D', 'Procedural Synthwave', 'Web Audio API', 'Parallax Starfield', 'Particle Physics Engine']
  }
};

function openGameModal(gameKey) {
  const data = GAMES_DATA[gameKey];
  const modal = document.getElementById('gameInfoModal');
  if (!data || !modal) return;

  // Set header info
  document.getElementById('modalGameCategory').textContent = data.category;
  document.getElementById('modalGameTitle').textContent = data.title;
  document.getElementById('modalGameDescription').textContent = data.desc;

  // Build controls table
  const controlsContainer = document.getElementById('modalControlsTable');
  controlsContainer.innerHTML = '';
  data.controls.forEach(ctrl => {
    const item = document.createElement('div');
    item.className = 'ctrl-item';
    
    // Parse keys to wrap in <kbd>
    const keysHtml = ctrl.key.split('/').map(k => `<kbd>${k.trim()}</kbd>`).join(' / ');
    
    item.innerHTML = `
      <span class="ctrl-key">${keysHtml}</span>
      <span class="ctrl-desc">${ctrl.action}</span>
    `;
    controlsContainer.appendChild(item);
  });

  // Build features list
  const featuresList = document.getElementById('modalFeaturesList');
  featuresList.innerHTML = '';
  data.features.forEach(feat => {
    const li = document.createElement('li');
    li.textContent = feat;
    featuresList.appendChild(li);
  });

  // Build tech tags
  const tagsContainer = document.getElementById('modalTechTags');
  tagsContainer.innerHTML = '';
  data.tags.forEach(t => {
    const span = document.createElement('span');
    span.textContent = t;
    tagsContainer.appendChild(span);
  });

  // Set launch button URL
  const launchBtn = document.getElementById('modalLaunchBtn');
  launchBtn.href = data.url;

  modal.showModal();
}

function closeGameModal() {
  const modal = document.getElementById('gameInfoModal');
  if (modal) modal.close();
}

/**
 * 5. Lightbox for Project Images
 */
function openLightbox(element) {
  const img = element.querySelector('img');
  const lightbox = document.getElementById('imageLightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  if (!img || !lightbox || !lightboxImg) return;
  
  lightboxImg.src = img.src;
  lightboxImg.alt = img.alt || 'Vista previa';
  lightbox.showModal();
}

function closeLightbox() {
  const lightbox = document.getElementById('imageLightbox');
  if (lightbox) lightbox.close();
}

/**
 * Initialize backdrop closing for all modals
 */
function initModals() {
  const gameModal = document.getElementById('gameInfoModal');
  if (gameModal) {
    gameModal.addEventListener('click', (e) => {
      if (e.target === gameModal) {
        closeGameModal();
      }
    });
  }

  const imageLightbox = document.getElementById('imageLightbox');
  if (imageLightbox) {
    imageLightbox.addEventListener('click', (e) => {
      if (e.target === imageLightbox) {
        closeLightbox();
      }
    });
  }
}

// Global scope bindings for inline HTML handlers
window.openGameModal = openGameModal;
window.closeGameModal = closeGameModal;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
