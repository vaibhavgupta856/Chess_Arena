let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume()
  }
  return audioCtx
}

function playNoise(duration: number, volume: number) {
  const ctx = getAudioContext()
  const sampleCount = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < sampleCount; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount)
  }

  const source = ctx.createBufferSource()
  const gain = ctx.createGain()
  source.buffer = buffer
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  source.connect(gain)
  gain.connect(ctx.destination)
  source.start()
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.12,
) {
  const ctx = getAudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, ctx.currentTime)
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + duration)
}

export function playMoveSound() {
  playNoise(0.05, 0.14)
  playTone(220, 0.05, 'triangle', 0.07)
}

export function playCaptureSound() {
  playNoise(0.07, 0.2)
  playTone(140, 0.09, 'square', 0.14)
  playTone(90, 0.11, 'sawtooth', 0.08)
}

export function playGameEndSound() {
  playTone(330, 0.18, 'sine', 0.1)
  playTone(440, 0.22, 'sine', 0.09)
}
