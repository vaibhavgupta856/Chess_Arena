import { useCallback, useState } from 'react'
import { apiFetch } from '../lib/api'
import type { CoachAnalysis, CoachHint, Friend, FriendChallenge, FriendRequest } from '../types'
import type { GameState } from '../types'

export function useFriends() {
  const [friends, setFriends] = useState<Friend[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [challenges, setChallenges] = useState<FriendChallenge[]>([])
  const [searchResults, setSearchResults] = useState<Friend[]>([])
  const [loading, setLoading] = useState(false)

  const loadFriends = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/friends')
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as {
        friends: Friend[]
        requests: FriendRequest[]
        challenges: FriendChallenge[]
      }
      setFriends(data.friends ?? [])
      setRequests(data.requests ?? [])
      setChallenges(data.challenges ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  const searchUsers = useCallback(async (q: string) => {
    const res = await apiFetch(`/users/search?q=${encodeURIComponent(q)}`)
    if (!res.ok) throw new Error(await res.text())
    setSearchResults((await res.json()) as Friend[])
  }, [])

  const sendRequest = useCallback(async (toUserId: string) => {
    const res = await apiFetch('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ toUserId }),
    })
    if (!res.ok) throw new Error(await res.text())
    await loadFriends()
  }, [loadFriends])

  const respondRequest = useCallback(
    async (requestId: string, accept: boolean) => {
      const res = await apiFetch('/friends/respond', {
        method: 'POST',
        body: JSON.stringify({ requestId, accept }),
      })
      if (!res.ok) throw new Error(await res.text())
      await loadFriends()
    },
    [loadFriends],
  )

  const challengeFriend = useCallback(async (opponentId: string) => {
    const res = await apiFetch('/friends/challenge', {
      method: 'POST',
      body: JSON.stringify({ opponentId }),
    })
    if (!res.ok) throw new Error(await res.text())
    return (await res.json()) as {
      gameId: string
      challenge: FriendChallenge
      game: GameState
    }
  }, [])

  const acceptChallenge = useCallback(async (challengeId: string) => {
    const res = await apiFetch(`/friends/challenge/${challengeId}/accept`, { method: 'POST' })
    if (!res.ok) throw new Error(await res.text())
    return (await res.json()) as GameState
  }, [])

  const declineChallenge = useCallback(
    async (challengeId: string) => {
      const res = await apiFetch(`/friends/challenge/${challengeId}/decline`, { method: 'POST' })
      if (!res.ok) throw new Error(await res.text())
      await loadFriends()
    },
    [loadFriends],
  )

  return {
    friends,
    requests,
    challenges,
    searchResults,
    loading,
    loadFriends,
    searchUsers,
    sendRequest,
    respondRequest,
    challengeFriend,
    acceptChallenge,
    declineChallenge,
  }
}

export function useCoach(gameId: string | undefined) {
  const [hint, setHint] = useState<CoachHint | null>(null)
  const [analysis, setAnalysis] = useState<CoachAnalysis | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchHint = useCallback(async () => {
    if (!gameId) return
    setLoading(true)
    try {
      const res = await apiFetch(`/games/${gameId}/coach/hint`, { method: 'POST' })
      if (!res.ok) throw new Error(await res.text())
      setHint((await res.json()) as CoachHint)
    } finally {
      setLoading(false)
    }
  }, [gameId])

  const analyzeLastMove = useCallback(async () => {
    if (!gameId) return
    setLoading(true)
    try {
      const res = await apiFetch(`/games/${gameId}/coach/analyze`, {
        method: 'POST',
        body: JSON.stringify({ type: 'last_move' }),
      })
      if (!res.ok) throw new Error(await res.text())
      setAnalysis((await res.json()) as CoachAnalysis)
    } finally {
      setLoading(false)
    }
  }, [gameId])

  const fetchThreats = useCallback(async () => {
    if (!gameId) return
    setLoading(true)
    try {
      const res = await apiFetch(`/games/${gameId}/coach/analyze`, {
        method: 'POST',
        body: JSON.stringify({ type: 'threats' }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as { explanation: string }
      setAnalysis({ label: 'advice', explanation: data.explanation })
    } finally {
      setLoading(false)
    }
  }, [gameId])

  return { hint, analysis, loading, fetchHint, analyzeLastMove, fetchThreats, clear: () => { setHint(null); setAnalysis(null) } }
}
