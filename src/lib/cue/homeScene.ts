// homeScene - the immersive Three.js hero for the landing. Goes well beyond the lone
// droplet: Cue floats in a living night-pool world with drifting bubbles, a reactive
// audio-ring visualizer, mouse parallax and scroll response. Same brand palette
// (Ink ground, Pool Cyan / Volt Lime / Magenta rim lights) as the verdict scene.
//
// Kept self-contained and lazy-loaded (Three is ~1MB) so the rest of the app stays light.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

// ---- Cue render presets (obsidian register, generated + judged against Claude
// Design's "Palo Alto 2030 / Jony Ive" intent). "obsidian" = the validated winner
// (Obsidian Pure + the crisper clearcoat from runner-up). Swap live via ?cue=<name>. ----
type CuePreset = {
  material: { color: string; transmission: number; thickness: number; roughness: number; metalness: number; ior: number; clearcoat: number; clearcoatRoughness: number; iridescence: number; iridescenceIOR: number; attenuationColor: string; attenuationDistance: number; envMapIntensity: number };
  lights: { exposure: number; key: number; fill: number; rimCyan: number; rimMagenta: number; rimLime: number; ambient: number };
  post: { bloomStrength: number; bloomRadius: number; bloomThreshold: number; aberration: number; vignette: number; grain: number };
};
const CUE_PRESETS: Record<string, CuePreset> = {
  // WINNER (93/100): dark dielectric mirror, iridescence killed, single dominant key.
  obsidian: {
    material: { color: '#0a0c0e', transmission: 0.16, thickness: 3.4, roughness: 0.14, metalness: 0, ior: 1.5, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 0, iridescenceIOR: 1.3, attenuationColor: '#05181c', attenuationDistance: 0.6, envMapIntensity: 0.55 },
    lights: { exposure: 0.95, key: 7.5, fill: 1.1, rimCyan: 3.2, rimMagenta: 2.6, rimLime: 1.4, ambient: 0.12 },
    post: { bloomStrength: 0.32, bloomRadius: 0.55, bloomThreshold: 0.82, aberration: 0.0016, vignette: 0.42, grain: 0.045 }
  },
  // RUNNER-UP (86/100): bolder razor-neon rims, crisp wet softbox streak.
  onyx: {
    material: { color: '#06080b', transmission: 0.22, thickness: 3.4, roughness: 0.14, metalness: 0, ior: 1.46, clearcoat: 1, clearcoatRoughness: 0.045, iridescence: 0.12, iridescenceIOR: 1.25, attenuationColor: '#0a1418', attenuationDistance: 0.55, envMapIntensity: 0.9 },
    lights: { exposure: 1.05, key: 3.6, fill: 0.9, rimCyan: 5.2, rimMagenta: 4.6, rimLime: 2.4, ambient: 0.18 },
    post: { bloomStrength: 0.42, bloomRadius: 0.55, bloomThreshold: 0.82, aberration: 0.0022, vignette: 0.62, grain: 0.045 }
  },
  // THIRD (71/100): smoked graphite with a whisper of grazing iridescence.
  graphite: {
    material: { color: '#0a0d10', transmission: 0.82, thickness: 3.4, roughness: 0.16, metalness: 0, ior: 1.46, clearcoat: 1, clearcoatRoughness: 0.09, iridescence: 0.12, iridescenceIOR: 1.25, attenuationColor: '#0c171c', attenuationDistance: 0.85, envMapIntensity: 0.85 },
    lights: { exposure: 0.95, key: 3.2, fill: 0.6, rimCyan: 5.5, rimMagenta: 4.6, rimLime: 2.4, ambient: 0.08 },
    post: { bloomStrength: 0.42, bloomRadius: 0.85, bloomThreshold: 0.78, aberration: 0.0022, vignette: 0.55, grain: 0.045 }
  }
};

export function initHomeScene(canvas: HTMLCanvasElement) {
  RectAreaLightUniformsLib.init();
  const stage = canvas.parentElement as HTMLElement;

  // pick preset from ?cue=<name> (defaults to the validated winner)
  const presetKey = new URLSearchParams(window.location.search).get('cue') || 'obsidian';
  const P = CUE_PRESETS[presetKey] || CUE_PRESETS.obsidian;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = P.lights.exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0.4, 9.4);   // frames Cue centred behind the overlaid title

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;

  // Apple-black-stage rig: one dominant key softbox, low fill, and the 3 palette
  // colours ONLY as thin grazing rim panels (tall+narrow, just behind the silhouette).
  const key = new THREE.RectAreaLight(0xffffff, P.lights.key, 3, 4); key.position.set(-4, 5, 5); key.lookAt(0, 0, 0); scene.add(key);
  const fill = new THREE.RectAreaLight(0xdfeef5, P.lights.fill, 8, 8); fill.position.set(6, 1, 4); fill.lookAt(0, 0, 0); scene.add(fill);
  const rimC = new THREE.RectAreaLight(0x2FCDE6, P.lights.rimCyan, 1.4, 7); rimC.position.set(5, 2, -4.5); rimC.lookAt(0, 0, 0); scene.add(rimC);
  const rimM = new THREE.RectAreaLight(0xF73CB0, P.lights.rimMagenta, 1.4, 7); rimM.position.set(-5, 1, -4.5); rimM.lookAt(0, 0, 0); scene.add(rimM);
  const rimL = new THREE.RectAreaLight(0xC9F23C, P.lights.rimLime, 1.2, 3); rimL.position.set(0, -4, -4); rimL.lookAt(0, 0, 0); scene.add(rimL);
  scene.add(new THREE.AmbientLight(0xffffff, P.lights.ambient));

  const world = new THREE.Group();
  scene.add(world);

  // ---- Cue: the hero liquid-glass droplet (same profile as the verdict scene) ----
  const prof = [[0.00,-1.30],[0.46,-1.18],[0.80,-0.95],[1.00,-0.55],[1.06,-0.10],[1.00,0.32],[0.82,0.72],[0.56,1.08],[0.31,1.40],[0.12,1.66],[0.00,1.80]];
  const dropGeo = new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0], p[1])), 128);
  dropGeo.computeVertexNormals();
  const M = P.material;
  const glass = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(M.color), transmission: M.transmission, thickness: M.thickness, roughness: M.roughness, metalness: M.metalness,
    ior: M.ior, clearcoat: M.clearcoat, clearcoatRoughness: M.clearcoatRoughness, iridescence: M.iridescence, iridescenceIOR: M.iridescenceIOR,
    iridescenceThicknessRange: [120, 540], attenuationColor: new THREE.Color(M.attenuationColor), attenuationDistance: M.attenuationDistance,
    specularIntensity: 1.0, envMapIntensity: M.envMapIntensity, transparent: true
  });
  const cue = new THREE.Group();
  cue.add(new THREE.Mesh(dropGeo, glass));
  cue.scale.setScalar(1.18);   // a touch larger so Cue owns the centre of the hero
  world.add(cue);

  // ---- Halo behind Cue: a transparent glass droplet vanishes on black, so we plant a
  // big soft cyan glow BEHIND it. This is what makes Cue "lift off" the Ink ground. ----
  const haloC = document.createElement('canvas'); haloC.width = haloC.height = 256;
  const hctx = haloC.getContext('2d')!;
  const hgrad = hctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  hgrad.addColorStop(0, 'rgba(47,205,230,0.55)');
  hgrad.addColorStop(0.4, 'rgba(47,205,230,0.18)');
  hgrad.addColorStop(1, 'rgba(47,205,230,0)');
  hctx.fillStyle = hgrad; hctx.fillRect(0, 0, 256, 256);
  const haloTex = new THREE.CanvasTexture(haloC);
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(7.5, 7.5),
    new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
  );
  halo.position.set(0, 0.1, -1.5);  // behind Cue
  world.add(halo);

  // ---- Reactive "audio" rings - dropped BELOW the droplet (Saturn-style) so they
  // never slice through Cue's middle. ----
  const rings: THREE.Mesh[] = [];
  const ringColors = [0x2FCDE6, 0xF73CB0, 0xC9F23C];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.TorusGeometry(2.0 + i * 0.55, 0.018, 8, 160);
    const m = new THREE.MeshBasicMaterial({ color: ringColors[i], transparent: true, opacity: 0.22 - i * 0.04 });
    const ring = new THREE.Mesh(g, m);
    ring.rotation.x = Math.PI / 2.05;       // flatter = read as a base, not a slice
    ring.position.y = -1.25;                 // sit under the droplet's belly
    rings.push(ring); world.add(ring);
  }

  // ---- Drifting bubbles (the pool world). Soft glowing sprites, not geometry. ----
  // Perf+looks: faceted additive spheres read as flat grey discs on dark. A soft
  // radial-gradient sprite reads as a real glint/bubble AND is cheaper than 46
  // refracting spheres. Cheap texture built once, instanced. Cue untouched.
  const BUBBLES = 38;
  const bubC = document.createElement('canvas'); bubC.width = bubC.height = 64;
  const bctx = bubC.getContext('2d')!;
  const bgrad = bctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  bgrad.addColorStop(0, 'rgba(207,231,238,0.9)');
  bgrad.addColorStop(0.35, 'rgba(159,217,236,0.35)');
  bgrad.addColorStop(1, 'rgba(159,217,236,0)');
  bctx.fillStyle = bgrad; bctx.fillRect(0, 0, 64, 64);
  const bubTex = new THREE.CanvasTexture(bubC);
  const bubbleGeo = new THREE.PlaneGeometry(1, 1);
  const bubbleMat = new THREE.MeshBasicMaterial({
    map: bubTex, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
  });
  const bubbles = new THREE.InstancedMesh(bubbleGeo, bubbleMat, BUBBLES);
  const seeds: { x: number; y: number; z: number; s: number; sp: number; ph: number }[] = [];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < BUBBLES; i++) {
    // deterministic spread (no Math.random reliance for layout stability)
    const a = (i / BUBBLES) * Math.PI * 2 * 5;
    const r = 3.2 + ((i * 53) % 100) / 100 * 4.5;
    seeds.push({
      x: Math.cos(a) * r, y: -4 + ((i * 37) % 100) / 100 * 9, z: -2 + ((i * 71) % 100) / 100 * -5,
      s: 0.05 + ((i * 29) % 100) / 100 * 0.16, sp: 0.15 + ((i * 13) % 100) / 100 * 0.4, ph: (i % 10) / 10 * Math.PI * 2
    });
  }
  world.add(bubbles);

  // ---- Post: bloom + the same chromatic-aberration/vignette/grain finish ----
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), P.post.bloomStrength, P.post.bloomRadius, P.post.bloomThreshold);
  composer.addPass(bloom);
  const FinishShader = {
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAberr: { value: P.post.aberration }, uVig: { value: P.post.vignette }, uGrain: { value: P.post.grain } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: [
      'uniform sampler2D tDiffuse; uniform float uTime, uAberr, uVig, uGrain; varying vec2 vUv;',
      'void main(){',
      '  vec2 uv = vUv; vec2 c = uv - 0.5; float d = length(c); vec2 dir = c / (d + 1e-5);',
      '  float off = uAberr * d;',
      '  float r = texture2D(tDiffuse, uv - dir * off).r;',
      '  float g = texture2D(tDiffuse, uv).g;',
      '  float b = texture2D(tDiffuse, uv + dir * off).b;',
      '  vec3 col = vec3(r, g, b);',
      '  col *= 1.0 - uVig * 0.5 * pow(d, 2.3);',
      '  float n = fract(sin(dot(uv + uTime, vec2(12.9898, 78.233))) * 43758.5453);',
      '  col += (n - 0.5) * uGrain;',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n')
  };
  const finish = new ShaderPass(FinishShader); finish.renderToScreen = true; composer.addPass(finish);

  // Perf guard-rail (auto): cap DPR at 1.5, and let the FPS watchdog drop it to 1
  // if the machine struggles. Capped here, re-read in resize().
  let dprCap = 1.5;
  const resize = () => {
    const w = stage.clientWidth || window.innerWidth, h = stage.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio, dprCap);
    renderer.setPixelRatio(dpr); composer.setPixelRatio(dpr);
    renderer.setSize(w, h, false); composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize); ro.observe(stage);

  // Pause rendering when the tab is hidden or the hero scrolls off-screen - no point
  // burning the GPU on a Cue nobody can see.
  let visible = true, onScreen = true;
  const onVis = () => { visible = document.visibilityState === 'visible'; };
  document.addEventListener('visibilitychange', onVis);
  const io = new IntersectionObserver((entries) => { onScreen = entries[0]?.isIntersecting ?? true; }, { threshold: 0 });
  io.observe(stage);

  // ---- Interaction: mouse parallax + scroll dive ----
  let mx = 0, my = 0, tmx = 0, tmy = 0, scrollN = 0;
  const onMove = (e: MouseEvent) => { tmx = (e.clientX / window.innerWidth - 0.5); tmy = (e.clientY / window.innerHeight - 0.5); };
  const onScroll = () => { scrollN = Math.min(1, window.scrollY / Math.max(1, window.innerHeight)); };
  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });

  const clock = new THREE.Clock();
  let raf = 0, disposed = false;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  // ---- FPS watchdog: if we sustain low FPS, shed the most expensive effects once.
  // Grain/aberration off -> bloom down -> DPR to 1. Cue's glass + lights stay. ----
  let fpsAccumTime = 0, fpsFrames = 0, degraded = false;
  const degrade = () => {
    if (degraded) return; degraded = true;
    finish.uniforms.uGrain.value = 0.0;
    finish.uniforms.uAberr.value = 0.0;
    bloom.strength = Math.min(bloom.strength, P.post.bloomStrength);
    dprCap = 1.0; resize();
  };

  const tick = () => {
    if (disposed) return;
    // Skip frames entirely when off-screen / tab hidden (keep the loop alive cheaply).
    if (!visible || !onScreen) { raf = requestAnimationFrame(tick); return; }
    const dt = clock.getDelta();
    const t = clock.getElapsedTime();

    // sample FPS over ~1s windows; degrade once if averaging under ~45fps
    if (!degraded) {
      fpsAccumTime += dt; fpsFrames++;
      if (fpsAccumTime >= 1) {
        if (fpsFrames / fpsAccumTime < 45) degrade();
        fpsAccumTime = 0; fpsFrames = 0;
      }
    }

    mx = lerp(mx, tmx, 0.05); my = lerp(my, tmy, 0.05);

    // camera parallax + a gentle scroll-dive, Cue stays centred behind the title.
    camera.position.x = lerp(camera.position.x, mx * 1.4, 0.06);
    camera.position.y = lerp(camera.position.y, 0.4 - my * 1.0 - scrollN * 0.8, 0.06);
    camera.lookAt(0, 0.1 - scrollN * 0.4, 0);

    // Cue: gentle float + slow spin, leans toward the cursor
    cue.position.y = 0.2 + Math.sin(t * 0.6) * 0.08;
    cue.rotation.y += 0.0016;
    cue.rotation.z = lerp(cue.rotation.z, -mx * 0.25, 0.05);

    // generative "audio" pulse for the rings (sum of sines => musical feel)
    const beat = 0.5 + 0.5 * Math.sin(t * 2.4) * Math.sin(t * 0.7 + 1.3);

    // halo: face the camera, breathe gently with the beat so Cue feels alive
    halo.quaternion.copy(camera.quaternion);
    halo.position.x = cue.position.x;
    (halo.material as THREE.MeshBasicMaterial).opacity = 0.7 + beat * 0.25;
    halo.scale.setScalar(1 + beat * 0.06);
    rings.forEach((ring, i) => {
      const s = 1 + beat * (0.06 + i * 0.03) + Math.sin(t * 1.5 + i) * 0.02;
      ring.scale.setScalar(s);
      (ring.material as THREE.MeshBasicMaterial).opacity = (0.22 - i * 0.04) * (0.6 + beat * 0.7);
      ring.rotation.z += 0.0008 * (i + 1);
    });
    // gentle pulse anchored to the PRESET baseline (never re-inflate past it - that
    // was the "glowing body" the obsidian judge warned against). Frozen once degraded.
    if (!degraded) bloom.strength = P.post.bloomStrength + beat * 0.08;

    // bubbles drift upward and recycle. Billboard each sprite to face the camera so
    // it always reads as a soft round glint, and scale up (sprites need more size).
    for (let i = 0; i < BUBBLES; i++) {
      const s = seeds[i];
      let y = s.y + ((t * s.sp) % 10);
      if (y > 5) y -= 10;
      dummy.position.set(s.x + Math.sin(t * 0.5 + s.ph) * 0.3, y, s.z);
      dummy.quaternion.copy(camera.quaternion);
      dummy.scale.setScalar(s.s * 3.2);
      dummy.updateMatrix();
      bubbles.setMatrixAt(i, dummy.matrix);
    }
    bubbles.instanceMatrix.needsUpdate = true;

    world.rotation.y = lerp(world.rotation.y, mx * 0.2, 0.05);
    finish.uniforms.uTime.value = t;
    composer.render();
    raf = requestAnimationFrame(tick);
  };
  tick();

  return {
    dispose() {
      disposed = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('mousemove', onMove); window.removeEventListener('scroll', onScroll);
      bubTex.dispose(); haloTex.dispose(); renderer.dispose();
    }
  };
}
