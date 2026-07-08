package chess

import "fmt"

// ClaimableDraws returns draw claims available to the current player.
func (g *Game) ClaimableDraws() []DrawClaim {
	if g.IsOver() {
		return nil
	}
	claims := []DrawClaim{DrawOfferClaim}
	if g.repetitionCount() >= 3 {
		claims = append(claims, ThreefoldRepetitionClaim)
	}
	if g.HalfMoveClock() >= 100 {
		claims = append(claims, FiftyMoveRuleClaim)
	}
	return claims
}

// ClaimDraw ends the game in a draw by the given claim.
func (g *Game) ClaimDraw(claim DrawClaim) error {
	if g.IsOver() {
		return fmt.Errorf("chess: game is already over")
	}
	switch claim {
	case DrawOfferClaim:
		g.outcome = Draw
		g.term = DrawOffer
	case ThreefoldRepetitionClaim:
		if g.repetitionCount() < 3 {
			return fmt.Errorf("chess: threefold repetition not available")
		}
		g.outcome = Draw
		g.term = ThreefoldRepetition
	case FiftyMoveRuleClaim:
		if g.HalfMoveClock() < 100 {
			return fmt.Errorf("chess: fifty-move rule not available")
		}
		g.outcome = Draw
		g.term = FiftyMoveRule
	default:
		return errUnsupportedDrawClaim
	}
	return nil
}

// Resign ends the game with a win for the opponent.
func (g *Game) Resign(color Color) error {
	if g.IsOver() {
		return fmt.Errorf("chess: game is already over")
	}
	if color == NoColor {
		return fmt.Errorf("chess: invalid color")
	}
	if color == White {
		g.outcome = BlackWins
	} else {
		g.outcome = WhiteWins
	}
	g.term = Resignation
	return nil
}
