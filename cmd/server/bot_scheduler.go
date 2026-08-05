package main

import (
	"time"

	"github.com/conan/chessarena/internal/chess"
)

const botMoveDelay = 700 * time.Millisecond

func (s *server) scheduleBotMove(gameID string) {
	s.mu.RLock()
	session, ok := s.sessions[gameID]
	s.mu.RUnlock()
	if !ok || session.mode != "bot" {
		return
	}

	session.mu.Lock()
	if session.game.IsOver() || session.game.Turn() != session.botColor {
		session.mu.Unlock()
		return
	}
	if session.botThinking {
		session.mu.Unlock()
		return
	}
	session.botThinking = true
	session.botGen++
	gen := session.botGen
	session.mu.Unlock()

	go func() {
		time.Sleep(botMoveDelay)

		s.mu.Lock()
		session, ok := s.sessions[gameID]
		if !ok {
			s.mu.Unlock()
			return
		}

		session.mu.Lock()
		if session.botGen != gen || session.game.IsOver() || session.game.Turn() != session.botColor {
			session.botThinking = false
			session.mu.Unlock()
			s.mu.Unlock()
			s.broadcast(gameID)
			return
		}
		mover := session.game.Turn()
		if session.clocksEnabled() && session.seatsReady() {
			if !session.debitActiveClockLocked(time.Now()) {
				_ = session.flagActiveLocked()
				session.botThinking = false
				session.drawOfferBy = chess.NoColor
				session.mu.Unlock()
				s.mu.Unlock()
				s.applyOnlineRatings(session)
				s.broadcast(gameID)
				return
			}
		}
		err := session.maybeBotMove()
		session.botThinking = false
		if err == nil && !session.game.IsOver() {
			session.addIncrementLocked(mover)
			session.startClockLocked(time.Now())
		} else if session.game.IsOver() {
			session.pauseClockLocked(time.Now())
		}
		genClock := session.clockGen
		running := session.clockRunning
		over := session.game.IsOver()
		session.mu.Unlock()
		s.mu.Unlock()

		if over {
			s.applyOnlineRatings(session)
		} else if running {
			s.scheduleClockTimeoutAfter(gameID, genClock)
		}
		s.broadcast(gameID)
	}()
}

func (s *server) cancelBotMove(session *gameSession) {
	session.mu.Lock()
	session.botGen++
	session.botThinking = false
	session.mu.Unlock()
}

func (s *server) botShouldSchedule(session *gameSession) bool {
	if session.mode != "bot" || session.game.IsOver() {
		return false
	}
	return session.game.Turn() == session.botColor
}
