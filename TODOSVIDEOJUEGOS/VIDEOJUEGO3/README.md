# 🚀 CAZAS GALÁCTICOS - Videojuego 2D Web Sci-Fi

Un videojuego arcade de combate espacial 2D en tiempo real desarrollado para la asignatura de **Ingeniería Web**. Desarrollado con tecnología web pura (**HTML5 Canvas, CSS3 y JavaScript moderno**), con renderizado vectorial procedural y sintetizador de sonido mediante **Web Audio API**.

---

## 📁 Estructura del Proyecto

El proyecto está modularizado limpiamente en tres componentes independientes:

```text
VIDEOJUEGO3/
├── index.html       # Estructura semántica, Canvas y capas HUD/UI
├── style.css        # Estilos visuales Sci-Fi, fuentes, animaciones y diseño responsivo
├── game.js          # Motor del juego, audio procedural, físicas, entidades y colisiones
└── README.md        # Documentación técnica y guía de controles
```

---

## 🎮 Controles del Caza Estelar

| Acción | Teclado | Ratón / Táctil |
| :--- | :--- | :--- |
| **Mover Caza** | `WASD` o Flechas Direccionales | Mover el puntero del ratón / Deslizar dedo |
| **Disparo Láser** | Barra espaciadora (`Space`) | Clic izquierdo mantenido / Botón 🔥 |
| **Maniobra Turbo / Esquiva** | `Shift` (Izquierdo o Derecho) | Clic derecho / Botón ⚡ |
| **Bomba Nova (Pantalla)** | Tecla `B` | Botón 💣 |
| **Pausar / Reanudar** | Tecla `P` o `Escape` | Botón ⏸️ en el HUD |
| **Activar / Silenciar Sonido**| — | Botón 🔊 en el HUD |

---

## ✨ Características Principales

### 1. 🛸 3 Cazas Estelares Seleccionables
- **AURORA X-1**: Caza interceptor equilibrado con cañones de plasma dobles y velocidad constante.
- **ESPECTRO V**: Caza de reconocimiento hiperrápido, mayor velocidad de disparo y recarga de turbo acelerada.
- **TITÁN MK-II**: Acorazado estelar fuertemente blindado, mayor resistencia de casco y escudo frontal reforzado.

### 2. 👾 Enemigos y Amenazas Diversificadas
- **Caza Explorador**: Ágil con trayectoria sinusoidal.
- **Caza Asaltante**: Rápido, dispara salvas dirigidas a la posición actual del jugador.
- **Fragata Pesada**: Alto blindaje y fuego disperso en abanico (3 vías).
- **Asteroide Galáctico**: Amenaza destructible que al romperse se fragmenta en pedazos menores.
- **Jefe Titánico (Dreadnought "Némesis")**: Aparece cada 4 oleadas con barra de salud dedicada, transiciones de fase táctica, modo furia y patrones de proyectiles estilo bullet-hell.

### 3. 💥 Mejoras y Power-Ups (Drops)
- 🔫 **Mejora de Armamento**: Progresión de 5 niveles (Cañón simple → Doble → Triple abanico → Láser cuádruple → Quíntuple aniquilador de plasma).
- 🛡️ **Regenerador de Escudo**: Restaura el escudo y otorga nanobots reparadores de casco.
- 💣 **Bomba Nova**: Almacena bombas tácticas que limpian proyectiles enemigos y dañan todo el sector.
- ⚡ **Batería de Turbo**: Restaura inmediatamente la reserva de energía para esquivas continuas.

### 4. 🔊 Audio Procedural 100% Nativo (Web Audio API)
- No requiere archivos de audio externos (`.mp3` o `.wav`).
- Genera en tiempo real mediante osciladores, envolventes y filtros:
  - Disparos láser y plasma.
  - Explosiones con ruido blanco filtrado.
  - Alerta sónica de aproximación de Jefe.
  - Impactos de escudo y recolección de mejoras.
  - **Banda sonora synthwave** generada proceduralmente en bucle.

### 5. 🌟 Motor Gráfico y Efectos Visuales ("Game Juice")
- Fondo de estrellas multicapa con efecto parallax y nebulosas espaciales.
- Sistema de partículas dinámico (fuegos de tobera, chispas de impacto, fragmentos y ondas expansivas).
- Efecto de balanceo/inclinación de las naves al virar a los lados.
- Sacudida de pantalla (*screen shake*) en explosiones intensas y bombas.
- Sistema de combos de puntuación y persistencia de récord (*High Score*) en `localStorage`.

---

## 🚀 ¿Cómo Ejecutar el Juego?

1. **Directamente en tu navegador:**
   - Haz doble clic sobre el archivo `index.html` en el explorador de archivos.
   - O ábrelo arrastrándolo a Google Chrome, Microsoft Edge, Mozilla Firefox o Brave.
2. **Con VS Code:**
   - Haz clic derecho sobre `index.html` y selecciona **"Open with Live Server"**.

