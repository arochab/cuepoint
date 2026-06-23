// cueScene - shared real-time 3D "Cue" liquid-glass mascot.
// Ported VERBATIM from the CuePoint brand system (Claude Design). The only change vs the
// original cue-scene.js is the import paths: the npm 'three' package + examples/jsm addons
// instead of the CDN importmap ('three/addons/'). Logic, geometry, materials, lights,
// post-processing and the verdict state machine are unchanged.
//
// Cue is premium, faceless, alive. No cartoon eyes. He emotes through colour, inner glow
// and motion. States: idle / analyzing / send(lime) / one(cyan) / not(magenta).
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

export type CueVerdict = 'idle' | 'analyzing' | 'send' | 'one' | 'not';

// "Silence" reshape: the droplet is demoted to a single quiet object (no longer wallpaper).
// rot is halved (calmer spin) and bloom is *0.6 (less glow) vs the original brand values.
// The lime/magenta cores STAY — the droplet is now the ONLY place those colours live, so
// verdict hue carries real meaning (cyan=one / lime=send / magenta=not) instead of decoration.
const STATES: Record<CueVerdict, { cyan: number; mag: number; lime: number; atten: string; core: string; coreOp: number; bloom: number; rot: number }> = {
  idle:      { cyan: 2.8, mag: 2.1, lime: 1.1, atten: '#cfe7ee', core: '#7fd9ec', coreOp: 0.0,  bloom: 0.168, rot: 0.25 },
  analyzing: { cyan: 3.8, mag: 1.5, lime: 1.5, atten: '#bfe9f3', core: '#36C9D6', coreOp: 0.30, bloom: 0.240, rot: 0.70 },
  send:      { cyan: 1.4, mag: 0.5, lime: 5.6, atten: '#dcf2a8', core: '#C9F23C', coreOp: 0.55, bloom: 0.312, rot: 0.35 },
  one:       { cyan: 5.6, mag: 1.0, lime: 1.2, atten: '#b6e9f3', core: '#36C9D6', coreOp: 0.50, bloom: 0.276, rot: 0.30 },
  not:       { cyan: 0.9, mag: 5.6, lime: 0.5, atten: '#f4c4e2', core: '#F73CB0', coreOp: 0.52, bloom: 0.276, rot: 0.225 }
};

export interface CueSceneOpts {
  interactive?: boolean;
  autoRotate?: boolean;
  verdict?: CueVerdict;
  exposure?: number;
}

export function initCueScene(canvas: HTMLCanvasElement, opts: CueSceneOpts = {}) {
  const o = Object.assign({ interactive: true, autoRotate: true, verdict: 'idle' as CueVerdict, exposure: 1.12 }, opts);
  RectAreaLightUniformsLib.init();
  const stage = canvas.parentElement as HTMLElement;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = o.exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  // "Silence": no scene background — the droplet floats on the bare Slate ground
  // (renderer is alpha:true, clearColor 0), so it reads as one object, not wallpaper.
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.35, 9.2);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;

  const key = new THREE.RectAreaLight(0xffffff, 5.0, 7, 9); key.position.set(-5, 5, 5); key.lookAt(0, 0, 0); scene.add(key);
  const fill = new THREE.RectAreaLight(0xdfeef5, 2.4, 8, 8); fill.position.set(6, 1, 4); fill.lookAt(0, 0, 0); scene.add(fill);
  const rimC = new THREE.RectAreaLight(0x2FCDE6, 2.8, 4, 7); rimC.position.set(4.5, 2, -5); rimC.lookAt(0, 0, 0); scene.add(rimC);
  const rimM = new THREE.RectAreaLight(0xF73CB0, 2.1, 4, 6); rimM.position.set(-4.5, -1, -5); rimM.lookAt(0, 0, 0); scene.add(rimM);
  const rimL = new THREE.RectAreaLight(0xC9F23C, 1.1, 3, 5); rimL.position.set(0, -3.5, -4.5); rimL.lookAt(0, 0, 0); scene.add(rimL);
  const back = new THREE.RectAreaLight(0xffffff, 2.6, 6, 5); back.position.set(0, 4.5, -5); back.lookAt(0, 0, 0); scene.add(back);
  scene.add(new THREE.AmbientLight(0xffffff, 0.16));

  const prof = [[0.00,-1.30],[0.46,-1.18],[0.80,-0.95],[1.00,-0.55],[1.06,-0.10],[1.00,0.32],[0.82,0.72],[0.56,1.08],[0.31,1.40],[0.12,1.66],[0.00,1.80]];
  const pts = prof.map(p => new THREE.Vector2(p[0], p[1]));
  const dropGeo = new THREE.LatheGeometry(pts, 128); dropGeo.computeVertexNormals();

  const glass = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#f2f6f8'),
    transmission: 1.0, thickness: 2.1, roughness: 0.06, metalness: 0.0,
    ior: 1.42, clearcoat: 1.0, clearcoatRoughness: 0.06,
    iridescence: 1.0, iridescenceIOR: 1.32, iridescenceThicknessRange: [120, 540],
    attenuationColor: new THREE.Color('#cfe7ee'), attenuationDistance: 4.0,
    specularIntensity: 1.0, envMapIntensity: 1.15, transparent: true
  });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(dropGeo, glass));

  // inner "heart" - glows the verdict colour through the glass
  const coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#7fd9ec'), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 32), coreMat);
  core.position.y = -0.15; group.add(core);

  group.scale.setScalar(1.04); scene.add(group);

  const shC = document.createElement('canvas'); shC.width = shC.height = 256;
  const sx = shC.getContext('2d')!;
  const sg = sx.createRadialGradient(128, 128, 8, 128, 128, 128);
  sg.addColorStop(0, 'rgba(0,0,0,0.55)'); sg.addColorStop(0.6, 'rgba(0,0,0,0.18)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  sx.fillStyle = sg; sx.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shC), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.62; scene.add(shadow);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.06;
  controls.enablePan = false; controls.minDistance = 6; controls.maxDistance = 13;
  controls.autoRotate = o.autoRotate; controls.autoRotateSpeed = 0.5;
  controls.minPolarAngle = 0.7; controls.maxPolarAngle = 2.2;
  controls.enabled = o.interactive; controls.target.set(0, 0.2, 0);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.17, 0.85, 0.95);
  composer.addPass(bloom);
  const FinishShader = {
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAberr: { value: 0.0032 }, uVig: { value: 1.15 }, uGrain: { value: 0.05 } },
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
      '  col *= 1.0 - uVig * 0.55 * pow(d, 2.4);',
      '  float n = fract(sin(dot(uv + uTime, vec2(12.9898, 78.233))) * 43758.5453);',
      '  col += (n - 0.5) * uGrain;',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n')
  };
  const finish = new ShaderPass(FinishShader); finish.renderToScreen = true; composer.addPass(finish);

  const resize = () => {
    const w = stage.clientWidth || window.innerWidth, h = stage.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(dpr); composer.setPixelRatio(dpr);
    renderer.setSize(w, h, false); composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize); ro.observe(stage);

  // ---- verdict state machine (smoothly lerped) ----
  let target = STATES[o.verdict] || STATES.idle;
  const targetCore = new THREE.Color(target.core);
  const targetAtten = new THREE.Color(target.atten);
  function setVerdict(name: CueVerdict) {
    if (!STATES[name]) return;
    target = STATES[name];
    targetCore.set(target.core);
    targetAtten.set(target.atten);
  }
  setVerdict(o.verdict);

  const clock = new THREE.Clock();
  let raf = 0, disposed = false;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const tick = () => {
    if (disposed) return;
    const t = clock.getElapsedTime();
    const k = 0.05;
    rimC.intensity = lerp(rimC.intensity, target.cyan, k);
    rimM.intensity = lerp(rimM.intensity, target.mag, k);
    rimL.intensity = lerp(rimL.intensity, target.lime, k);
    bloom.strength = lerp(bloom.strength, target.bloom, k);
    controls.autoRotateSpeed = lerp(controls.autoRotateSpeed, target.rot, k);
    glass.attenuationColor.lerp(targetAtten, k);
    coreMat.color.lerp(targetCore, k);
    const pulse = target === STATES.analyzing ? (0.7 + 0.3 * Math.sin(t * 5)) : 1;
    coreMat.opacity = lerp(coreMat.opacity, target.coreOp * pulse, k);

    group.position.y = 0.2 + Math.sin(t * 0.6) * 0.06;
    group.rotation.y += 0.0008;
    finish.uniforms.uTime.value = t;
    controls.update();
    composer.render();
    raf = requestAnimationFrame(tick);
  };
  tick();

  return {
    THREE, scene, group, setVerdict,
    dispose() { disposed = true; cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); }
  };
}
