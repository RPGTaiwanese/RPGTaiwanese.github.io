export class Platform {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  draw(ctx) {
    // Draw main platform body
    ctx.fillStyle = '#43a047';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Draw top edge for 3D effect
    ctx.fillStyle = '#66bb6a';
    ctx.fillRect(this.x, this.y, this.width, 5);

    // Draw side edge for 3D effect
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(this.x + this.width - 5, this.y, 5, this.height);

    // Draw platform shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(
      this.x + this.width/2,
      1000,
      this.width/2,
      this.width/8,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}