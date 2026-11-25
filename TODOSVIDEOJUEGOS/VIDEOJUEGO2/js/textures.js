/**
 * TEXTURES.JS - Generador Procedural de Texturas Canvas para Casa Completa
 * 100% sintetizado en tiempo de ejecución sin dependencias externas.
 */

const TextureGenerator = {
  /**
   * Piso de madera de parquet para Dormitorio y Sala
   */
  createWoodFloor() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1a130c';
    ctx.fillRect(0, 0, 512, 512);

    const plankHeight = 32;
    const rows = 512 / plankHeight;

    for (let i = 0; i < rows; i++) {
      const y = i * plankHeight;
      const offset = (i % 2) * 128;
      const shade = 18 + Math.floor(Math.sin(i * 1.7) * 8);
      ctx.fillStyle = `rgb(${shade + 8}, ${shade + 2}, ${shade - 4})`;
      ctx.fillRect(0, y, 512, plankHeight - 2);

      ctx.strokeStyle = 'rgba(10, 6, 3, 0.45)';
      ctx.lineWidth = 1;
      for (let j = 0; j < 5; j++) {
        ctx.beginPath();
        const lineY = y + Math.random() * plankHeight;
        ctx.moveTo(0, lineY);
        ctx.bezierCurveTo(
          150, lineY + (Math.random() - 0.5) * 6,
          350, lineY + (Math.random() - 0.5) * 6,
          512, lineY
        );
        ctx.stroke();
      }

      ctx.fillStyle = '#0a0705';
      for (let x = offset; x < 512; x += 256) {
        ctx.fillRect(x, y, 2, plankHeight);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  },

  /**
   * Azulejos de Baño (Baldosas ajedrezadas blancas y negras mugrientas)
   */
  createBathroomTileFloor() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const tileSize = 32;
    for (let x = 0; x < 256; x += tileSize) {
      for (let y = 0; y < 256; y += tileSize) {
        const isWhite = ((x / tileSize) + (y / tileSize)) % 2 === 0;
        ctx.fillStyle = isWhite ? '#b2bec3' : '#1e272e';
        ctx.fillRect(x, y, tileSize, tileSize);

        // Manchas y suciedad en las juntas
        ctx.strokeStyle = '#0a0d10';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, tileSize, tileSize);

        if (Math.random() < 0.3) {
          ctx.fillStyle = 'rgba(60, 40, 20, 0.25)';
          ctx.fillRect(x + 4, y + 4, tileSize - 8, tileSize - 8);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);
    return texture;
  },

  /**
   * Baldosas de Cocina (Terracota oscura gastada)
   */
  createKitchenTileFloor() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const tileSize = 64;
    for (let x = 0; x < 256; x += tileSize) {
      for (let y = 0; y < 256; y += tileSize) {
        ctx.fillStyle = '#3a2018';
        ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

        ctx.fillStyle = 'rgba(20, 10, 8, 0.4)';
        ctx.fillRect(x, y, tileSize, 2);
        ctx.fillRect(x, y, 2, tileSize);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);
    return texture;
  },

  /**
   * Papel tapiz para el Dormitorio
   */
  createWallpaper() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#17151a';
    ctx.fillRect(0, 0, 512, 512);

    const stripeWidth = 32;
    for (let x = 0; x < 512; x += stripeWidth) {
      if ((x / stripeWidth) % 2 === 0) {
        ctx.fillStyle = '#100e13';
        ctx.fillRect(x, 0, stripeWidth, 512);
      }
    }

    ctx.strokeStyle = 'rgba(60, 45, 55, 0.22)';
    ctx.lineWidth = 1.5;
    for (let x = 16; x < 512; x += 32) {
      for (let y = 16; y < 512; y += 48) {
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 2);
    return texture;
  },

  /**
   * Paredes de Pasillo (Yeso agrietado y descascarado)
   */
  createHallwayWall() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#191b17';
    ctx.fillRect(0, 0, 512, 512);

    // Manchas de humedad verdosas
    for (let i = 0; i < 15; i++) {
      ctx.fillStyle = 'rgba(25, 35, 25, 0.25)';
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 512, 40 + Math.random() * 60, 0, Math.PI * 2);
      ctx.fill();
    }

    // Grietas
    ctx.strokeStyle = '#0b0c0a';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      let cx = Math.random() * 512;
      let cy = Math.random() * 512;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let j = 0; j < 8; j++) {
        cx += (Math.random() - 0.5) * 40;
        cy += Math.random() * 30;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2);
    return texture;
  },

  /**
   * Azulejos de pared de Baño
   */
  createBathroomWall() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#353b48';
    ctx.fillRect(0, 0, 256, 256);

    const w = 48;
    const h = 24;
    ctx.strokeStyle = '#1e272e';
    ctx.lineWidth = 2;

    for (let y = 0; y < 256; y += h) {
      const offsetX = ((y / h) % 2) * (w / 2);
      for (let x = -w; x < 256 + w; x += w) {
        ctx.fillStyle = '#4b5568';
        ctx.fillRect(x + offsetX + 1, y + 1, w - 2, h - 2);
        ctx.strokeRect(x + offsetX, y, w, h);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);
    return texture;
  },

  /**
   * Techo
   */
  createCeiling() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#131417';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.fillStyle = 'rgba(40, 40, 45, 0.15)';
      ctx.fillRect(x, y, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 6);
    return texture;
  },

  /**
   * Madera para muebles
   */
  createFurnitureWood() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1e130c';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = 'rgba(45, 25, 18, 0.4)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) {
      const y = i * 6;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(80, y + 2, 180, y - 2, 256, y);
      ctx.stroke();
    }

    return new THREE.CanvasTexture(canvas);
  },

  /**
   * Esfera del reloj
   */
  createClockDial() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const radGrad = ctx.createRadialGradient(256, 256, 100, 256, 256, 256);
    radGrad.addColorStop(0, '#f2ecd9');
    radGrad.addColorStop(0.8, '#d4c5a0');
    radGrad.addColorStop(1, '#8f7e59');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#382212';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(256, 256, 246, 0, Math.PI * 2);
    ctx.stroke();

    const numerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    ctx.fillStyle = '#1c140d';
    ctx.font = 'bold 36px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6 - Math.PI / 2;
      const x = 256 + Math.cos(angle) * 180;
      const y = 256 + Math.sin(angle) * 180;
      ctx.fillText(numerals[i], x, y);
    }

    return new THREE.CanvasTexture(canvas);
  },

  /**
   * Alfombra vintage
   */
  createRug() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#4a151b';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 16;
    ctx.strokeRect(20, 20, 472, 472);

    ctx.fillStyle = '#1c2833';
    ctx.beginPath();
    ctx.arc(256, 256, 120, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  },

  /**
   * Sabanas de cama
   */
  createFabric() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#3c4046';
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
  },

  /**
   * Textura de Metal para caja de fusibles y electrodomésticos
   */
  createMetalPanel() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#2d3436';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#636e72';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 248, 248);

    return new THREE.CanvasTexture(canvas);
  }
};
