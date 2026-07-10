package main

import (
	"math"

	"github.com/conan/chessarena/internal/chess"
)

const eloK = 32

func eloExpected(ratingA, ratingB int) float64 {
	return 1.0 / (1.0 + math.Pow(10, float64(ratingB-ratingA)/400.0))
}

func eloDelta(ratingA, ratingB int, scoreA float64) int {
	exp := eloExpected(ratingA, ratingB)
	return int(math.Round(eloK * (scoreA - exp)))
}

// applyOnlineRatings updates ELO when an online rated game finishes between two accounts.
func (s *server) applyOnlineRatings(session *gameSession) {
	if s.store == nil || session == nil {
		return
	}
	session.mu.Lock()
	defer session.mu.Unlock()

	if session.ratingDone || session.mode != "online" || !session.game.IsOver() {
		return
	}
	whiteID := session.whitePlayer
	blackID := session.blackPlayer
	if whiteID == "" || blackID == "" || whiteID == "bot" || blackID == "bot" {
		return
	}

	white, errW := s.store.GetUserByID(whiteID)
	black, errB := s.store.GetUserByID(blackID)
	if errW != nil || errB != nil {
		return
	}

	var whiteScore float64
	switch session.game.Outcome() {
	case chess.WhiteWins:
		whiteScore = 1
	case chess.BlackWins:
		whiteScore = 0
	case chess.Draw:
		whiteScore = 0.5
	default:
		return
	}

	dWhite := eloDelta(white.EloRating, black.EloRating, whiteScore)
	dBlack := eloDelta(black.EloRating, white.EloRating, 1-whiteScore)

	newWhite := white.EloRating + dWhite
	newBlack := black.EloRating + dBlack
	if newWhite < 100 {
		newWhite = 100
	}
	if newBlack < 100 {
		newBlack = 100
	}

	if err := s.store.SetElo(whiteID, newWhite); err != nil {
		return
	}
	if err := s.store.SetElo(blackID, newBlack); err != nil {
		return
	}

	session.ratingDone = true
	session.whiteDelta = newWhite - white.EloRating
	session.blackDelta = newBlack - black.EloRating
}
