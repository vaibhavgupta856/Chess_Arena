const VOICE_MUTE_KEY = 'chessarena-tour-voice-muted'

export function tourVoiceUrl(stepId: string) {
  return `/tour/voice/${stepId}.mp3`
}

export function readTourVoiceMuted() {
  try {
    return localStorage.getItem(VOICE_MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export function persistTourVoiceMuted(muted: boolean) {
  try {
    localStorage.setItem(VOICE_MUTE_KEY, muted ? '1' : '0')
  } catch {
    // ignore
  }
}
