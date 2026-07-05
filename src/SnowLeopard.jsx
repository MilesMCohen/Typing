import { useEffect, useRef } from "react";
import { Application, Container, Graphics } from "pixi.js";
import { hash, jitter, buildCrags, leopardPosition } from "./terrain.js";

const CANVAS_W = 360;
const CANVAS_H = 180;
const ANCHOR_X = 120; // fixed screen x where the leopard always sits; the world scrolls under it
const EASE = 0.1; // how quickly the displayed position chases the real typing progress
const NUM_CRAGS = 9;
const CRAGS = buildCrags(NUM_CRAGS);
const PEAK = CRAGS[CRAGS.length - 1];
const SNOW_LINE = 95;

function crestPolygon(wx, wy, i) {
  const apexHalfW = 7;
  const baseHalfW = 24 + jitter(i + 10, 8);
  const bottom = CANVAS_H + 20;
  return [
    wx, wy,
    wx + apexHalfW, wy + 16,
    wx + baseHalfW * (0.65 + jitter(i + 20, 0.2)), wy + 60,
    wx + baseHalfW, bottom,
    wx - baseHalfW, bottom,
    wx - baseHalfW * (0.65 + jitter(i + 30, 0.2)), wy + 58,
    wx - apexHalfW, wy + 15,
  ];
}

function backdropPolygon(points, baseY) {
  return [0, baseY, ...points, CANVAS_W, baseY, CANVAS_W, CANVAS_H, 0, CANVAS_H];
}

function buildLeopard() {
  const root = new Container();

  const bob = new Container();
  root.addChild(bob);

  const tailPivot = new Container();
  tailPivot.position.set(-10, 2);
  const tail = new Graphics()
    .poly([0, 0, -9, -4, -11, -13, -6, -15, -2, -6])
    .fill(0xd9dde2);
  tailPivot.addChild(tail);
  bob.addChild(tailPivot);

  const body = new Graphics()
    .ellipse(0, 0, 12, 7)
    .fill(0xe3e7ea)
    .circle(10, -5, 6)
    .fill(0xe3e7ea)
    .poly([6, -10, 9, -14, 11, -9])
    .fill(0xe3e7ea)
    .poly([13, -10, 16, -14, 15, -8])
    .fill(0xe3e7ea)
    .rect(-8, 5, 3, 6)
    .fill(0xe3e7ea)
    .rect(4, 5, 3, 6)
    .fill(0xe3e7ea)
    .circle(-4, -2, 1.4)
    .fill(0x9099a2)
    .circle(2, 2, 1.4)
    .fill(0x9099a2)
    .circle(-8, 1, 1.2)
    .fill(0x9099a2)
    .circle(9, -6, 1)
    .fill(0x9099a2);
  bob.addChild(body);

  return { root, bob, tailPivot };
}

export default function SnowLeopard({ progress = 0 }) {
  const hostRef = useRef(null);
  const progressRef = useRef(progress);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let destroyed = false;
    const app = new Application();

    app
      .init({
        width: CANVAS_W,
        height: CANVAS_H,
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      })
      .then(() => {
        if (destroyed) {
          app.destroy(true, { children: true, texture: true });
          return;
        }

        app.canvas.style.width = "100%";
        app.canvas.style.height = "auto";
        app.canvas.style.display = "block";
        host.appendChild(app.canvas);

        const farLayer = new Container();
        const midLayer = new Container();
        const terrainLayer = new Container();
        const snowLayer = new Container();
        app.stage.addChild(farLayer, midLayer, terrainLayer, snowLayer);

        farLayer.addChild(
          new Graphics()
            .poly(backdropPolygon([0, 130, 90, 70, 180, 120, 260, 55, 340, 110, 430, 60, 520, 115, 610, 75, 700, 125, 780, 95, 900, 130], 150))
            .fill({ color: 0x1f2a36, alpha: 0.9 })
        );
        midLayer.addChild(
          new Graphics()
            .poly(backdropPolygon([0, 150, 70, 100, 150, 140, 230, 85, 310, 135, 400, 95, 480, 145, 560, 110, 650, 150, 750, 120, 900, 150], 165))
            .fill({ color: 0x2b3a4a, alpha: 0.95 })
        );

        const terrainArt = new Graphics();
        CRAGS.forEach((c, i) => {
          terrainArt.poly(crestPolygon(c.worldX, c.y, i)).fill(0x4a5b6c);
          if (c.y < SNOW_LINE) {
            const capHalf = 5;
            terrainArt
              .poly([c.worldX, c.y, c.worldX + capHalf, c.y + 10, c.worldX - capHalf, c.y + 10])
              .fill(0xe8eef4);
          }
        });
        terrainLayer.addChild(terrainArt);

        const food = new Graphics()
          .ellipse(0, 0, 7, 5)
          .fill(0x8a6a4a)
          .circle(-6, -3, 2.5)
          .fill(0x8a6a4a);
        food.position.set(PEAK.worldX, PEAK.y - 14);
        terrainLayer.addChild(food);

        const { root: leopard, bob, tailPivot } = buildLeopard();
        terrainLayer.addChild(leopard);

        const snowflakes = Array.from({ length: 26 }, (_, i) => {
          const g = new Graphics().circle(0, 0, 0.8 + hash(i + 200) * 1.2).fill({ color: 0xffffff, alpha: 0.6 });
          g.position.set(Math.random() * CANVAS_W, Math.random() * CANVAS_H);
          g._speed = 8 + hash(i + 300) * 14;
          g._drift = hash(i + 400) * 2 - 1;
          snowLayer.addChild(g);
          return g;
        });

        let displayed = progressRef.current;
        let elapsed = 0;

        const tick = (ticker) => {
          const dt = ticker.deltaTime;
          elapsed += ticker.deltaMS / 1000;
          displayed += (progressRef.current - displayed) * Math.min(1, EASE * dt);

          const { worldX, y } = leopardPosition(CRAGS, displayed);
          const cameraX = ANCHOR_X - worldX;

          terrainLayer.x = cameraX;
          midLayer.x = ANCHOR_X + (cameraX - ANCHOR_X) * 0.4;
          farLayer.x = ANCHOR_X + (cameraX - ANCHOR_X) * 0.15;

          leopard.position.set(worldX, y - 12);
          const reachedPeak = displayed >= 1;
          bob.y = reachedPeak
            ? Math.sin(elapsed * 10) * 3
            : Math.sin(elapsed * 6) * 2;
          bob.scale.set(reachedPeak ? 1 + Math.abs(Math.sin(elapsed * 10)) * 0.15 : 1);
          tailPivot.rotation = Math.sin(elapsed * 5) * 0.35;
          food.visible = !reachedPeak;
          food.y = PEAK.y - 14 + Math.sin(elapsed * 3) * 3;

          for (const flake of snowflakes) {
            flake.y += flake._speed * (ticker.deltaMS / 1000);
            flake.x += flake._drift * (ticker.deltaMS / 1000) * 5;
            if (flake.y > CANVAS_H) {
              flake.y = -4;
              flake.x = Math.random() * CANVAS_W;
            }
          }
        };

        app.ticker.add(tick);
        app._typingTick = tick;
        host._app = app;
      });

    return () => {
      destroyed = true;
      const app = host._app;
      if (app) {
        app.ticker.remove(app._typingTick);
        app.destroy(true, { children: true, texture: true });
        host._app = null;
      }
      host.replaceChildren();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      style={{ width: "100%", maxWidth: CANVAS_W, aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
    />
  );
}
