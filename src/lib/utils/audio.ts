export interface AudioAnalysis {
  durationSec: number;
  sampleRate: number;
  channels: number;
  peakDb: number;
  rmsDb: number;
  lufsEstimate: number;
  truePeakEstimate: number;
  phaseCorrelation: number;
  spectrum: number[];
}

export async function analyzeAudio(file: File): Promise<AudioAnalysis> {
  const ctx = new OfflineAudioContext(2, 1, 44100);
  const arrayBuf = await file.arrayBuffer();
  const decoded = await ctx.decodeAudioData(arrayBuf);

  const ch0 = decoded.getChannelData(0);
  const ch1 = decoded.numberOfChannels > 1 ? decoded.getChannelData(1) : ch0;
  const len = ch0.length;

  // Peak
  let peak = 0;
  for (let i = 0; i < len; i++) {
    const abs0 = Math.abs(ch0[i]);
    const abs1 = Math.abs(ch1[i]);
    if (abs0 > peak) peak = abs0;
    if (abs1 > peak) peak = abs1;
  }
  const peakDb = 20 * Math.log10(peak || 1e-10);

  // RMS
  let sumSq = 0;
  for (let i = 0; i < len; i++) {
    const mono = (ch0[i] + ch1[i]) / 2;
    sumSq += mono * mono;
  }
  const rms = Math.sqrt(sumSq / len);
  const rmsDb = 20 * Math.log10(rms || 1e-10);

  // LUFS estimate (simplified K-weighted)
  const lufsEstimate = rmsDb - 0.7;

  // True peak estimate (2x oversampling approximation)
  let truePeak = peak;
  for (let i = 1; i < len - 1; i++) {
    const interp0 = (ch0[i - 1] + ch0[i]) / 2;
    const interp1 = (ch1[i - 1] + ch1[i]) / 2;
    const a0 = Math.abs(interp0);
    const a1 = Math.abs(interp1);
    if (a0 > truePeak) truePeak = a0;
    if (a1 > truePeak) truePeak = a1;
  }
  const truePeakEstimate = 20 * Math.log10(truePeak || 1e-10);

  // Phase correlation
  let sumLR = 0, sumL2 = 0, sumR2 = 0;
  for (let i = 0; i < len; i++) {
    sumLR += ch0[i] * ch1[i];
    sumL2 += ch0[i] * ch0[i];
    sumR2 += ch1[i] * ch1[i];
  }
  const denom = Math.sqrt(sumL2 * sumR2);
  const phaseCorrelation = denom > 0 ? sumLR / denom : 1;

  // Spectrum (FFT on a mid-section)
  const fftSize = 4096;
  const midStart = Math.max(0, Math.floor(len / 2) - fftSize / 2);
  const fftCtx = new OfflineAudioContext(1, fftSize, decoded.sampleRate);
  const buf = fftCtx.createBuffer(1, fftSize, decoded.sampleRate);
  const fftData = buf.getChannelData(0);
  for (let i = 0; i < fftSize; i++) {
    const idx = midStart + i;
    fftData[i] = idx < len ? (ch0[idx] + ch1[idx]) / 2 : 0;
    // Hann window
    fftData[i] *= 0.5 * (1 - Math.cos((2 * Math.PI * i) / fftSize));
  }
  const src = fftCtx.createBufferSource();
  src.buffer = buf;
  const analyser = fftCtx.createAnalyser();
  analyser.fftSize = fftSize;
  src.connect(analyser);
  analyser.connect(fftCtx.destination);
  src.start();
  await fftCtx.startRendering();

  const freqBins = new Float32Array(analyser.frequencyBinCount);
  analyser.getFloatFrequencyData(freqBins);

  // Downsample spectrum to 64 bands
  const bands = 64;
  const spectrum: number[] = [];
  const binsPer = Math.floor(freqBins.length / bands);
  for (let b = 0; b < bands; b++) {
    let sum = 0;
    for (let j = 0; j < binsPer; j++) {
      sum += freqBins[b * binsPer + j];
    }
    spectrum.push(sum / binsPer);
  }

  return {
    durationSec: decoded.duration,
    sampleRate: decoded.sampleRate,
    channels: decoded.numberOfChannels,
    peakDb: Math.round(peakDb * 10) / 10,
    rmsDb: Math.round(rmsDb * 10) / 10,
    lufsEstimate: Math.round(lufsEstimate * 10) / 10,
    truePeakEstimate: Math.round(truePeakEstimate * 10) / 10,
    phaseCorrelation: Math.round(phaseCorrelation * 100) / 100,
    spectrum
  };
}

export function getRecommendations(a: AudioAnalysis): string[] {
  const recs: string[] = [];
  if (a.lufsEstimate > -6) recs.push('⚠️ Très fort — risque de distorsion et fatigue. Vise −8 à −6 LUFS pour le club.');
  if (a.lufsEstimate < -14) recs.push('💡 Niveau bas — ton track sera perçu comme faible en playlist. Pousse le limiter.');
  if (a.truePeakEstimate > -0.5) recs.push('🔴 True peak trop haut — risque de clipping en conversion. Ceiling à −1.0 dB TP.');
  if (a.phaseCorrelation < 0.3) recs.push('⚠️ Corrélation de phase basse — vérifie la compatibilité mono, surtout dans le bas.');
  if (a.phaseCorrelation < 0) recs.push('🔴 Phase négative — problèmes sérieux en mono. Vérifie tes couches et reverbs.');
  if (a.peakDb > -0.3) recs.push('💡 Peaks très hauts — laisse au moins −1 dB de headroom avant le mastering.');
  const lowEnd = a.spectrum.slice(0, 8).reduce((s, v) => s + v, 0) / 8;
  const midRange = a.spectrum.slice(16, 32).reduce((s, v) => s + v, 0) / 16;
  if (lowEnd - midRange > 15) recs.push('💡 Bas très dominant vs. médiums — vérifie la balance kick/bass.');
  if (recs.length === 0) recs.push('✅ Les métriques ont l\'air saines. Compare quand même avec ta référence.');
  return recs;
}