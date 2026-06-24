export interface AudioAnalysis {
  durationSec: number;
  sampleRate: number;
  channels: number;
  peakDb: number;
  rmsDb: number;
  lufsEstimate: number;      // real BS.1770-4 integrated LUFS (K-weighted, gated)
  truePeakEstimate: number;  // real 4x-oversampled true peak (dBTP)
  phaseCorrelation: number;
  spectrum: number[];        // ~1/3-octave band levels in dB (log-spaced)
  spectrumFreqs: number[];   // center frequency (Hz) of each spectrum band
  lowEnergy: number;         // dB, < 250 Hz
  midEnergy: number;         // dB, 250 Hz - 4 kHz
  highEnergy: number;        // dB, > 4 kHz
  spectralTiltDbPerOct: number; // slope of the spectrum; ~-3 to -4.5 is "balanced"
  envelope: number[];        // REAL downsampled RMS loudness over the track, normalized 0..1
                             // (drives the droplet's honest audio-reactive pulse — never random)
}

// ---------------------------------------------------------------------------
// Real radix-2 Cooley-Tukey FFT (iterative, in-place). Operates on real input
// by packing it into the real array and zeroing the imaginary array.
// ---------------------------------------------------------------------------
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  // Butterflies
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const ang = (-2 * Math.PI) / size;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let start = 0; start < n; start += size) {
      let curRe = 1, curIm = 0;
      for (let k = 0; k < half; k++) {
        const i = start + k;
        const j = i + half;
        const tRe = re[j] * curRe - im[j] * curIm;
        const tIm = re[j] * curIm + im[j] * curRe;
        re[j] = re[i] - tRe;
        im[j] = im[i] - tIm;
        re[i] += tRe;
        im[i] += tIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

// Biquad direct-form-I applied in place. Returns filtered copy.
function biquad(x: Float32Array, b0: number, b1: number, b2: number, a1: number, a2: number): Float32Array {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    const yi = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = xi; y2 = y1; y1 = yi;
    y[i] = yi;
  }
  return y;
}

// ITU-R BS.1770-4 K-weighting: stage 1 high-shelf (~+4 dB @ 1681 Hz) then
// stage 2 RLB high-pass (~38 Hz). Coefficients re-derived at the file's actual
// sample rate via bilinear transform (RBJ forms below).
// Limitation: bilinear pre-warping makes this a very close - not bit-identical -
// match to the spec's tabulated 48 kHz coefficients; well within R128 tolerance.
function kWeight(x: Float32Array, fs: number): Float32Array {
  // Stage 1: high-shelf, f0=1681.97, gain=+3.999 dB, Q=0.7071 (RBJ high-shelf)
  {
    const A = Math.pow(10, 3.999 / 40);
    const w0 = (2 * Math.PI * 1681.97) / fs;
    const cw = Math.cos(w0), sw = Math.sin(w0);
    const alpha = sw / (2 * 0.7071752);
    const tsA = 2 * Math.sqrt(A) * alpha;
    const b0 = A * ((A + 1) + (A - 1) * cw + tsA);
    const b1 = -2 * A * ((A - 1) + (A + 1) * cw);
    const b2 = A * ((A + 1) + (A - 1) * cw - tsA);
    const a0 = (A + 1) - (A - 1) * cw + tsA;
    const a1 = 2 * ((A - 1) - (A + 1) * cw);
    const a2 = (A + 1) - (A - 1) * cw - tsA;
    x = biquad(x, b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0);
  }
  // Stage 2: high-pass, f0=38.135, Q=0.5003 (RBJ high-pass)
  {
    const w0 = (2 * Math.PI * 38.135) / fs;
    const cw = Math.cos(w0), sw = Math.sin(w0);
    const alpha = sw / (2 * 0.5003270);
    const b0 = (1 + cw) / 2;
    const b1 = -(1 + cw);
    const b2 = (1 + cw) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cw;
    const a2 = 1 - alpha;
    x = biquad(x, b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0);
  }
  return x;
}

// Named analysis stages, in order. Drives the HONEST listening stepper: each name is
// reported (via onStage) right before its heavy loop runs, so the progress bar reflects
// real DSP completion — never a faked 95%-then-snap timer.
export type AnalysisStage = 'decode' | 'loudness' | 'truepeak' | 'spectrum';
export const ANALYSIS_STAGES: AnalysisStage[] = ['decode', 'loudness', 'truepeak', 'spectrum'];

// Yield to the event loop so a stage tick can paint before the next blocking loop runs.
const yieldToPaint = () => new Promise<void>((r) => setTimeout(r, 0));

export async function analyzeAudio(file: File, onStage?: (stage: AnalysisStage) => void): Promise<AudioAnalysis> {
  // STAGE 1 — decode (also covers sample peak + RMS, the cheap first pass).
  onStage?.('decode');
  await yieldToPaint();
  const ctx = new OfflineAudioContext(2, 1, 44100);
  const arrayBuf = await file.arrayBuffer();
  const decoded = await ctx.decodeAudioData(arrayBuf);

  const ch0 = decoded.getChannelData(0);
  const ch1 = decoded.numberOfChannels > 1 ? decoded.getChannelData(1) : ch0;
  const len = ch0.length;
  const fs = decoded.sampleRate;

  // ---- Sample peak ----
  let peak = 0;
  for (let i = 0; i < len; i++) {
    const a0 = Math.abs(ch0[i]);
    const a1 = Math.abs(ch1[i]);
    if (a0 > peak) peak = a0;
    if (a1 > peak) peak = a1;
  }
  const peakDb = 20 * Math.log10(peak || 1e-10);

  // ---- RMS (mono-sum) ----
  let sumSq = 0;
  for (let i = 0; i < len; i++) {
    const mono = (ch0[i] + ch1[i]) / 2;
    sumSq += mono * mono;
  }
  const rms = Math.sqrt(sumSq / len);
  const rmsDb = 20 * Math.log10(rms || 1e-10);

  // ---- REAL loudness envelope: ~96 RMS buckets across the whole track, normalized 0..1.
  // This is the honest signal the droplet pulses to (no random). Computed in the cheap pass. ----
  const BUCKETS = 96;
  const envelope: number[] = new Array(BUCKETS).fill(0);
  {
    const per = Math.max(1, Math.floor(len / BUCKETS));
    let maxv = 1e-9;
    for (let b = 0; b < BUCKETS; b++) {
      const s = b * per;
      const e = Math.min(len, s + per);
      let acc = 0;
      for (let i = s; i < e; i++) { const m = (ch0[i] + ch1[i]) / 2; acc += m * m; }
      const v = Math.sqrt(acc / Math.max(1, e - s));
      envelope[b] = v;
      if (v > maxv) maxv = v;
    }
    for (let b = 0; b < BUCKETS; b++) envelope[b] = envelope[b] / maxv; // normalize to peak
  }

  // STAGE 2 — loudness (real LUFS, the K-weighting + gating pass).
  onStage?.('loudness');
  await yieldToPaint();
  // ---- Real LUFS (BS.1770-4): K-weight each channel, 400ms blocks @ 100ms hop,
  // channel-weighted mean square, two-stage gating (-70 abs, -10 rel) ----
  const lufsEstimate = computeIntegratedLufs(ch0, ch1, fs, decoded.numberOfChannels);

  // STAGE 3 — true peak (4x oversampling) + phase correlation.
  onStage?.('truepeak');
  await yieldToPaint();
  // ---- Real true peak: 4x oversample via windowed-sinc, take max-abs ----
  const truePeakEstimate = computeTruePeak(ch0, ch1, len);

  // ---- Phase correlation (whole-file Pearson) ----
  let sumLR = 0, sumL2 = 0, sumR2 = 0;
  for (let i = 0; i < len; i++) {
    sumLR += ch0[i] * ch1[i];
    sumL2 += ch0[i] * ch0[i];
    sumR2 += ch1[i] * ch1[i];
  }
  const denom = Math.sqrt(sumL2 * sumR2);
  const phaseCorrelation = denom > 0 ? sumLR / denom : 1;

  // STAGE 4 — spectrum (the FFT/Welch pass — "masking"/the #1 fix pick).
  onStage?.('spectrum');
  await yieldToPaint();
  // ---- Spectrum: real FFT, Welch power-averaging across the whole file,
  // then log (1/3-octave) binning of POWER ----
  const { spectrum, spectrumFreqs, lowEnergy, midEnergy, highEnergy, spectralTiltDbPerOct } =
    computeSpectrum(ch0, ch1, len, fs);

  return {
    durationSec: decoded.duration,
    sampleRate: fs,
    channels: decoded.numberOfChannels,
    peakDb: round1(peakDb),
    rmsDb: round1(rmsDb),
    lufsEstimate: round1(lufsEstimate),
    truePeakEstimate: round1(truePeakEstimate),
    phaseCorrelation: Math.round(phaseCorrelation * 100) / 100,
    spectrum,
    spectrumFreqs,
    lowEnergy: round1(lowEnergy),
    midEnergy: round1(midEnergy),
    highEnergy: round1(highEnergy),
    spectralTiltDbPerOct: Math.round(spectralTiltDbPerOct * 100) / 100,
    envelope
  };
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

function computeIntegratedLufs(ch0: Float32Array, ch1: Float32Array, fs: number, channels: number): number {
  const k0 = kWeight(ch0, fs);
  const k1 = channels > 1 ? kWeight(ch1, fs) : k0;
  const blockLen = Math.round(0.4 * fs);   // 400 ms
  const hop = Math.round(0.1 * fs);        // 100 ms (75% overlap)
  if (k0.length < blockLen) return -70;

  // Each block: channel-weighted mean square (L,R weight 1.0).
  const blocks: number[] = [];
  for (let start = 0; start + blockLen <= k0.length; start += hop) {
    let s0 = 0, s1 = 0;
    for (let i = 0; i < blockLen; i++) {
      const a = k0[start + i]; s0 += a * a;
      const b = k1[start + i]; s1 += b * b;
    }
    const ms = s0 / blockLen + (channels > 1 ? s1 / blockLen : 0);
    blocks.push(ms);
  }
  if (blocks.length === 0) return -70;

  const loudness = (ms: number) => -0.691 + 10 * Math.log10(ms || 1e-12);

  // Absolute gate at -70 LUFS
  const absGated = blocks.filter((ms) => loudness(ms) >= -70);
  if (absGated.length === 0) return -70;

  // Relative gate: -10 LU below the mean loudness of absolute-gated blocks
  const meanMsAbs = absGated.reduce((s, v) => s + v, 0) / absGated.length;
  const relThresh = loudness(meanMsAbs) - 10;
  const relGated = absGated.filter((ms) => loudness(ms) >= relThresh);
  const finalBlocks = relGated.length > 0 ? relGated : absGated;

  const meanMs = finalBlocks.reduce((s, v) => s + v, 0) / finalBlocks.length;
  return loudness(meanMs);
}

function computeTruePeak(ch0: Float32Array, ch1: Float32Array, len: number): number {
  // 4x oversampling with a short windowed-sinc (Lanczos) kernel. Inter-sample
  // peaks on limited material can exceed the sample peak - that's the point.
  const OS = 4;
  const TAPS = 8; // half-width
  let tp = 0;
  const evalChannel = (ch: Float32Array) => {
    for (let i = 0; i < len; i++) {
      // sub-sample positions between i and i+1
      for (let s = 0; s < OS; s++) {
        const frac = s / OS;
        if (s === 0) {
          const a = Math.abs(ch[i]);
          if (a > tp) tp = a;
          continue;
        }
        let acc = 0;
        for (let t = -TAPS + 1; t <= TAPS; t++) {
          const idx = i + t;
          if (idx < 0 || idx >= len) continue;
          const x = frac - t;
          // Lanczos-windowed sinc
          let w: number;
          if (x === 0) w = 1;
          else if (x <= -TAPS || x >= TAPS) w = 0;
          else {
            const px = Math.PI * x;
            w = (Math.sin(px) / px) * (Math.sin(px / TAPS) / (px / TAPS));
          }
          acc += ch[idx] * w;
        }
        const a = Math.abs(acc);
        if (a > tp) tp = a;
      }
    }
  };
  evalChannel(ch0);
  if (ch1 !== ch0) evalChannel(ch1);
  return 20 * Math.log10(tp || 1e-10);
}

function computeSpectrum(ch0: Float32Array, ch1: Float32Array, len: number, fs: number) {
  const N = 4096;
  const hop = N / 2; // 50% overlap
  // Hann window + coherent-gain normalization (sum of window).
  const win = new Float64Array(N);
  let winSum = 0;
  for (let i = 0; i < N; i++) {
    win[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
    winSum += win[i];
  }
  const power = new Float64Array(N / 2); // averaged power per FFT bin
  let frames = 0;
  const re = new Float64Array(N);
  const im = new Float64Array(N);

  for (let start = 0; start + N <= len; start += hop) {
    for (let i = 0; i < N; i++) {
      const mono = (ch0[start + i] + ch1[start + i]) / 2;
      re[i] = mono * win[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let k = 0; k < N / 2; k++) {
      // magnitude normalized by coherent gain; *2 for single-sided
      const mag = (2 * Math.sqrt(re[k] * re[k] + im[k] * im[k])) / winSum;
      power[k] += mag * mag;
    }
    frames++;
  }
  if (frames === 0) {
    // File shorter than one frame: single zero-padded frame.
    for (let i = 0; i < N; i++) {
      const mono = i < len ? (ch0[i] + ch1[i]) / 2 : 0;
      re[i] = mono * win[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let k = 0; k < N / 2; k++) {
      const mag = (2 * Math.sqrt(re[k] * re[k] + im[k] * im[k])) / winSum;
      power[k] = mag * mag;
    }
    frames = 1;
  }
  for (let k = 0; k < power.length; k++) power[k] /= frames;

  const binHz = fs / N;
  const nyquist = fs / 2;

  // 1/3-octave bands, 20 Hz .. min(20k, nyquist).
  const fLow = 20;
  const fHigh = Math.min(20000, nyquist);
  const bandsPerOct = 3;
  const ratio = Math.pow(2, 1 / bandsPerOct);
  const spectrum: number[] = [];
  const spectrumFreqs: number[] = [];

  // accumulate band power for tilt + low/mid/high
  let lowP = 0, midP = 0, highP = 0;
  const tiltX: number[] = []; // log2(freq)
  const tiltY: number[] = []; // dB

  // Count bands per region so we can compare AVERAGE power per band, not a raw sum that
  // scales with how many bands a region spans (which also drifts with sample rate). This
  // makes low/mid/high genuinely comparable - the credibility fix.
  let lowN = 0, midN = 0, highN = 0;

  let fCenter = fLow;
  while (fCenter <= fHigh) {
    const fMin = fCenter / Math.sqrt(ratio);
    const fMax = fCenter * Math.sqrt(ratio);
    const kMin = Math.max(1, Math.floor(fMin / binHz));
    const kMax = Math.min(power.length - 1, Math.ceil(fMax / binHz));
    let bandPower = 0;
    for (let k = kMin; k <= kMax; k++) bandPower += power[k];
    const db = 10 * Math.log10(bandPower || 1e-12);
    spectrum.push(round1(db));
    spectrumFreqs.push(Math.round(fCenter));

    if (fCenter < 250) { lowP += bandPower; lowN++; }
    else if (fCenter < 4000) { midP += bandPower; midN++; }
    else { highP += bandPower; highN++; }

    // Tilt over ~100 Hz - 10 kHz only: the sub roll-off and the very top curve the fit.
    if (fCenter >= 100 && fCenter <= 10000) {
      tiltX.push(Math.log2(fCenter));
      tiltY.push(db);
    }

    fCenter *= ratio;
  }

  // Average power per band per region -> dB. Comparable regardless of band count / sample rate.
  const lowEnergy = 10 * Math.log10((lowP / Math.max(1, lowN)) || 1e-12);
  const midEnergy = 10 * Math.log10((midP / Math.max(1, midN)) || 1e-12);
  const highEnergy = 10 * Math.log10((highP / Math.max(1, highN)) || 1e-12);

  // Linear regression of dB vs log2(freq) => slope in dB/octave.
  const n = tiltX.length;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += tiltX[i]; sy += tiltY[i]; sxx += tiltX[i] * tiltX[i]; sxy += tiltX[i] * tiltY[i]; }
  const slope = n > 1 ? (n * sxy - sx * sy) / (n * sxx - sx * sx) : 0;

  return { spectrum, spectrumFreqs, lowEnergy, midEnergy, highEnergy, spectralTiltDbPerOct: slope };
}

export function getRecommendations(a: AudioAnalysis): string[] {
  const recs: string[] = [];
  // -6 LUFS+ is genuinely loudness-war territory; -7..-9 is a normal club master, so don't warn there.
  if (a.lufsEstimate > -6) recs.push('⚠️ Very loud - distortion and fatigue risk. Club masters usually sit around -9 to -7 LUFS.');
  // -16 LUFS is where a full-range mix genuinely reads quiet next to references (not -14, the Spotify target).
  if (a.lufsEstimate < -16) recs.push('💡 This bounce reads quiet next to references - fine if it is unfinished; revisit loudness last.');
  if (a.truePeakEstimate > -1) recs.push('🔴 True peak over -1 dBTP - lossy encoding can push it into clipping. Set the ceiling to -1.0 dBTP.');
  // Negative correlation = real cancellation; below ~0.2 is the softer "check mono" zone for wide stereo.
  if (a.phaseCorrelation < 0) recs.push('🔴 Negative phase correlation - layers are cancelling in mono. Check polarity and reverbs.');
  else if (a.phaseCorrelation < 0.2) recs.push('💡 Very wide image - confirm the low end and key parts survive a mono fold.');
  if (a.peakDb > -0.3) recs.push('💡 Peaks very hot - leave at least -1 dB of headroom before mastering.');
  // Bands are now average-power-per-band, so a few dB of low-over-mid is the meaningful line.
  if (a.lowEnergy - a.midEnergy > 4) recs.push('💡 Low end sits above the mids - check kick/bass balance and level, not more sub.');
  if (a.spectralTiltDbPerOct > -1.5) recs.push('💡 Spectrum tilts bright - a balanced master usually slopes ~-3 to -4.5 dB/octave.');
  if (recs.length === 0) recs.push('✅ Metrics look healthy. Still worth comparing against your reference track.');
  return recs;
}
