export class Player {
  constructor(x, y, username = null, avatarUrl = null) {
    this.initialX = x;
    this.initialY = y;
    this.x = x;
    this.y = y;
    this.width = 40;
    this.height = 60;
    this.velocityX = 0;
    this.velocityY = 0;
    this.speed = 5;
    this.jumpForce = 15;
    this.gravity = 0.8;
    this.isJumping = false;
    this.username = username;
    this.avatarUrl = avatarUrl;
    this.color = this.generateColor(); // Random color for each player

    // Add collision response properties
    this.mass = 1;
    this.bounciness = 0.5; // How bouncy collisions are between players
    this.pushForce = 3; // How strongly players push each other

    // Add shadow blur and text shadow for better visibility
    this.shadowBlur = 2;
    this.textShadowColor = 'rgba(0,0,0,0.5)';
    
    // Store username and make sure it persists
    this.username = username;
    this.avatarUrl = avatarUrl;
    
    // Add an onload handler for the avatar image
    if (this.avatarUrl) {
      this.avatarImage = new Image();
      this.avatarImage.src = this.avatarUrl;
      this.avatarImage.onload = () => {
        this.avatarLoaded = true;
      };
    }
  }

  generateColor() {
    // Generate a bright, distinctive color
    const hue = Math.random() * 360;
    return `hsl(${hue}, 70%, 60%)`;
  }

  respawn() {
    // Reset position to initial spawn point
    this.x = this.initialX;
    this.y = this.initialY;
    // Reset velocities
    this.velocityX = 0;
    this.velocityY = 0;
    this.isJumping = false;
  }

  moveLeft() {
    this.velocityX = -this.speed;
  }

  moveRight() {
    this.velocityX = this.speed;
  }

  jump() {
    if (!this.isJumping) {
      this.velocityY = -this.jumpForce;
      this.isJumping = true;
    }
  }

  update() {
    // Apply gravity
    this.velocityY += this.gravity;

    // Update position
    this.x += this.velocityX;
    this.y += this.velocityY;

    // Apply friction
    this.velocityX *= 0.9;

    // Check if player fell too far - trigger respawn
    if (this.y > 1200) {
      this.respawn();
    }
  }

  checkCollision(platform) {
    return (
      this.x < platform.x + platform.width &&
      this.x + this.width > platform.x &&
      this.y < platform.y + platform.height &&
      this.y + this.height > platform.y
    );
  }

  handleCollision(platform) {
    // Calculate overlap on each axis
    const overlapX = Math.min(
      Math.abs((this.x + this.width) - platform.x),
      Math.abs(this.x - (platform.x + platform.width))
    );

    const overlapY = Math.min(
      Math.abs((this.y + this.height) - platform.y),
      Math.abs(this.y - (platform.y + platform.height))
    );

    // Resolve collision on axis with smallest overlap
    if (overlapX < overlapY) {
      // Horizontal collision
      if (this.x < platform.x) {
        this.x = platform.x - this.width;
      } else {
        this.x = platform.x + platform.width;
      }
      this.velocityX = 0;
    } else {
      // Vertical collision  
      if (this.y < platform.y) {
        this.y = platform.y - this.height;
        this.velocityY = 0;
        this.isJumping = false;
      } else {
        this.y = platform.y + platform.height;
        this.velocityY = 0;
      }
    }
  }

  draw(ctx) {
    // Draw shadow 
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(
      this.x + this.width/2,
      1000,
      this.width/2,
      this.width/4,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Draw character body 
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Add shading 
    ctx.fillStyle = this.adjustColor(this.color, -20);
    ctx.fillRect(this.x + this.width * 0.8, this.y, this.width * 0.2, this.height);

    // Always draw username if available - moved outside the username check
    if (this.username) {
      // Draw text shadow for better visibility
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      
      // Thicker shadow for better readability
      for(let i = -2; i <= 2; i++) {
        for(let j = -2; j <= 2; j++) {
          if(i === 0 && j === 0) continue;
          ctx.fillText('@' + this.username, 
            this.x + this.width/2 + i, 
            this.y - 10 + j
          );
        }
      }
      
      // Draw main text
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('@' + this.username, this.x + this.width/2, this.y - 10);

      // Draw avatar if available and loaded
      if (this.avatarUrl && this.avatarLoaded) {
        const avatarSize = 20;
        const avatarX = this.x + this.width/2 - avatarSize/2;
        const avatarY = this.y - 40;
        
        // Draw avatar background/border
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2 + 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw avatar in circular mask
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(this.avatarImage, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();
      }
    }
  }

  adjustColor(color, amount) {
    // Helper to darken/lighten HSL color
    if (color.startsWith('hsl')) {
      const [h, s, l] = color.match(/\d+/g).map(Number);
      return `hsl(${h}, ${s}%, ${Math.max(0, Math.min(100, l + amount))}%)`;
    }
    return color;
  }

  checkPlayerCollision(otherPlayer) {
    return (
      this.x < otherPlayer.x + otherPlayer.width &&
      this.x + this.width > otherPlayer.x &&
      this.y < otherPlayer.y + otherPlayer.height &&
      this.y + this.height > otherPlayer.y
    );
  }

  handlePlayerCollision(otherPlayer) {
    // Calculate collision normal
    const dx = (this.x + this.width/2) - (otherPlayer.x + otherPlayer.width/2);
    const dy = (this.y + this.height/2) - (otherPlayer.y + otherPlayer.height/2);
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return; // Prevent division by zero

    const nx = dx / distance;
    const ny = dy / distance;

    // Calculate relative velocity
    const rvx = this.velocityX - otherPlayer.velocityX;
    const rvy = this.velocityY - otherPlayer.velocityY;

    // Calculate relative velocity in terms of normal direction
    const velAlongNormal = rvx * nx + rvy * ny;

    // Don't resolve if objects are moving apart
    if (velAlongNormal > 0) return;

    // Calculate impulse scalar
    const j = -(1 + this.bounciness) * velAlongNormal;
    const impulseMagnitude = j / (1/this.mass + 1/otherPlayer.mass);

    // Apply impulse
    const impulseX = nx * impulseMagnitude * this.pushForce;
    const impulseY = ny * impulseMagnitude * this.pushForce;

    // Update velocities
    this.velocityX += impulseX / this.mass;
    this.velocityY += impulseY / this.mass;
    otherPlayer.velocityX -= impulseX / otherPlayer.mass;
    otherPlayer.velocityY -= impulseY / otherPlayer.mass;

    // Separate the players to prevent sticking
    const overlap = (this.width + otherPlayer.width)/2 - distance;
    if (overlap > 0) {
      const separationX = nx * overlap/2;
      const separationY = ny * overlap/2;
      
      this.x += separationX;
      this.y += separationY;
      otherPlayer.x -= separationX;
      otherPlayer.y -= separationY;
    }
  }

  serialize() {
    return {
      x: this.x,
      y: this.y,
      velocityX: this.velocityX,
      velocityY: this.velocityY,
      isJumping: this.isJumping,
      username: this.username,
      avatarUrl: this.avatarUrl,
      mass: this.mass
    };
  }

  deserialize(data) {
    this.x = data.x;
    this.y = data.y;
    this.velocityX = data.velocityX;
    this.velocityY = data.velocityY;
    this.isJumping = data.isJumping;
    // Make sure username and avatarUrl persist after deserialization
    if (!this.username) {
      this.username = data.username;
    }
    if (!this.avatarUrl && data.avatarUrl) {
      this.avatarUrl = data.avatarUrl;
      this.avatarImage = new Image();
      this.avatarImage.src = data.avatarUrl;
      this.avatarImage.onload = () => {
        this.avatarLoaded = true;
      };
    }
    this.mass = data.mass;
  }
}