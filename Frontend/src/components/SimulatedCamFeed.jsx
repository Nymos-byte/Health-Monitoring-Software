import { useEffect, useRef } from 'react';

const WIDTH = 640;
const HEIGHT = 360;
const LIVE_FPS = 15;
export const SNAPSHOT_INTERVAL_MS = 10000;

// Small deterministic random so each astronaut's scene keeps the same layout
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function drawStars(ctx, rand, t, drift) {
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 90; i++) {
    const x = (rand() * WIDTH + t * drift) % WIDTH;
    const y = rand() * HEIGHT;
    ctx.globalAlpha = 0.3 + rand() * 0.7;
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;
}

const scenes = {
  // Spacewalk from the station: Earth limb below, station truss, gloved hand in view
  eva_orbit(ctx, t, rand) {
    ctx.fillStyle = '#02040a';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawStars(ctx, rand, t, 2);
    const earth = ctx.createRadialGradient(320, 900, 500, 320, 900, 720);
    earth.addColorStop(0, '#1d4f91');
    earth.addColorStop(0.9, '#3b8fd9');
    earth.addColorStop(1, 'rgba(120,190,255,0)');
    ctx.fillStyle = earth;
    ctx.beginPath();
    ctx.arc(320, 900, 720, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 6; i++) {
      const x = ((i * 130 + t * 6) % 760) - 60;
      ctx.beginPath();
      ctx.ellipse(x, 250 + (i % 3) * 25, 50, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#8a8f99';
    ctx.fillRect(0, 120, 260, 22);
    for (let x = 10; x < 260; x += 40) ctx.fillRect(x, 100, 6, 60);
    ctx.fillStyle = '#e8e8e8';
    ctx.beginPath();
    ctx.ellipse(500, 330 + Math.sin(t * 1.3) * 8, 90, 55, -0.4, 0, Math.PI * 2);
    ctx.fill();
  },
  // Station module: corridor perspective with racks and handrails
  space_station(ctx, t, rand) {
    ctx.fillStyle = '#c9ccd1';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    for (let i = 0; i < 6; i++) {
      const inset = i * 32;
      ctx.strokeStyle = `rgba(80,85,95,${0.2 + i * 0.1})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(inset * 1.6, inset, WIDTH - inset * 3.2, HEIGHT - inset * 2);
    }
    ctx.fillStyle = '#5b6170';
    ctx.fillRect(250, 140, 140, 80);
    const colors = ['#d9534f', '#f0ad4e', '#5bc0de', '#5cb85c'];
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
      ctx.fillRect(30 + rand() * 120, 40 + rand() * 280, 18, 10);
      ctx.fillRect(490 + rand() * 120, 40 + rand() * 280, 18, 10);
    }
    ctx.fillStyle = '#e0c068';
    ctx.fillRect(170, 90 + Math.sin(t) * 2, 300, 6);
  },
  // Capsule cockpit: window with drifting stars, lit control panel
  spacecraft(ctx, t, rand) {
    ctx.fillStyle = '#15181f';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(150, 30);
    ctx.lineTo(490, 30);
    ctx.lineTo(560, 210);
    ctx.lineTo(80, 210);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = '#01030a';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawStars(ctx, rand, t, 4);
    ctx.fillStyle = '#9aa3ad';
    ctx.beginPath();
    ctx.arc(420, 90, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#2a2f3a';
    ctx.fillRect(0, 230, WIDTH, 130);
    for (let i = 0; i < 24; i++) {
      const on = Math.sin(t * 2 + i) > 0;
      ctx.fillStyle = on ? ['#5cb85c', '#f0ad4e', '#5bc0de'][i % 3] : '#3a3f4a';
      ctx.fillRect(40 + (i % 12) * 48, 255 + Math.floor(i / 12) * 40, 22, 12);
    }
  },
  // Pre-flight lab on Earth
  earth_preflight(ctx, t) {
    const wall = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    wall.addColorStop(0, '#e9e4da');
    wall.addColorStop(1, '#b9b2a6');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#fffbe8';
    for (let x = 80; x < WIDTH; x += 180) ctx.fillRect(x, 10, 110, 10);
    ctx.fillStyle = '#7c8591';
    ctx.fillRect(60, 200, 260, 120);
    ctx.fillStyle = '#2f3540';
    ctx.fillRect(380, 150, 200, 130);
    ctx.fillStyle = '#4fc3f7';
    ctx.fillRect(395, 165, 170, 70 + Math.sin(t) * 2);
  },
  // Lunar surface EVA: grey regolith, black sky, Earth low on the horizon, habitat behind
  lunar_surface(ctx, t, rand) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawStars(ctx, rand, 0, 0);
    ctx.fillStyle = '#3b82c4';
    ctx.beginPath();
    ctx.arc(520, 70, 22, 0, Math.PI * 2);
    ctx.fill();
    const ground = ctx.createLinearGradient(0, 200, 0, HEIGHT);
    ground.addColorStop(0, '#8d8d8d');
    ground.addColorStop(1, '#4a4a4a');
    ctx.fillStyle = ground;
    ctx.beginPath();
    ctx.moveTo(0, 215);
    for (let x = 0; x <= WIDTH; x += 40) ctx.lineTo(x, 205 + Math.sin(x * 0.03) * 8);
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.lineTo(0, HEIGHT);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.ellipse(rand() * WIDTH, 240 + rand() * 110, 20 + rand() * 30, 6 + rand() * 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#d9d9d9';
    ctx.beginPath();
    ctx.ellipse(130, 205, 70, 40, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#e8e8e8';
    ctx.beginPath();
    ctx.ellipse(480, 330 + Math.sin(t * 1.1) * 8, 90, 50, -0.3, 0, Math.PI * 2);
    ctx.fill();
  },
  // Inside the lunar habitat: curved walls, round window onto the surface
  lunar_habitat(ctx, t) {
    ctx.fillStyle = '#d8d2c4';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = 'rgba(90,85,75,0.5)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(320, 380, 360 - i * 40, 300 - i * 30, 0, Math.PI, 0);
      ctx.stroke();
    }
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(320, 140, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(320, 140, 66, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#7a7a7a';
    ctx.fillRect(250, 160, 140, 60);
    ctx.restore();
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(40, 250, 200, 90);
    ctx.fillStyle = '#4fc3f7';
    ctx.fillRect(420, 240, 160, 60 + Math.sin(t) * 2);
  },
  // Post-flight rehabilitation: bright room, parallel bars, treadmill
  earth_postflight(ctx, t) {
    ctx.fillStyle = '#eef1f4';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#c9d3dc';
    ctx.fillRect(0, 250, WIDTH, 110);
    ctx.fillStyle = '#8a96a3';
    ctx.fillRect(80, 180, 300, 8);
    ctx.fillRect(80, 220, 300, 8);
    for (const x of [80, 372]) ctx.fillRect(x, 180, 8, 90);
    ctx.fillStyle = '#39424e';
    ctx.fillRect(430, 200, 160, 70);
    ctx.fillStyle = '#5bc0de';
    ctx.fillRect(445, 170 + Math.sin(t) * 2, 60, 22);
  },
};

function drawFrame(ctx, scene, seed, t) {
  const rand = rng(seed);
  ctx.save();
  // Body-worn camera: slight sway from the astronaut's movement
  ctx.translate(Math.sin(t * 0.8) * 4, Math.cos(t * 0.6) * 3);
  (scenes[scene] || scenes.space_station)(ctx, t, rand);
  ctx.restore();
  // Sensor noise and scanlines
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 400; i++) ctx.fillRect(Math.random() * WIDTH, Math.random() * HEIGHT, 1, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 0; y < HEIGHT; y += 3) ctx.fillRect(0, y, WIDTH, 1);
  const vignette = ctx.createRadialGradient(320, 180, 120, 320, 180, 380);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

// mode: 'live' redraws continuously; 'snapshot' redraws only every SNAPSHOT_INTERVAL_MS
export default function SimulatedCamFeed({ scene, seed, mode }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    const start = performance.now();
    const render = () => drawFrame(ctx, scene, seed, (performance.now() - start) / 1000);
    render();

    if (mode === 'snapshot') {
      const interval = setInterval(render, SNAPSHOT_INTERVAL_MS);
      return () => clearInterval(interval);
    }
    let frame;
    let last = 0;
    const loop = (ts) => {
      if (ts - last >= 1000 / LIVE_FPS) {
        last = ts;
        render();
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [scene, seed, mode]);

  return <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="w-full h-full object-cover" />;
}
