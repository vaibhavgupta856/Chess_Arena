package main

import (
	"time"

	"github.com/conan/chessarena/internal/chess"
)

// scheduleClockTimeout arms a one-shot timer for the active player's remaining time.
// Caller must NOT hold session.mu.
func (s *server) scheduleClockTimeout(gameID string) {
	s.mu.RLock()
	session, ok := s.sessions[gameID]
	s.mu.RUnlock()
	if !ok {
		return
	}

	session.mu.Lock()
	if !session.clocksEnabled() || !session.clockRunning || session.game.IsOver() || !session.seatsReady() {
		session.mu.Unlock()
		return
	}
	remaining := session.activeRemainingLocked(time.Now())
	gen := session.clockGen
	session.mu.Unlock()

	if remaining <= 0 {
		s.finishTimeout(gameID, gen)
		return
	}

	go func(expectedGen int, waitMs int64) {
		timer := time.NewTimer(time.Duration(waitMs) * time.Millisecond)
		defer timer.Stop()
		<-timer.C
		s.finishTimeout(gameID, expectedGen)
	}(gen, remaining)
}

func (s *server) cancelClockTimeout(session *gameSession) {
	session.mu.Lock()
	session.clockGen++
	session.clockRunning = false
	session.turnStartedAt = time.Time{}
	session.mu.Unlock()
}

func (s *server) finishTimeout(gameID string, expectedGen int) {
	s.mu.Lock()
	session, ok := s.sessions[gameID]
	if !ok {
		s.mu.Unlock()
		return
	}

	session.mu.Lock()
	if session.clockGen != expectedGen || !session.clocksEnabled() || session.game.IsOver() {
		session.mu.Unlock()
		s.mu.Unlock()
		return
	}
	now := time.Now()
	if session.debitActiveClockLocked(now) {
		// Race: a move arrived and refreshed remaining time; restart if still running needed.
		if !session.game.IsOver() && session.seatsReady() {
			session.startClockLocked(now)
			gen := session.clockGen
			session.mu.Unlock()
			s.mu.Unlock()
			s.scheduleClockTimeoutAfter(gameID, gen)
			return
		}
		session.mu.Unlock()
		s.mu.Unlock()
		return
	}
	_ = session.flagActiveLocked()
	session.clockRunning = false
	session.turnStartedAt = time.Time{}
	session.clockGen++
	session.botThinking = false
	session.botGen++
	session.drawOfferBy = chess.NoColor
	session.mu.Unlock()
	s.mu.Unlock()

	s.applyOnlineRatings(session)
	s.broadcast(gameID)
}

func (s *server) scheduleClockTimeoutAfter(gameID string, expectedGen int) {
	s.mu.RLock()
	session, ok := s.sessions[gameID]
	s.mu.RUnlock()
	if !ok {
		return
	}
	session.mu.Lock()
	if session.clockGen != expectedGen || !session.clockRunning {
		session.mu.Unlock()
		return
	}
	remaining := session.activeRemainingLocked(time.Now())
	session.mu.Unlock()
	if remaining <= 0 {
		s.finishTimeout(gameID, expectedGen)
		return
	}
	go func() {
		timer := time.NewTimer(time.Duration(remaining) * time.Millisecond)
		defer timer.Stop()
		<-timer.C
		s.finishTimeout(gameID, expectedGen)
	}()
}

// prepareMoveClock debits the active clock before a move is applied.
// Returns false if the active side already flagged.
func (s *server) prepareMoveClock(session *gameSession) (mover chess.Color, ok bool) {
	session.mu.Lock()
	defer session.mu.Unlock()
	if session.game.IsOver() {
		return chess.NoColor, false
	}
	mover = session.game.Turn()
	if !session.clocksEnabled() {
		return mover, true
	}
	if !session.seatsReady() {
		return mover, true
	}
	if !session.debitActiveClockLocked(time.Now()) {
		_ = session.flagActiveLocked()
		session.drawOfferBy = chess.NoColor
		return mover, false
	}
	return mover, true
}

// afterMoveClock adds increment for the mover and starts the opponent clock.
func (s *server) afterMoveClock(session *gameSession, mover chess.Color) {
	session.mu.Lock()
	now := time.Now()
	if session.game.IsOver() {
		session.pauseClockLocked(now)
		session.mu.Unlock()
		return
	}
	session.addIncrementLocked(mover)
	session.startClockLocked(now)
	gen := session.clockGen
	running := session.clockRunning
	session.mu.Unlock()
	if running {
		s.scheduleClockTimeoutAfter(session.id, gen)
	}
}

func (s *server) ensureClockStarted(session *gameSession) {
	session.mu.Lock()
	now := time.Now()
	if session.clockRunning || !session.clocksEnabled() || session.game.IsOver() || !session.seatsReady() {
		session.mu.Unlock()
		return
	}
	session.startClockLocked(now)
	gen := session.clockGen
	running := session.clockRunning
	session.mu.Unlock()
	if running {
		s.scheduleClockTimeoutAfter(session.id, gen)
	}
}
