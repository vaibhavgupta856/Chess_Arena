package main

import (
	"fmt"
	"sync"
	"time"

	"github.com/conan/chessarena/internal/chess"
)

type timeControl struct {
	ID          string
	InitialMs   int64
	IncrementMs int64
}

var timeControls = map[string]timeControl{
	"unlimited": {ID: "unlimited", InitialMs: 0, IncrementMs: 0},
	"1+0":       {ID: "1+0", InitialMs: 60_000, IncrementMs: 0},
	"3+2":       {ID: "3+2", InitialMs: 180_000, IncrementMs: 2_000},
	"5+0":       {ID: "5+0", InitialMs: 300_000, IncrementMs: 0},
	"10+0":      {ID: "10+0", InitialMs: 600_000, IncrementMs: 0},
}

const defaultTimeControlID = "10+0"

func parseTimeControl(id string) timeControl {
	if tc, ok := timeControls[id]; ok {
		return tc
	}
	return timeControls[defaultTimeControlID]
}

type gameSession struct {
	mu          sync.Mutex
	id          string
	game        *chess.Game
	mode        string // local, online, bot
	whitePlayer string
	blackPlayer string
	botColor    chess.Color
	botLevel    chess.BotLevel
	botThinking bool
	botGen      int
	drawOfferBy chess.Color
	ratingDone  bool
	whiteDelta  int
	blackDelta  int

	timeControlID string
	initialTimeMs int64
	incrementMs   int64
	whiteTimeMs   int64
	blackTimeMs   int64
	clockRunning  bool
	turnStartedAt time.Time
	clockGen      int
}

func newSession(id string, mode string, playAs string, clientID string, botLevel chess.BotLevel, timeControlID string) *gameSession {
	tc := parseTimeControl(timeControlID)
	s := &gameSession{
		id:            id,
		game:          chess.NewGame(),
		mode:          mode,
		botLevel:      botLevel,
		timeControlID: tc.ID,
		initialTimeMs: tc.InitialMs,
		incrementMs:   tc.IncrementMs,
		whiteTimeMs:   tc.InitialMs,
		blackTimeMs:   tc.InitialMs,
	}
	if s.botLevel == "" {
		s.botLevel = chess.BotCasual
	}
	switch mode {
	case "bot":
		switch playAs {
		case "black":
			s.blackPlayer = clientID
			s.whitePlayer = "bot"
			s.botColor = chess.White
		default:
			s.whitePlayer = clientID
			s.blackPlayer = "bot"
			s.botColor = chess.Black
		}
	case "online":
		if clientID != "" {
			s.whitePlayer = clientID
		}
	default:
		s.mode = "local"
	}
	return s
}

func (s *gameSession) join(clientID string) (string, error) {
	if s.mode != "online" {
		return "", fmt.Errorf("not an online room")
	}
	if clientID == s.whitePlayer {
		return "white", nil
	}
	if clientID == s.blackPlayer {
		return "black", nil
	}
	if s.blackPlayer == "" && clientID != s.whitePlayer {
		s.blackPlayer = clientID
		return "black", nil
	}
	if s.whitePlayer == "" {
		s.whitePlayer = clientID
		return "white", nil
	}
	return "spectator", nil
}

func (s *gameSession) playerColor(clientID string) chess.Color {
	if clientID != "" && clientID == s.whitePlayer {
		return chess.White
	}
	if clientID != "" && clientID == s.blackPlayer {
		return chess.Black
	}
	return chess.NoColor
}

func (s *gameSession) canMove(clientID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.botThinking {
		return false
	}
	if s.game.IsOver() {
		return false
	}
	switch s.mode {
	case "local":
		return true
	case "bot":
		if s.game.Turn() == s.botColor {
			return false
		}
		color := s.playerColor(clientID)
		return color != chess.NoColor && s.game.Turn() == color
	case "online":
		if s.whitePlayer == "" || s.blackPlayer == "" {
			return false
		}
		color := s.playerColor(clientID)
		if color == chess.NoColor {
			return false
		}
		return s.game.Turn() == color
	default:
		return true
	}
}

func (s *gameSession) offerDraw(color chess.Color) error {
	if s.game.IsOver() {
		return fmt.Errorf("game is over")
	}
	if color == chess.NoColor {
		return fmt.Errorf("invalid color")
	}
	s.drawOfferBy = color
	return nil
}

func (s *gameSession) respondDraw(color chess.Color, accept bool) error {
	if s.game.IsOver() {
		return fmt.Errorf("game is over")
	}
	if s.drawOfferBy == chess.NoColor {
		return fmt.Errorf("no draw offer pending")
	}
	if s.drawOfferBy == color {
		return fmt.Errorf("cannot respond to your own offer")
	}
	if !accept {
		s.drawOfferBy = chess.NoColor
		return nil
	}
	s.drawOfferBy = chess.NoColor
	return s.game.ClaimDraw(chess.DrawOfferClaim)
}

func (s *gameSession) maybeBotMove() error {
	if s.mode != "bot" || s.game.IsOver() {
		return nil
	}
	if s.game.Turn() != s.botColor {
		return nil
	}
	move, ok := chess.ChooseBotMove(s.game, s.botLevel)
	if !ok {
		return nil
	}
	return s.game.ApplyMove(move)
}

func (s *gameSession) clocksEnabled() bool {
	return s.initialTimeMs > 0
}

func (s *gameSession) seatsReady() bool {
	switch s.mode {
	case "online":
		return s.whitePlayer != "" && s.blackPlayer != ""
	default:
		return true
	}
}

func (s *gameSession) activeRemainingLocked(now time.Time) int64 {
	remaining := s.whiteTimeMs
	if s.game.Turn() == chess.Black {
		remaining = s.blackTimeMs
	}
	if !s.clockRunning || s.turnStartedAt.IsZero() {
		return remaining
	}
	elapsed := now.Sub(s.turnStartedAt).Milliseconds()
	if elapsed < 0 {
		elapsed = 0
	}
	left := remaining - elapsed
	if left < 0 {
		return 0
	}
	return left
}

func (s *gameSession) pauseClockLocked(now time.Time) {
	if !s.clockRunning {
		return
	}
	left := s.activeRemainingLocked(now)
	if s.game.Turn() == chess.White {
		s.whiteTimeMs = left
	} else {
		s.blackTimeMs = left
	}
	s.clockRunning = false
	s.turnStartedAt = time.Time{}
	s.clockGen++
}

func (s *gameSession) startClockLocked(now time.Time) {
	if !s.clocksEnabled() || s.game.IsOver() || !s.seatsReady() {
		s.clockRunning = false
		s.turnStartedAt = time.Time{}
		return
	}
	s.clockRunning = true
	s.turnStartedAt = now
	s.clockGen++
}

// debitActiveClockLocked subtracts elapsed time for the side to move.
// Returns true if that side still has time remaining.
func (s *gameSession) debitActiveClockLocked(now time.Time) bool {
	if !s.clocksEnabled() {
		return true
	}
	left := s.activeRemainingLocked(now)
	if s.game.Turn() == chess.White {
		s.whiteTimeMs = left
	} else {
		s.blackTimeMs = left
	}
	s.clockRunning = false
	s.turnStartedAt = time.Time{}
	s.clockGen++
	return left > 0
}

func (s *gameSession) addIncrementLocked(color chess.Color) {
	if !s.clocksEnabled() || s.incrementMs <= 0 {
		return
	}
	if color == chess.White {
		s.whiteTimeMs += s.incrementMs
	} else if color == chess.Black {
		s.blackTimeMs += s.incrementMs
	}
}

func (s *gameSession) snapshotTimesLocked(now time.Time) (whiteMs, blackMs int64, running bool, updatedAt time.Time) {
	whiteMs = s.whiteTimeMs
	blackMs = s.blackTimeMs
	running = s.clockRunning && s.clocksEnabled() && !s.game.IsOver()
	updatedAt = now
	if !running || s.turnStartedAt.IsZero() {
		return whiteMs, blackMs, false, now
	}
	left := s.activeRemainingLocked(now)
	if s.game.Turn() == chess.White {
		whiteMs = left
	} else {
		blackMs = left
	}
	return whiteMs, blackMs, true, now
}

func (s *gameSession) flagActiveLocked() error {
	return s.game.Flag(s.game.Turn())
}
