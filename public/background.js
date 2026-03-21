class NeuralNetwork {
  constructor() {
    this.canvas = document.getElementById('bg-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.nodes = [];
    this.ripples = [];
    this.pulses = [];
    this.rippleTimer = 0;
    this.pulseTimer = 0;
    this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.width = 0;
    this.height = 0;
    this.time = 0;

    // Aurora blobs — large drifting color fields
    this.blobs = [];

    this.colors = {
      primary: [0, 255, 200],
      secondary: [34, 68, 255],
      dim: [100, 100, 140],
    };

    this.resize();
    this.populate();
    this.createBlobs();
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

  createBlobs() {
    this.blobs = [];
    for (let i = 0; i < 4; i++) {
      this.blobs.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        radius: 250 + Math.random() * 200,
        color: i % 2 === 0 ? this.colors.primary : this.colors.secondary,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.003 + Math.random() * 0.004,
      });
    }
  }

  populate() {
    this.nodes = [];
    const area = this.width * this.height;

    // Deep layer — distant faint stars
    const starCount = Math.min(220, Math.floor(area / 7000));
    for (let i = 0; i < starCount; i++) {
      this.nodes.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        z: Math.random() * 0.25 + 0.08,
        vx: (Math.random() - 0.5) * 0.06,
        vy: (Math.random() - 0.5) * 0.06,
        radius: Math.random() * 0.8 + 0.3,
        layer: 0,
        color: this.colors.dim,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: Math.random() * 0.004 + 0.002,
      });
    }

    // Mid layer — network nodes with connections
    const midCount = Math.min(85, Math.floor(area / 14000));
    for (let i = 0; i < midCount; i++) {
      this.nodes.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        z: Math.random() * 0.35 + 0.35,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        radius: Math.random() * 1.5 + 0.8,
        layer: 1,
        color: Math.random() > 0.35 ? this.colors.primary : this.colors.secondary,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: Math.random() * 0.008 + 0.004,
      });
    }

    // Near layer — large glowing orbs
    const nearCount = Math.min(7, Math.floor(area / 100000) + 2);
    for (let i = 0; i < nearCount; i++) {
      this.nodes.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        z: Math.random() * 0.2 + 0.8,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
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
        this.createBlobs();
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

  drawAurora() {
    for (const blob of this.blobs) {
      blob.x += blob.vx;
      blob.y += blob.vy;
      blob.phase += blob.phaseSpeed;

      // Soft wrap
      if (blob.x < -blob.radius) blob.x += this.width + blob.radius * 2;
      if (blob.x > this.width + blob.radius) blob.x -= this.width + blob.radius * 2;
      if (blob.y < -blob.radius) blob.y += this.height + blob.radius * 2;
      if (blob.y > this.height + blob.radius) blob.y -= this.height + blob.radius * 2;

      const breathe = Math.sin(blob.phase) * 0.3 + 1;
      const r = blob.radius * breathe;
      const [cr, cg, cb] = blob.color;

      const grad = this.ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, r);
      grad.addColorStop(0, `rgba(${cr},${cg},${cb},0.045)`);
      grad.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.018)`);
      grad.addColorStop(1, 'transparent');

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(blob.x, blob.y, r, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawConnections() {
    const linked = this.nodes.filter((n) => n.layer >= 1);
    const threshold = 175;
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
          const alpha = (1 - dist / threshold) * 0.18 * Math.min(a.z, b.z);

          // Gradient line between nodes of different colors
          const [cr1, cg1, cb1] = a.color;
          const [cr2, cg2, cb2] = b.color;

          const grad = this.ctx.createLinearGradient(ap.x, ap.y, bp.x, bp.y);
          grad.addColorStop(0, `rgba(${cr1},${cg1},${cb1},${alpha})`);
          grad.addColorStop(1, `rgba(${cr2},${cg2},${cb2},${alpha})`);

          this.ctx.strokeStyle = grad;
          this.ctx.lineWidth = 0.6;
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
    if (this.rippleTimer > 160 + Math.random() * 120) {
      this.rippleTimer = 0;
      const sources = this.nodes.filter((n) => n.layer >= 1);
      const src = sources[Math.floor(Math.random() * sources.length)];
      if (src) {
        this.ripples.push({
          x: src.x,
          y: src.y,
          z: src.z,
          r: 0,
          maxR: 100 + Math.random() * 80,
          speed: 0.5 + Math.random() * 0.4,
          color: src.color,
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
      const [cr, cg, cb] = rp.color;
      this.ctx.strokeStyle = `rgba(${cr},${cg},${cb},${life * 0.1})`;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, rp.r, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  drawPulses() {
    // Data pulses — light traveling along connections
    this.pulseTimer++;
    if (this.pulseTimer > 80 + Math.random() * 60) {
      this.pulseTimer = 0;
      const linked = this.nodes.filter((n) => n.layer >= 1);
      if (linked.length >= 2) {
        const a = linked[Math.floor(Math.random() * linked.length)];
        // Find closest neighbor
        let closest = null;
        let closestDist = Infinity;
        for (const b of linked) {
          if (b === a) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = dx * dx + dy * dy;
          if (d < 175 * 175 && d < closestDist) {
            closestDist = d;
            closest = b;
          }
        }
        if (closest) {
          this.pulses.push({
            from: a,
            to: closest,
            t: 0,
            speed: 0.012 + Math.random() * 0.008,
            color: a.color,
          });
        }
      }
    }

    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const pulse = this.pulses[i];
      pulse.t += pulse.speed;

      if (pulse.t >= 1) {
        this.pulses.splice(i, 1);
        continue;
      }

      const fp = this.projected(pulse.from);
      const tp = this.projected(pulse.to);
      const x = fp.x + (tp.x - fp.x) * pulse.t;
      const y = fp.y + (tp.y - fp.y) * pulse.t;
      const [cr, cg, cb] = pulse.color;
      const alpha = Math.sin(pulse.t * Math.PI) * 0.8;

      const grad = this.ctx.createRadialGradient(x, y, 0, x, y, 8);
      grad.addColorStop(0, `rgba(${cr},${cg},${cb},${alpha})`);
      grad.addColorStop(1, 'transparent');
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 8, 0, Math.PI * 2);
      this.ctx.fill();
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
        const glowR = n.layer === 2 ? r * 12 : r * 7;
        const glowA = n.layer === 2 ? 0.14 : 0.07;
        const grad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
        grad.addColorStop(0, `rgba(${cr},${cg},${cb},${glowA * n.z})`);
        grad.addColorStop(0.5, `rgba(${cr},${cg},${cb},${glowA * n.z * 0.3})`);
        grad.addColorStop(1, 'transparent');
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Core dot
      this.ctx.globalAlpha = n.z * (n.layer === 0 ? 0.35 : 0.9);
      this.ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, Math.max(r, 0.4), 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    }
  }

  loop() {
    this.time++;
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawAurora();
    this.drawConnections();
    this.drawPulses();
    this.drawRipples();
    this.drawNodes();
    requestAnimationFrame(() => this.loop());
  }
}

document.addEventListener('DOMContentLoaded', () => new NeuralNetwork());
