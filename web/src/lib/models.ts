// 3D pieces use lightweight procedural geometry (no GLB download).
// Set VITE_USE_GLB_PIECES=true to opt into legacy ~180MB model files.
export const USE_GLB_PIECES = import.meta.env.VITE_USE_GLB_PIECES === 'true'
