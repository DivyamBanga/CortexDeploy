class NeuralNetwork {
  constructor() {
    this.canvas = document.getElementById('bg-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.nodes = [];
    this.ripples = [];
    this.rippleTimer = 0;
    this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.width = 0;
    this.height = 0;

    this.colors = {
      primary: [0, 255, 200],
      secondary: [34, 68, 255],
      dim: [100, 100, 140],
    };

    this.resize();
    this.populate();
    this.bind();
    this.loop();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  populate() {
    this.nodes = [];
    const area = this.width * this.height;

    // Deep layer — distant faint stars
    const starCount = Math.min(180, Math.floor(area / 9000));
    for (let i = 0; i < starCount; i++) {
      this.nodes.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        z: Math.random() * 0.25 + 0.08,
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.08,
        radius: Math.random() * 0.8 + 0.4,
        layer: 0,
        color: this.colors.dim,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: Math.random() * 0.004 + 0.002,
      });
    }

    // Mid layer — network nodes with connections
    const midCount = Math.min(70, Math.floor(area / 18000));
    for (let i = 0; i < midCount; i++) {
      this.nodes.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        z: Math.random() * 0.35 + 0.35,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        radius: Math.random() * 1.4 + 0.8,
        layer: 1,
        color: Math.random() > 0.4 ? this.colors.primary : this.colors.secondary,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: Math.random() * 0.008 + 0.004,
      });
    }

    // Near layer — large glowing orbs
    const nearCount = Math.min(6, Math.floor(area / 120000) + 2);
    for (let i = 0; i < nearCount; i++) {
      this.nodes.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        z: Math.random() * 0.2 + 0.8,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        radius: Math.random() * 2.5 + 2,
        layer: 2,
        color: this.colors.primary,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: Math.random() * 0.006 + 0.003,
      });
    }
  }

  bind() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.resize();
        this.populate();
      }, 150);
    });

    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
  }

  projected(node) {
    const px = (this.mouse.x - this.width * 0.5) * 0.02 * node.z;
    const py = (this.mouse.y - this.height * 0.5) * 0.02 * node.z;
    return { x: node.x + px, y: node.y + py };
  }

  drawConnections() {
    const linked = this.nodes.filter((n) => n.layer >= 1);
    const threshold = 160;
    const thresholdSq = threshold * threshold;

    for (let i = 0; i < linked.length; i++) {
      const a = linked[i];
      const ap = this.projected(a);

      for (let j = i + 1; j < linked.length; j++) {
        const b = linked[j];
        const bp = this.projected(b);

        const dx = ap.x - bp.x;
        const dy = ap.y - bp.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < thresholdSq) {
          const dist = Math.sqrt(distSq);
          const alpha = (1 - dist / threshold) * 0.14 * Math.min(a.z, b.z);

          this.ctx.strokeStyle = `rgba(0, 255, 200, ${alpha})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.beginPath();
          this.ctx.moveTo(ap.x, ap.y);
          this.ctx.lineTo(bp.x, bp.y);
          this.ctx.stroke();
        }
      }
    }
  }

  drawRipples() {
    this.rippleTimer++;
    if (this.rippleTimer > 200 + Math.random() * 160) {
      this.rippleTimer = 0;
      const sources = this.nodes.filter((n) => n.layer >= 1);
      const src = sources[Math.floor(Math.random() * sources.length)];
      if (src) {
        this.ripples.push({
          x: src.x,
          y: src.y,
          z: src.z,
          r: 0,
          maxR: 100 + Math.random() * 60,
          speed: 0.6 + Math.random() * 0.3,
        });
      }
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const rp = this.ripples[i];
      rp.r += rp.speed;
      const life = 1 - rp.r / rp.maxR;

      if (life <= 0) {
        this.ripples.splice(i, 1);
        continue;
      }

      const p = this.projected(rp);
      this.ctx.strokeStyle = `rgba(0, 255, 200, ${life * 0.1})`;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, rp.r, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  drawNodes() {
    for (const n of this.nodes) {
      // Drift
      n.x += n.vx;
      n.y += n.vy;
      n.phase += n.phaseSpeed;

      // Wrap
      if (n.x < -60) n.x += this.width + 120;
      if (n.x > this.width + 60) n.x -= this.width + 120;
      if (n.y < -60) n.y += this.height + 120;
      if (n.y > this.height + 60) n.y -= this.height + 120;

      const p = this.projected(n);
      const pulse = Math.sin(n.phase) * 0.25 + 1;
      const r = n.radius * n.z * pulse;
      const [cr, cg, cb] = n.color;

      // Glow halo for mid + near layers
      if (n.layer >= 1) {
        const glowR = n.layer === 2 ? r * 10 : r * 6;
        const glowA = n.layer === 2 ? 0.12 : 0.06;
        const grad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
        grad.addColorStop(0, `rgba(${cr},${cg},${cb},${glowA * n.z})`);
        grad.addColorStop(1, 'transparent');
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Core dot
      this.ctx.globalAlpha = n.z * (n.layer === 0 ? 0.35 : 0.85);
      this.ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, Math.max(r, 0.4), 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    }
  }

  loop() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawConnections();
    this.drawRipples();
    this.drawNodes();
    requestAnimationFrame(() => this.loop());
  }
}

document.addEventListener('DOMContentLoaded', () => new NeuralNetwork());
