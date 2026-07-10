package main

import (
	"fmt"
	"sync"

	"github.com/conan/chessarena/internal/chess"
)

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
}

func newSession(id string, mode string, playAs string, clientID string, botLevel chess.BotLevel) *gameSession {
	s := &gameSession{
		id:       id,
		game:     chess.NewGame(),
		mode:     mode,
		botLevel: botLevel,
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
