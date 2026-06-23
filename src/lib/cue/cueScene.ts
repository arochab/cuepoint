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
// "Silence" reshape + "alive" upgrade. Each state also carries:
//   disp  = static surface-displacement weight (heavier verdict reads wobblier, not animated)
//   rim   = fresnel rim-glow strength in the verdict hue (presence without wallpaper)
//   breath= idle breathing amplitude of the living surface (gentle, never jiggly)
const STATES: Record<CueVerdict, { cyan: number; mag: number; lime: number; atten: string; core: string; coreOp: number; bloom: number; rot: number; disp: number; rim: number; breath: number }> = {
  idle:      { cyan: 2.8, mag: 2.1, lime: 1.1, atten: '#cfe7ee', core: '#7fd9ec', coreOp: 0.0,  bloom: 0.168, rot: 0.25,  disp: 0.30, rim: 0.18, breath: 1.0 },
  analyzing: { cyan: 3.8, mag: 1.5, lime: 1.5, atten: '#bfe9f3', core: '#36C9D6', coreOp: 0.30, bloom: 0.240, rot: 0.70,  disp: 0.55, rim: 0.40, breath: 1.4 },
  send:      { cyan: 1.4, mag: 0.5, lime: 5.6, atten: '#dcf2a8', core: '#C9F23C', coreOp: 0.55, bloom: 0.312, rot: 0.35,  disp: 0.45, rim: 0.65, breath: 1.1 },
  one:       { cyan: 5.6, mag: 1.0, lime: 1.2, atten: '#b6e9f3', core: '#36C9D6', coreOp: 0.50, bloom: 0.276, rot: 0.30,  disp: 0.48, rim: 0.70, breath: 1.1 },
  not:       { cyan: 0.9, mag: 5.6, lime: 0.5, atten: '#f4c4e2', core: '#F73CB0', coreOp: 0.52, bloom: 0.276, rot: 0.225, disp: 0.42, rim: 0.62, breath: 1.0 }
};

// ---- Living-surface shader chunks (injected into MeshPhysicalMaterial via onBeforeCompile) ----
// A cheap 3D simplex-ish noise (Ashima) for organic vertex displacement. The droplet breathes
// and ripples; during analysis a REAL audio envelope (uAudio) deepens the ripple — never random.
const NOISE_GLSL = `
uniform float uTime; uniform float uAudio; uniform float uReactive;
uniform float uDisp; uniform float uBreath; uniform float uNoiseFreq;
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i); vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
// the living offset along the normal at a surface point
float cueLife(vec3 p, vec3 n){
  float tt = uTime * 0.5;
  float slow = snoise(p * uNoiseFreq + vec3(0.0, tt, 0.0));
  float fast = snoise(p * (uNoiseFreq * 2.3) + vec3(tt * 1.7, 0.0, tt));
  float breath = sin(uTime * 0.9) * 0.5 + 0.5;
  float base = (slow * 0.7 + fast * 0.3);
  float amp = 0.045 * uDisp * uBreath;          // calm by default
  float audio = uReactive * uAudio * 0.075;     // REAL envelope deepens the ripple
  return base * (amp + audio) + breath * 0.010 * uBreath;
}`;

const BEGINNORMAL_INJECT = `
  vec3 objectNormal = vec3( normal );
  {
    float e = 0.02;
    vec3 pp = position;
    float c0 = cueLife(pp, objectNormal);
    float cx = cueLife(pp + vec3(e,0.0,0.0), objectNormal);
    float cy = cueLife(pp + vec3(0.0,e,0.0), objectNormal);
    float cz = cueLife(pp + vec3(0.0,0.0,e), objectNormal);
    vec3 grad = vec3(cx - c0, cy - c0, cz - c0) / e;
    objectNormal = normalize(objectNormal - grad * 0.8);   // perturb so refraction follows the wobble
  }`;

const BEGIN_INJECT = `
  vec3 transformed = vec3( position );
  transformed += normalize( normal ) * cueLife( position, normalize( normal ) );`;

// Fresnel rim-glow in the verdict hue, added to outgoing light just before it is written.
const FRAG_PARS = `
uniform vec3 uRimColor; uniform float uRimStrength;`;
const OPAQUE_INJECT = `
  {
    float fres = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0), 3.0);
    outgoingLight += uRimColor * fres * uRimStrength;
  }
  #include <opaque_fragment>`;

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
    transmission: 1.0, thickness: 2.4, roughness: 0.05, metalness: 0.0,
    ior: 1.45, clearcoat: 1.0, clearcoatRoughness: 0.05,
    // richer iridescence for more "material" — wider thickness range = more colour play
    iridescence: 1.0, iridescenceIOR: 1.34, iridescenceThicknessRange: [120, 680],
    attenuationColor: new THREE.Color('#cfe7ee'), attenuationDistance: 4.0,
    specularIntensity: 1.0, envMapIntensity: 1.3, transparent: true
  });

  // Living-surface + rim-glow uniforms, shared by reference so tick() writes them live.
  const cueU = {
    uTime: { value: 0 }, uAudio: { value: 0 }, uReactive: { value: 0 },
    uDisp: { value: STATES[o.verdict].disp }, uBreath: { value: STATES[o.verdict].breath },
    uNoiseFreq: { value: 1.7 },
    uRimColor: { value: new THREE.Color(STATES[o.verdict].core) },
    uRimStrength: { value: STATES[o.verdict].rim }
  };
  glass.onBeforeCompile = (shader) => {
    Object.keys(cueU).forEach((k) => { shader.uniforms[k] = (cueU as Record<string, { value: unknown }>)[k]; });
    shader.vertexShader = NOISE_GLSL + '\n' + shader.vertexShader
      .replace('#include <beginnormal_vertex>', BEGINNORMAL_INJECT)
      .replace('#include <begin_vertex>', BEGIN_INJECT);
    shader.fragmentShader = FRAG_PARS + '\n' + shader.fragmentShader
      .replace('#include <opaque_fragment>', OPAQUE_INJECT);
  };
  // pin a cache key so the injected variant is stable across recompiles
  glass.customProgramCacheKey = () => 'cueAlive-v1';

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

  // ---- HONEST audio reactivity ----
  // energy is a REAL [0..1] envelope value pushed in by the app (RMS of the decoded buffer).
  // It only deepens the living ripple while analyzing; it is NEVER random and decays to 0.
  let energy = 0;
  function setEnergy(e: number) { energy = Math.max(0, Math.min(1, e)); }

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
    const analyzing = target === STATES.analyzing;
    const pulse = analyzing ? (0.7 + 0.3 * Math.sin(t * 5)) : 1;
    coreMat.opacity = lerp(coreMat.opacity, target.coreOp * pulse, k);

    // drive the living-surface uniforms (gated so idle stays calm)
    cueU.uTime.value = t;
    cueU.uDisp.value = lerp(cueU.uDisp.value, target.disp, k);
    cueU.uBreath.value = lerp(cueU.uBreath.value, target.breath, k);
    cueU.uRimColor.value.lerp(targetCore, k);
    cueU.uRimStrength.value = lerp(cueU.uRimStrength.value, target.rim, k);
    // reactive only while analyzing; the REAL envelope drives the depth, smoothed
    cueU.uReactive.value = lerp(cueU.uReactive.value, analyzing ? 1 : 0, 0.08);
    cueU.uAudio.value = lerp(cueU.uAudio.value, analyzing ? energy : 0, 0.25);

    group.position.y = 0.2 + Math.sin(t * 0.6) * 0.06;
    group.rotation.y += 0.0008;
    finish.uniforms.uTime.value = t;
    controls.update();
    composer.render();
    raf = requestAnimationFrame(tick);
  };
  tick();

  return {
    THREE, scene, group, setVerdict, setEnergy,
    dispose() { disposed = true; cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); }
  };
}
