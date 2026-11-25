# La Habitación del Sonámbulo (Edición Casa Completa)
### Videojuego 3D de Terror Psicológico, Demonio Acechador y 10 Minijuegos Diegéticos

Desarrollado con **HTML5, CSS3, JavaScript ES6 puro, Three.js (vía CDN) y la Web Audio API**.

---

## 🎮 Novedades y Mecánicas Principales

### 1. Casa Completa Exploratoria en 3D
La experiencia ya no está confinada a una sola habitación. Ahora puedes explorar una **casa completa de 20x22 metros** con iluminación volumétrica y 7 zonas interconectadas:
1. **Dormitorio Principal:** Cama donde yace tu cuerpo inmóvil, escritorio con lámpara, diario y reloj de pared.
2. **Pasillo Central:** Pasillo lúgubre con bombilla titilante que conecta todas las habitaciones.
3. **Cuarto de Baño:** Azulejos ajedrezados, lavamanos con grifo de agua fría y espejo empañado.
4. **Cocina:** Estufa con quemadores de gas, tetera silbante y tubería con fuga rítmica.
5. **Sala de Estar:** Televisor de tubo CRT descalibrado, grabadora de casete VHS y mesa de centro.
6. **Estudio / Despacho:** Máquina de escribir mecánica para anclaje cognitivo y estanterías viejas.
7. **Cuarto Eléctrico / Sótano:** Caja central de fusibles con palancas térmicas de seguridad.

---

### 2. Linterna con Batería Dinámica `[F]`
- Pulsa **[F]** para encender o apagar la linterna.
- La batería se desgasta constantemente al estar encendida (~1.45%/seg).
- Al caer por debajo del 20%, el foco empieza a titilar de forma errática.
- Al agotarse la batería, la linterna se apaga y la oscuridad incrementa la pérdida de lucidez un **50% más rápido**.
- **Recarga:** Completar minijuegos por la casa recarga la batería (la caja de fusibles aporta **+40%**).

---

### 3. El Demonio del Sueño (Mecánica de Tolerancia e Inmunidad a la Luz)
- Un espectro demoníaco acecha activamente por los pasillos y habitaciones persiguiendo al jugador.
- **Ahuyentar con la Linterna:** Si apuntas el haz de luz directamente a la criatura, se quemará y huirá a otra habitación.
- ⚠️ **ADVERTENCIA DE INMUNIDAD:**
  - El demonio posee un **Medidor de Tolerancia a la Luz** visible en el HUD superior.
  - Alumbrarlo repetidamente o de forma continuada aumenta su tolerancia.
  - Al llegar al **100% de Tolerancia**, el demonio **SE VUELVE INMUNE A LA LUZ** durante 18 segundos:
    - Sus ojos cambian a un violeta llameante.
    - Emite un rugido monstruoso.
    - Se desplaza al doble de velocidad.
    - La linterna no surtirá ningún efecto sobre él.
  - Si no lo alumbras, su tolerancia disminuye poco a poco.

---

### 4. Tableta de Tareas / Neuro-Monitor Somno-Pad `[TAB]`
- Pulsa **[TAB]** en cualquier momento para desplegar tu tableta diegética.
- Enumera en tiempo real los **10 minijuegos/tareas** distribuidos en la casa, su habitación, disponibilidad y contador de veces realizadas.

---

### 5. Enfriamiento Progresivo (Cada vez más demorado)
- Cada vez que completas una tarea con éxito, esta se reinicia pero **su tiempo de espera aumenta progresivamente** mediante la fórmula:
  $$\text{Cooldown} = \text{Base} \times (1 + \text{Veces Realizada} \times 0.75)$$
- Esto obliga al jugador a rotar constantemente entre las diferentes habitaciones de la casa para no quedarse sin tareas disponibles.

---

### 6. Catálogo de los 10 Minijuegos Diegéticos

| # | Tarea | Habitación | Mecánica de Resolución | Recompensas |
|---|---|---|---|---|
| **1** | **Enfoque Biológico** | Dormitorio | Mantener `[ESPACIO]` ante la caída de párpados para estabilizar el núcleo óptico. | +20% Lucidez, +5% Batería |
| **2** | **Reloj Mental Invertido** | Dormitorio | Sincronizar la aguja roja en la zona verde con controles y cámara girados 180°. | +35% Lucidez, +10% Batería |
| **3** | **Lavarse la Cara** | Baño | Hacer clic 6 veces rápidamente sobre el lavamanos para salpicar agua helada. | +25% Lucidez, +15% Batería |
| **4** | **Desempañar Espejo** | Baño | Arrastrar el ratón en círculos sobre el espejo para raspar el vapor condensado. | +22% Lucidez, +10% Batería |
| **5** | **Hervir Café / Tetera** | Cocina | Pulsar "Bombear Calor" para sostener la aguja de presión en la zona verde por 2s. | +28% Lucidez, +20% Batería |
| **6** | **Cerrar Fuga de Tubería** | Cocina | Sincronizar el clic de apriete justo cuando el cursor móvil cruza la zona azul. | +24% Lucidez, +15% Batería |
| **7** | **Sintonizar TV CRT** | Sala de Estar | Deslizar la perilla hasta encontrar la frecuencia lúcida (74 MHz) y disipar la estática. | +30% Lucidez, +25% Batería |
| **8** | **Rebobinar Casete** | Sala de Estar | Hacer clic continuo en "Girar Bobina" para enrollar la cinta magnética al 100%. | +26% Lucidez, +15% Batería |
| **9** | **Máquina de Escribir** | Estudio | Mecanografiar la palabra de anclaje a la realidad: `D-E-S-P-I-E-R-T-A`. | +35% Lucidez, +15% Batería |
| **10** | **Caja de Fusibles** | Cuarto Eléctrico | Subir las 4 palancas térmicas hacia arriba para restablecer la red de la casa. | +32% Lucidez, +40% Batería |

---

## ⌨️ Controles del Juego

- **W, A, S, D / Flechas:** Desplazamiento por la casa con detección de colisiones.
- **Ratón:** Mirar alrededor en 360° (requiere Pointer Lock).
- **F:** Encender / Apagar linterna.
- **TAB:** Abrir / Cerrar tableta Somno-Pad con lista de tareas y temporizadores.
- **E / Clic Izquierdo:** Interactuar con el objeto enfocado en la retícula.
- **Barra Espaciadora (mantener):** Forzar la vista y abrir párpados al nublarse la visión.
- **ESC:** Salir de cualquier minijuego o menú hacia el movimiento libre.

---

## 📁 Estructura del Código

```
VIDEOJUEGO2/
├── index.html            # Lienzo 3D, HUD, Tableta Somno-Pad y modales de los 10 minijuegos
├── README.md             # Documentación exhaustiva
├── css/
│   ├── style.css         # Postprocesamiento, grano VHS, scanlines, párpados y linterna
│   └── ui.css            # HUD con batería y demonio, tableta interactiva y 10 interfaces
└── js/
    ├── textures.js       # Generador procedural Canvas (azulejos, parquet, estática TV, metales)
    ├── audio.js          # Motor Web Audio API (quemadura del demonio, rugido, agua, fusibles, tetera)
    ├── entity.js         # IA del Demonio: acecho, huida con linterna e inmunidad adaptativa
    ├── controls.js       # Controlador FPS, colisiones AABB de 6 salas y detección de haz de linterna
    ├── scene.js          # Casa 3D multi-habitación (Three.js), muebles, linterna SpotLight y luces
    ├── minigames.js      # Lógica de los 10 minijuegos y sistema de enfriamiento progresivo
    ├── game.js           # Bucle principal, decaimiento rápido de lucidez, batería y reloj
    └── main.js           # Orquestador general, registro de los 10 interactables y renderizado
```

---

## 🚀 Cómo Jugar

1. Abre el archivo `index.html` en cualquier navegador moderno (Chrome, Edge, Firefox, Brave).
2. Haz clic en **"INICIAR EXPERIMENTO"** en la pantalla de bienvenida.
3. Administra tu linterna, escapa del demonio vigilando su medidor de tolerancia y viaja por las distintas salas realizando tareas para mantener la lucidez hasta las **06:00 AM**.
