import { Player } from './player.js';
import { Platform } from './platform.js';
import { Camera } from './camera.js';
import { TouchControls } from './touchControls.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.setCanvasSize();
    
    // Initialize multiplayer
    this.room = new WebsimSocket();
    this.otherPlayers = new Map();
    
    // Create local player with connection
    this.initializeMultiplayer();
    
    this.platforms = [
      // Base platforms with better spacing
      new Platform(0, 500, 800, 100),
      new Platform(-200, 500, 200, 100),
      new Platform(800, 500, 400, 100),
      
      // Middle platforms
      new Platform(300, 400, 200, 20),
      new Platform(600, 300, 200, 20),
      new Platform(100, 200, 200, 20),
      
      // Higher platforms
      new Platform(-100, 300, 150, 20),
      new Platform(900, 200, 150, 20),
      new Platform(400, 150, 150, 20),
      
      // Challenge platforms
      new Platform(700, 100, 80, 20),
      new Platform(900, 50, 80, 20),
      new Platform(1100, 0, 80, 20),
      
      // Floating islands
      new Platform(-300, 200, 120, 80),
      new Platform(-500, 300, 120, 80),
      new Platform(1200, 200, 120, 80),
      
      // Secret upper platforms
      new Platform(200, 0, 100, 20),
      new Platform(0, -100, 100, 20),
      new Platform(400, -150, 100, 20),
      
      // Lower platforms
      new Platform(-200, 700, 150, 20),
      new Platform(400, 650, 150, 20),
      new Platform(800, 750, 150, 20),
      
      // Far side platforms
      new Platform(-800, 400, 200, 20),
      new Platform(-600, 250, 200, 20),
      new Platform(1400, 400, 200, 20)
    ];
    
    this.camera = new Camera();
    this.touchControls = new TouchControls();
    
    window.addEventListener('resize', () => this.setCanvasSize());
    this.setupControls();
    
    // Add gradient sky background
    this.createSkyGradient();
  }

  async initializeMultiplayer() {
    // WebsimSocket auto-connects, so we can create player right away
    const userInfo = this.room.party.client;
    this.player = new Player(100, 300, userInfo.username, userInfo.avatarUrl);

    // Set up multiplayer event handlers
    this.setupMultiplayer();
  }

  setupMultiplayer() {
    // Handle other players joining/leaving
    this.room.party.subscribe((peers) => {
      for (const [peerId, peer] of Object.entries(peers)) {
        if (!this.otherPlayers.has(peerId) && peerId !== this.room.party.client.id) {
          this.otherPlayers.set(peerId, new Player(100, 300, peer.username, peer.avatarUrl));
        }
      }
      
      // Remove disconnected players
      for (const [peerId] of this.otherPlayers) {
        if (!peers[peerId]) {
          this.otherPlayers.delete(peerId);
        }
      }
    });

    // Handle player position updates
    this.room.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'player_update' && data.clientId !== this.room.party.client.id) {
        if (!this.otherPlayers.has(data.clientId)) {
          this.otherPlayers.set(data.clientId, new Player(100, 300));
        }
        const otherPlayer = this.otherPlayers.get(data.clientId);
        otherPlayer.deserialize(data.state);
      }
    };

    // Start sending position updates
    setInterval(() => {
      this.room.send({
        type: 'player_update',
        state: this.player.serialize()
      });
    }, 50); // Send 20 updates per second
  }

  createSkyGradient() {
    // Create an off-screen canvas for the sky gradient
    this.skyCanvas = document.createElement('canvas');
    this.skyCanvas.width = window.innerWidth;
    this.skyCanvas.height = window.innerHeight;
    const skyCtx = this.skyCanvas.getContext('2d');

    // Create gradient
    const gradient = skyCtx.createLinearGradient(0, 0, 0, this.skyCanvas.height);
    gradient.addColorStop(0, '#1e88e5');   // Light blue at top
    gradient.addColorStop(0.5, '#64b5f6'); // Mid blue
    gradient.addColorStop(1, '#bbdefb');   // Pale blue at horizon

    // Fill background
    skyCtx.fillStyle = gradient;
    skyCtx.fillRect(0, 0, this.skyCanvas.width, this.skyCanvas.height);

    // Add some subtle clouds using noise
    skyCtx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * this.skyCanvas.width;
      const y = Math.random() * (this.skyCanvas.height * 0.7);
      const width = 100 + Math.random() * 200;
      const height = 20 + Math.random() * 30;
      
      skyCtx.beginPath();
      skyCtx.ellipse(x, y, width/2, height/2, 0, 0, Math.PI * 2);
      skyCtx.fill();
    }
  }

  setCanvasSize() {
    // Use device pixel ratio for sharp rendering on mobile
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    
    // Recreate sky gradient when canvas is resized
    this.createSkyGradient();
  }

  setupControls() {
    this.keys = {};
    window.addEventListener('keydown', (e) =>!this.keys[e.code] ? this.keys[e.code] = true : null);
    window.addEventListener('keyup', (e) => this.keys[e.code] = false);

    // Prevent default touch behaviors
    document.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  }

  update() {
    // Handle keyboard controls
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
      this.player.moveLeft();
    }
    if (this.keys['ArrowRight'] || this.keys['KeyD']) {
      this.player.moveRight(); 
    }
    if (this.keys['Space'] || this.keys['ArrowUp'] || this.keys['KeyW']) {
      this.player.jump();
    }

    // Handle touch controls
    const touchInput = this.touchControls.getInput();
    if (touchInput.left) this.player.moveLeft();
    if (touchInput.right) this.player.moveRight();
    if (touchInput.jump) this.player.jump();

    // Update player first
    this.player.update();

    // Handle platform collisions
    let hasCollision = false;
    this.platforms.forEach(platform => {
      if (this.player.checkCollision(platform)) {
        this.player.handleCollision(platform);
        hasCollision = true;
      }
    });

    // Handle player-to-player collisions
    for (const [peerId, otherPlayer] of this.otherPlayers) {
      if (peerId !== this.room.party.client.id && 
          this.player.checkPlayerCollision(otherPlayer)) {
        this.player.handlePlayerCollision(otherPlayer);
        
        // Send immediate update after collision
        this.room.send({
          type: 'player_update',
          state: this.player.serialize()
        });
      }
    }

    // Set jumping state based on collisions
    if (hasCollision) {
      this.player.isJumping = false;
    }

    // Update camera to follow local player only
    this.camera.update(this.player);
  }

  render() {
    // Clear canvas with sky background instead of solid color
    this.ctx.drawImage(this.skyCanvas, 0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.camera.apply(this.ctx);

    // Draw platforms
    this.platforms.forEach(platform => platform.draw(this.ctx));
    
    // Draw other players
    for (const otherPlayer of this.otherPlayers.values()) {
      otherPlayer.draw(this.ctx);
    }
    
    // Draw local player
    this.player.draw(this.ctx);

    this.ctx.restore();

    // Draw touch controls overlay
    this.touchControls.draw(this.ctx);
  }

  gameLoop() {
    this.update();
    this.render();
    requestAnimationFrame(() => this.gameLoop());
  }

  start() {
    this.gameLoop();
  }
}