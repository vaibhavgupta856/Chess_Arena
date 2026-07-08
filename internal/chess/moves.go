package chess

import "fmt"

var errUnsupportedDrawClaim = fmt.Errorf("chess: unsupported draw claim")

// LegalMoves returns all legal moves for the side to move.
func (g *Game) LegalMoves() []Move {
	if g.IsOver() {
		return nil
	}
	return g.current().legalMoves()
}

// LegalMovesFrom returns legal moves for a specific square.
func (g *Game) LegalMovesFrom(sq Square) []Move {
	all := g.LegalMoves()
	out := make([]Move, 0)
	for _, m := range all {
		if m.From == sq {
			out = append(out, m)
		}
	}
	return out
}

// IsLegal reports whether a move is currently legal.
func (g *Game) IsLegal(m Move) bool {
	return g.findMove(m)
}

// ApplyMove applies a move if it is legal.
func (g *Game) ApplyMove(m Move) error {
	return g.applyLegalMove(m)
}
