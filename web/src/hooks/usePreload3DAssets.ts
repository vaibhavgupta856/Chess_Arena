import { useEffect, useState } from 'react'
import { ALL_MODEL_URLS } from '../lib/models'

export function usePreload3DAssets() {
  const [isLoading, setIsLoading] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let cancelled = false
    const total = ALL_MODEL_URLS.length
    let done = 0

    const bump = () => {
      done += 1
      if (cancelled) return
      setProgress(Math.round((done / total) * 100))
      if (done >= total) setIsLoading(false)
    }

    void Promise.all(
      ALL_MODEL_URLS.map(async (url) => {
        try {
          await fetch(url)
        } finally {
          bump()
        }
      }),
    )

    return () => {
      cancelled = true
    }
  }, [])

  return { isLoading, progress }
}
