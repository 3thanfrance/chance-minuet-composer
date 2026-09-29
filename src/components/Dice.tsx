import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

/* Rounded, recessed-pip geometry adapted from Ksenia Kondrashova / Codrops:
https://github.com/uuuulala/Threejs-rolling-dice-tutorial
MIT License

Copyright (c) 2009 - 2021 [Codrops](https://tympanus.net/codrops)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
const params = { segments: 40, edgeRadius: 0.09, notchRadius: 0.12, notchDepth: 0.1 };
const FACE_NORMALS = [
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, -1, 0),
];
type Pose = { p: THREE.Vector3; q: THREE.Quaternion };
type RollFrame = [Pose, Pose];

// Orient the fair random result onto the physical cube's upper face. Labels are
// fixed BEFORE playback; they never change or snap at the end of the throw.
export function faceCorrection(final: THREE.Quaternion, value: number) {
  const localUp = new THREE.Vector3(0, 1, 0).applyQuaternion(final.clone().invert());
  const upper = FACE_NORMALS.reduce((best, n) => (n.dot(localUp) > best.dot(localUp) ? n : best), FACE_NORMALS[0]!);
  return new THREE.Quaternion().setFromUnitVectors(FACE_NORMALS[value - 1]!, upper);
}
function trajectory(values: readonly [number, number]): RollFrame[] {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -24, 0), allowSleep: true });
  world.defaultContactMaterial.friction = 0.5;
  world.defaultContactMaterial.restitution = 0.28;
  const floor = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(floor);
  // Invisible soft boundaries keep every bounce comfortably within the viewport.
  for (const [x, z, hx, hz] of [
    [-3.05, 0, 0.15, 2.3],
    [3.05, 0, 0.15, 2.3],
    [0, -1.9, 3.2, 0.15],
    [0, 1.9, 3.2, 0.15],
  ]) {
    const wall = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(hx!, 4, hz!)),
      position: new CANNON.Vec3(x!, 2, z!),
    });
    world.addBody(wall);
  }
  const bodies = [-1, 1].map((side) => {
    const b = new CANNON.Body({
      mass: 1,
      shape: new CANNON.Box(new CANNON.Vec3(0.65, 0.65, 0.65)),
      sleepSpeedLimit: 0.18,
      sleepTimeLimit: 0.3,
      linearDamping: 0.18,
      angularDamping: 0.17,
    });
    b.position.set(side * 0.9, 1.9, -0.35);
    b.quaternion.setFromEuler(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    b.velocity.set(-side * (1 + Math.random()), 1 + Math.random(), 0.6 + Math.random() * 0.5);
    b.angularVelocity.set(7 + Math.random() * 5, side * (6 + Math.random() * 4), 5 + Math.random() * 6);
    world.addBody(b);
    return b;
  });
  const frames: RollFrame[] = [];
  for (let i = 0; i < 720; i++) {
    world.step(1 / 120);
    frames.push(
      bodies.map((b) => ({
        p: new THREE.Vector3(b.position.x, b.position.y, b.position.z),
        q: new THREE.Quaternion(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w),
      })) as RollFrame,
    );
    if (i > 180 && bodies.every((b) => b.sleepState === CANNON.Body.SLEEPING)) break;
  }
  const last = frames[frames.length - 1]!;
  const corrections = last.map((pose, i) => faceCorrection(pose.q, values[i]!));
  for (const frame of frames) frame.forEach((pose, i) => pose.q.multiply(corrections[i]!));
  return frames;
}

type DiceStage = {
  roll: (values: readonly [number, number], settled: () => void) => void;
  cancel: () => void;
  settle: (values: readonly [number, number]) => void;
  dispose: () => void;
};
function createStage(host: HTMLSpanElement): DiceStage {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-4.5, 4.5, 2.55, -2.55, 0.1, 40);
  camera.position.set(0, 7.5, 6);
  camera.lookAt(0, 0.65, 0);
  scene.add(new THREE.HemisphereLight(0xfff9eb, 0x826d4a, 2.4));
  const light = new THREE.DirectionalLight(0xfff4dc, 4);
  light.position.set(-3, 8, 5);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.left = -6;
  light.shadow.camera.right = 6;
  light.shadow.camera.top = 6;
  light.shadow.camera.bottom = -6;
  light.shadow.normalBias = 0.025;
  light.shadow.radius = 4;
  scene.add(light);
  const fill = new THREE.DirectionalLight(0xffffff, 1.2);
  fill.position.set(5, 3, -2);
  scene.add(fill);
  const outerGeometry = createBoxGeometry();
  const innerGeometry = createInnerGeometry();
  const outerMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2e6cc,
    roughness: 0.38,
    metalness: 0,
  });
  const innerMaterial = new THREE.MeshStandardMaterial({
    color: 0x263026,
    roughness: 0.65,
    side: THREE.DoubleSide,
  });
  const dice = [-1, 1].map((side, i) => {
    const group = new THREE.Group();
    const outer = new THREE.Mesh(outerGeometry, outerMaterial);
    outer.castShadow = true;
    outer.receiveShadow = true;
    group.add(new THREE.Mesh(innerGeometry, innerMaterial), outer);
    group.scale.setScalar(1.3);
    group.position.set(side * 1.08, 0.65, 0);
    group.quaternion.setFromUnitVectors(FACE_NORMALS[[3, 4][i]! - 1]!, new THREE.Vector3(0, 1, 0));
    group.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), side * 0.2));
    scene.add(group);
    return group;
  });
  const floorGeometry = new THREE.PlaneGeometry(200, 200);
  const floorMaterial = new THREE.ShadowMaterial({ color: 0x51391e, opacity: 0.2 });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.005;
  floor.receiveShadow = true;
  scene.add(floor);
  let frameId = 0;
  let active = false;
  const render = () => renderer.render(scene, camera);
  const resize = () => {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.left = (-2.55 * w) / h;
    camera.right = (2.55 * w) / h;
    camera.updateProjectionMatrix();
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const park = (values: readonly [number, number]) => {
    dice.forEach((die, i) => {
      die.position.set((i === 0 ? -1 : 1) * 1.08, 0.65, 0);
      die.quaternion.setFromUnitVectors(FACE_NORMALS[values[i]! - 1]!, new THREE.Vector3(0, 1, 0));
    });
    render();
  };
  const cancel = () => {
    if (active) park([3, 4]);
    active = false;
    cancelAnimationFrame(frameId);
  };
  return {
    cancel,
    settle: park,
    roll(values, settled) {
      cancel();
      active = true;
      const from = dice.map((d) => ({ p: d.position.clone(), q: d.quaternion.clone() }));
      const frames = trajectory(values);
      const lift = 260,
        travel = ((frames.length - 1) / 120) * 1000;
      let start: number | undefined;
      const animate = (now: number) => {
        if (!active) return;
        start ??= now;
        const t = now - start;
        dice.forEach((die, i) => {
          if (t < lift) {
            const s = t / lift;
            const e = s * s * (3 - 2 * s);
            die.position.lerpVectors(from[i]!.p, frames[0]![i]!.p, e);
            die.quaternion.slerpQuaternions(from[i]!.q, frames[0]![i]!.q, e);
          } else {
            const f = Math.min(frames.length - 1, ((t - lift) / 1000) * 120);
            const a = frames[Math.floor(f)]![i]!;
            const b = frames[Math.min(frames.length - 1, Math.floor(f) + 1)]![i]!;
            die.position.lerpVectors(a.p, b.p, f % 1);
            die.quaternion.slerpQuaternions(a.q, b.q, f % 1);
          }
        });
        render();
        if (t < lift + travel + 500) frameId = requestAnimationFrame(animate);
        else {
          active = false;
          settled();
        }
      };
      frameId = requestAnimationFrame(animate);
    },
    dispose() {
      cancel();
      observer.disconnect();
      outerGeometry.dispose();
      innerGeometry.dispose();
      floorGeometry.dispose();
      outerMaterial.dispose();
      innerMaterial.dispose();
      floorMaterial.dispose();
      light.shadow.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export function DiceButton({
  values,
  rolling,
  onRoll,
  onSettled,
  onProgress,
  label = "Roll the dice",
}: {
  values: readonly [number, number];
  rolling: boolean;
  onRoll: () => void;
  onSettled: () => void;
  onProgress: (n: number) => void;
  label?: string;
}) {
  const host = useRef<HTMLSpanElement>(null),
    stage = useRef<DiceStage | null>(null);
  const [fallback, setFallback] = useState(false);
  const callbacks = useRef({ onSettled, onProgress });
  callbacks.current = { onSettled, onProgress };
  useEffect(() => {
    try {
      if (host.current) stage.current = createStage(host.current);
    } catch {
      setFallback(true);
    }
    return () => {
      stage.current?.dispose();
      stage.current = null;
    };
  }, []);
  useEffect(() => {
    if (!rolling) {
      stage.current?.cancel();
      return;
    }
    let cancelled = false;
    let timer = 0;
    let count = 0;
    const tick = () => {
      if (cancelled) return;
      count = Math.min(count + 1, 15);
      callbacks.current.onProgress(count);
      if (count < 15) timer = window.setTimeout(tick, 150);
    };
    timer = window.setTimeout(tick, 250);
    const finish = () => {
      if (cancelled) return;
      clearTimeout(timer);
      callbacks.current.onProgress(16);
      callbacks.current.onSettled();
    };
    if (stage.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      stage.current.roll(values, finish);
    else {
      stage.current?.settle(values);
      clearTimeout(timer);
      timer = window.setTimeout(finish, 250);
    }
    return () => {
      cancelled = true;
      clearTimeout(timer);
      stage.current?.cancel();
    };
  }, [rolling, values]);
  return (
    <button className="physics-dice-button" onClick={onRoll} disabled={rolling} aria-label={label}>
      <span className="physics-dice-stage" ref={host} />
      {fallback && (
        <span className="dice-fallback" aria-hidden="true">
          {values.map((v, i) => (
            <span key={i}>{String.fromCodePoint(0x267f + v)}</span>
          ))}
        </span>
      )}
      <span className="physics-dice-label">
        {rolling ? "A little chance at work…" : label}
        <span aria-hidden="true">↗</span>
      </span>
    </button>
  );
}

function createBoxGeometry() {
  let boxGeometry: THREE.BufferGeometry = new THREE.BoxGeometry(
    1,
    1,
    1,
    params.segments,
    params.segments,
    params.segments,
  );

  const positionAttr = boxGeometry.getAttribute("position");
  const subCubeHalfSize = 0.5 - params.edgeRadius;

  for (let i = 0; i < positionAttr.count; i++) {
    let position = new THREE.Vector3().fromBufferAttribute(positionAttr, i);

    const subCube = new THREE.Vector3(
      Math.sign(position.x),
      Math.sign(position.y),
      Math.sign(position.z),
    ).multiplyScalar(subCubeHalfSize);
    const addition = new THREE.Vector3().subVectors(position, subCube);

    if (
      Math.abs(position.x) > subCubeHalfSize &&
      Math.abs(position.y) > subCubeHalfSize &&
      Math.abs(position.z) > subCubeHalfSize
    ) {
      addition.normalize().multiplyScalar(params.edgeRadius);
      position = subCube.add(addition);
    } else if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.y) > subCubeHalfSize) {
      addition.z = 0;
      addition.normalize().multiplyScalar(params.edgeRadius);
      position.x = subCube.x + addition.x;
      position.y = subCube.y + addition.y;
    } else if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
      addition.y = 0;
      addition.normalize().multiplyScalar(params.edgeRadius);
      position.x = subCube.x + addition.x;
      position.z = subCube.z + addition.z;
    } else if (Math.abs(position.y) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
      addition.x = 0;
      addition.normalize().multiplyScalar(params.edgeRadius);
      position.y = subCube.y + addition.y;
      position.z = subCube.z + addition.z;
    }

    const notchWave = (v: number) => {
      v = (1 / params.notchRadius) * v;
      v = Math.PI * Math.max(-1, Math.min(1, v));
      return params.notchDepth * (Math.cos(v) + 1);
    };
    const notch = (pos: [number, number]) => notchWave(pos[0]) * notchWave(pos[1]);

    const offset = 0.23;

    if (position.y === 0.5) {
      position.y -= notch([position.x, position.z]);
    } else if (position.x === 0.5) {
      position.x -= notch([position.y + offset, position.z + offset]);
      position.x -= notch([position.y - offset, position.z - offset]);
    } else if (position.z === 0.5) {
      position.z -= notch([position.x - offset, position.y + offset]);
      position.z -= notch([position.x, position.y]);
      position.z -= notch([position.x + offset, position.y - offset]);
    } else if (position.z === -0.5) {
      position.z += notch([position.x + offset, position.y + offset]);
      position.z += notch([position.x + offset, position.y - offset]);
      position.z += notch([position.x - offset, position.y + offset]);
      position.z += notch([position.x - offset, position.y - offset]);
    } else if (position.x === -0.5) {
      position.x += notch([position.y + offset, position.z + offset]);
      position.x += notch([position.y + offset, position.z - offset]);
      position.x += notch([position.y, position.z]);
      position.x += notch([position.y - offset, position.z + offset]);
      position.x += notch([position.y - offset, position.z - offset]);
    } else if (position.y === -0.5) {
      position.y += notch([position.x + offset, position.z + offset]);
      position.y += notch([position.x + offset, position.z]);
      position.y += notch([position.x + offset, position.z - offset]);
      position.y += notch([position.x - offset, position.z + offset]);
      position.y += notch([position.x - offset, position.z]);
      position.y += notch([position.x - offset, position.z - offset]);
    }

    positionAttr.setXYZ(i, position.x, position.y, position.z);
  }

  boxGeometry.deleteAttribute("normal");
  boxGeometry.deleteAttribute("uv");
  boxGeometry = BufferGeometryUtils.mergeVertices(boxGeometry);

  boxGeometry.computeVertexNormals();

  return boxGeometry;
}

function createInnerGeometry() {
  const baseGeometry = new THREE.PlaneGeometry(1 - 2 * params.edgeRadius, 1 - 2 * params.edgeRadius);
  const offset = 0.48;
  return BufferGeometryUtils.mergeGeometries(
    [
      baseGeometry.clone().translate(0, 0, offset),
      baseGeometry.clone().translate(0, 0, -offset),
      baseGeometry
        .clone()
        .rotateX(0.5 * Math.PI)
        .translate(0, -offset, 0),
      baseGeometry
        .clone()
        .rotateX(0.5 * Math.PI)
        .translate(0, offset, 0),
      baseGeometry
        .clone()
        .rotateY(0.5 * Math.PI)
        .translate(-offset, 0, 0),
      baseGeometry
        .clone()
        .rotateY(0.5 * Math.PI)
        .translate(offset, 0, 0),
    ],
    false,
  );
}
