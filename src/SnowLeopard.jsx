import { useEffect, useRef } from "react";
import { Application, Container, Graphics } from "pixi.js";
import { hash, jitter, buildCrags, leopardPosition } from "./terrain.js";
import { computeLeopardProgress, computeExpectedProgress, extrapolateTypedLength } from "./typing.js";

const CANVAS_W = 360;
const CANVAS_H = 180;
const ANCHOR_X = 120; // fixed screen x where the leopard always sits; the world scrolls under it
const EASE = 0.1; // how quickly the displayed position chases the real typing/prey progress
const NUM_CRAGS = 9;
const CRAGS = buildCrags(NUM_CRAGS);
const SNOW_LINE = 95;

// The prey runs its own, differently-bumpy set of crags (see buildCrags'
// `seed` param) that shares CRAGS' start and peak — so during a lesson it
// looks like a separate animal on a separate ridge, but the two tracks
// reunite at the same final crag.
const PREY_SEED = 1000;
const PREY_CRAGS = buildCrags(NUM_CRAGS, PREY_SEED);

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

// Real snow leopards read as "not a housecat" mainly through four cues:
// a very long, thick tail (nearly as long as the body, used for balance and
// wrapped over the nose at rest), small rounded ears set low and flat
// against the head (not tall triangles), a stocky low-slung body on short
// legs with oversized paws (built for snow), and a smoky grey-white coat
// covered in open rosettes rather than solid tabby spots.
const FUR_BASE = 0xdedad2; // smoky cream-grey body
const FUR_LIGHT = 0xf1efe6; // belly/muzzle/chest ruff
const MARKING = 0x5b564c; // charcoal-brown rosette/spot ink

function rosette(g, x, y, r) {
  g.circle(x, y, r).fill(MARKING).circle(x, y, r * 0.5).fill(FUR_BASE);
}

function spot(g, x, y, r) {
  g.circle(x, y, r).fill(MARKING);
}

function buildLeopard() {
  const root = new Container();

  const bob = new Container();
  root.addChild(bob);

  // Long, thick tail that curls up and forward over the back.
  const tailPivot = new Container();
  tailPivot.position.set(-15, -1);
  const tail = new Graphics()
    .poly([
      0, 2,
      -8, -1,
      -15, -8,
      -18, -17,
      -14, -22,
      -10, -18,
      -12, -10,
      -6, -3,
      1, -3,
    ])
    .fill(FUR_BASE);
  spot(tail, -16, -13, 1.6);
  spot(tail, -12, -6, 1.4);
  spot(tail, -8, -1, 1.3);
  tail
    .circle(-15, -19, 2.6)
    .fill(MARKING); // fluffy dark tip
  tailPivot.addChild(tail);
  bob.addChild(tailPivot);

  const body = new Graphics();

  // Short legs relative to a long torso, with big snowshoe paws.
  body
    .roundRect(-13, 3, 4.5, 7.5, 2)
    .fill(FUR_BASE)
    .ellipse(-10.75, 10.5, 3, 1.7)
    .fill(FUR_BASE)
    .roundRect(8, 3, 4.5, 7.5, 2)
    .fill(FUR_BASE)
    .ellipse(10.25, 10.5, 3, 1.7)
    .fill(FUR_BASE);

  // Long, lean torso — snow leopards read as elongated, not round-bodied.
  body
    .ellipse(0, 0, 17, 6.5)
    .fill(FUR_BASE)
    .ellipse(-2, 3.8, 12, 3)
    .fill(FUR_LIGHT); // pale belly

  // Small head, set low and forward — proportionally smaller than a
  // cartoon housecat's — with a short muzzle instead of a pointed face.
  body
    .circle(15, -3, 4.8)
    .fill(FUR_BASE)
    .ellipse(19.3, -1, 2.7, 2.1)
    .fill(FUR_LIGHT) // pale muzzle
    .circle(21.5, -1.4, 0.8)
    .fill(0x2b2723); // nose

  // Ears: small, rounded, low on the skull — not tall pointed triangles.
  body
    .circle(12.3, -7.5, 1.9)
    .fill(MARKING)
    .circle(12.3, -7.1, 1)
    .fill(FUR_BASE)
    .circle(16.8, -7.5, 1.9)
    .fill(MARKING)
    .circle(16.8, -7.1, 1)
    .fill(FUR_BASE);

  // Eye + dark eye-liner streak running back toward the ear.
  body
    .poly([14.1, -5.1, 16.9, -5.5, 16.4, -4.4, 14.3, -4.4])
    .fill(MARKING)
    .circle(14.8, -4.7, 1.15)
    .fill(0xeef2ef)
    .circle(15, -4.7, 0.6)
    .fill(0x2b2723);

  // Forehead spots between the eyes and ears.
  spot(body, 12.8, -9.6, 0.75);
  spot(body, 14.8, -10.3, 0.75);
  spot(body, 16.8, -9.6, 0.75);

  // Rosettes and spots scattered across the back, flank, and legs.
  rosette(body, -11, -3, 2.4);
  rosette(body, -3.5, -4.5, 2.4);
  rosette(body, 4, -3.8, 2.2);
  rosette(body, 10, -2.8, 1.9);
  spot(body, -14, 0.5, 1.2);
  spot(body, -7, 2, 1.1);
  spot(body, 0.5, 2.3, 1);
  spot(body, 7, 2.5, 1);
  spot(body, -9.5, 5, 0.9);
  spot(body, 2.5, 5.5, 0.9);

  bob.addChild(body);

  return { root, bob, tailPivot };
}

// A small mountain hare — the leopard's prey — running at the target pace.
function buildPrey() {
  const root = new Container();

  const bob = new Container();
  root.addChild(bob);

  const body = new Graphics()
    .ellipse(0, 0, 7, 5)
    .fill(0xc9a06b)
    .circle(6, -4, 4)
    .fill(0xc9a06b)
    .poly([3, -7, 4, -12, 6, -7])
    .fill(0xc9a06b)
    .poly([6, -7, 8, -11, 8, -6])
    .fill(0xc9a06b)
    .rect(-5, 3, 2, 4)
    .fill(0xc9a06b)
    .rect(3, 3, 2, 4)
    .fill(0xc9a06b)
    .circle(7, -5, 0.8)
    .fill(0x4a3521);
  bob.addChild(body);

  return { root, bob };
}

// In "live" mode (typedLength/targetLength/wpmTarget/startedAt all provided,
// used while a lesson is in progress) both animals' positions are computed
// fresh every animation frame from real elapsed time, instead of only when
// React re-renders on a keystroke — see extrapolateTypedLength for why.
// Otherwise (Menu/Results/TestResults, showing a fixed before/after state)
// the static `progress`/`preyProgress` props are used directly.
export default function SnowLeopard({ progress = 0, preyProgress = 0, fell = false, typedLength, targetLength, wpmTarget, startedAt = null, lastKeystrokeAt = null }) {
  const hostRef = useRef(null);
  const progressRef = useRef(progress);
  const preyProgressRef = useRef(preyProgress);
  const fellRef = useRef(fell);
  const liveRef = useRef({ typedLength, targetLength, wpmTarget, startedAt, lastKeystrokeAt });

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    preyProgressRef.current = preyProgress;
  }, [preyProgress]);

  useEffect(() => {
    fellRef.current = fell;
  }, [fell]);

  useEffect(() => {
    liveRef.current = { typedLength, targetLength, wpmTarget, startedAt, lastKeystrokeAt };
  }, [typedLength, targetLength, wpmTarget, startedAt, lastKeystrokeAt]);

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
        const preyLayer = new Container();
        const terrainLayer = new Container();
        const snowLayer = new Container();
        app.stage.addChild(farLayer, midLayer, preyLayer, terrainLayer, snowLayer);

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

        const preyTerrainArt = new Graphics();
        PREY_CRAGS.forEach((c, i) => {
          preyTerrainArt.poly(crestPolygon(c.worldX, c.y, i + PREY_SEED)).fill({ color: 0x3a4a5a, alpha: 0.75 });
          if (c.y < SNOW_LINE) {
            const capHalf = 5;
            preyTerrainArt
              .poly([c.worldX, c.y, c.worldX + capHalf, c.y + 10, c.worldX - capHalf, c.y + 10])
              .fill({ color: 0xc9d7e4, alpha: 0.85 });
          }
        });
        preyLayer.addChild(preyTerrainArt);

        const { root: prey, bob: preyBob } = buildPrey();
        preyLayer.addChild(prey);

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
        let displayedPrey = preyProgressRef.current;
        let elapsed = 0;
        let peakReachedAt = null;

        const tick = (ticker) => {
          const dt = ticker.deltaTime;
          elapsed += ticker.deltaMS / 1000;

          const live = liveRef.current;
          let targetProgress = progressRef.current;
          let targetPreyProgress = preyProgressRef.current;
          if (live.targetLength != null && live.wpmTarget != null) {
            const t = live.startedAt ? (Date.now() - live.startedAt) / 1000 : 0;
            const knownElapsed = live.lastKeystrokeAt && live.startedAt ? (live.lastKeystrokeAt - live.startedAt) / 1000 : 0;
            const predictedTyped = extrapolateTypedLength(live.typedLength, knownElapsed, t, live.targetLength);
            targetProgress = computeLeopardProgress(predictedTyped, live.targetLength, t, live.wpmTarget);
            targetPreyProgress = computeExpectedProgress(t, live.targetLength, live.wpmTarget);
          }
          // A keystroke can reveal that the extrapolated guess ran ahead of
          // reality (typing slowed down since the last real data point).
          // Rather than visibly rewinding to correct, hold position — i.e.
          // stop advancing — until the live target catches back up past
          // what's already on screen, then resume easing forward as normal.
          displayed += (Math.max(targetProgress, displayed) - displayed) * Math.min(1, EASE * dt);
          displayedPrey += (Math.max(targetPreyProgress, displayedPrey) - displayedPrey) * Math.min(1, EASE * dt);

          const { worldX, y } = leopardPosition(CRAGS, displayed);
          const cameraX = ANCHOR_X - worldX;

          terrainLayer.x = cameraX;
          preyLayer.x = cameraX;
          midLayer.x = ANCHOR_X + (cameraX - ANCHOR_X) * 0.4;
          farLayer.x = ANCHOR_X + (cameraX - ANCHOR_X) * 0.15;

          const reachedPeak = displayed >= 1;
          if (reachedPeak && peakReachedAt === null) peakReachedAt = elapsed;
          if (!reachedPeak) peakReachedAt = null;
          const falling = reachedPeak && fellRef.current;
          const caught = reachedPeak && !fellRef.current;

          if (falling) {
            const fallElapsed = elapsed - peakReachedAt;
            leopard.position.set(worldX, y - 12 + 20 * fallElapsed * fallElapsed);
            bob.rotation = fallElapsed * 4;
            bob.y = 0;
            bob.scale.set(1);
          } else {
            leopard.position.set(worldX, y - 12);
            bob.rotation = 0;
            bob.y = reachedPeak
              ? Math.sin(elapsed * 10) * 3
              : Math.sin(elapsed * 6) * 2;
            bob.scale.set(reachedPeak ? 1 + Math.abs(Math.sin(elapsed * 10)) * 0.15 : 1);
          }
          tailPivot.rotation = falling ? 0 : Math.sin(elapsed * 5) * 0.35;

          const { worldX: preyWorldX, y: preyY } = leopardPosition(PREY_CRAGS, displayedPrey);
          prey.position.set(preyWorldX, preyY - 10);
          prey.visible = !caught;
          preyBob.y = Math.sin(elapsed * 7) * 2.5;

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
