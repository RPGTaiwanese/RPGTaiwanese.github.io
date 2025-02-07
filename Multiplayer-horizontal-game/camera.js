export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.scale = 1;
    this.lookAheadX = 0; 
    this.lookAheadAmount = 50; // Reduced from 200 to 50 for a much subtler effect
  }

  update(target) {
    const targetLookAhead = target.velocityX * this.lookAheadAmount;
    this.lookAheadX += (targetLookAhead - this.lookAheadX) * 0.1;

    const targetX = -target.x - this.lookAheadX + window.innerWidth/2;
    const targetY = -target.y + window.innerHeight/2;
    
    this.x += (targetX - this.x) * 0.05;
    this.y += (targetY - this.y) * 0.05;

    this.rotation = target.velocityX * 0.0002;
  }

  apply(ctx) {
    ctx.translate(window.innerWidth/2, window.innerHeight/2);
    
    ctx.rotate(this.rotation);
    
    ctx.scale(this.scale, this.scale);
    
    ctx.translate(-window.innerWidth/2 + this.x, -window.innerHeight/2 + this.y);
  }
}