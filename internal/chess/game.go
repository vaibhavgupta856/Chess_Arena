package chess

import "fmt"

// Game is a server-authoritative chess game with full move history.
type Game struct {
	positions []Position
	moves     []Move
	keys      []uint64
	outcome   Outcome
	term      Termination
}

// NewGame returns a game in the standard starting position.
func NewGame() *Game {
	pos := startingPosition()
	return &Game{
		positions: []Position{pos},
		keys:      []uint64{pos.repetitionKey()},
		outcome:   Ongoing,
	}
}

// NewGameFromFEN creates a game from a FEN string.
func NewGameFromFEN(fen string) (*Game, error) {
	pos, err := parseFEN(fen)
	if err != nil {
		return nil, fmt.Errorf("chess: invalid FEN: %w", err)
	}
	g := &Game{
		positions: []Position{pos},
		keys:      []uint64{pos.repetitionKey()},
		outcome:   Ongoing,
	}
	g.updateTerminal()
	return g, nil
}

func (g *Game) current() Position {
	return g.positions[len(g.positions)-1]
}

// FEN returns the current position in FEN notation.
func (g *Game) FEN() string {
	return g.current().fen()
}

// Turn returns the side to move.
func (g *Game) Turn() Color {
	return g.current().turn
}

// InCheck reports whether the side to move is in check.
func (g *Game) InCheck() bool {
	return g.current().inCheck(g.current().turn)
}

// IsOver reports whether the game has ended.
func (g *Game) IsOver() bool {
	return g.outcome != Ongoing
}

// Outcome returns the game result.
func (g *Game) Outcome() Outcome {
	return g.outcome
}

// Termination returns how the game ended.
func (g *Game) Termination() Termination {
	return g.term
}

// PieceAt returns the piece on a square.
func (g *Game) PieceAt(sq Square) Piece {
	return g.current().pieceAt(sq)
}

// MoveCount returns the full-move counter from the current FEN.
func (g *Game) MoveCount() int {
	return g.current().fullMove
}

// HalfMoveClock returns the half-move clock for the 50-move rule.
func (g *Game) HalfMoveClock() int {
	return g.current().halfMove
}

// MoveHistory returns all played moves with notation.
func (g *Game) MoveHistory() []MoveRecord {
	records := make([]MoveRecord, 0, len(g.moves))
	pos := g.positions[0]
	for i, m := range g.moves {
		records = append(records, MoveRecord{
			Move: m,
			SAN:  encodeSAN(pos, m),
			UCI:  m.UCI(),
		})
		pos = g.positions[i+1]
	}
	return records
}

func (g *Game) applyLegalMove(m Move) error {
	if g.IsOver() {
		return fmt.Errorf("chess: game is already over")
	}
	if !g.findMove(m) {
		return fmt.Errorf("chess: illegal move %s", m.UCI())
	}
	pos := g.current()
	next := pos.clone()
	next.makeMove(m)
	g.positions = append(g.positions, next)
	g.moves = append(g.moves, m)
	g.keys = append(g.keys, next.repetitionKey())
	g.updateTerminal()
	return nil
}

func (g *Game) findMove(m Move) bool {
	for _, lm := range g.LegalMoves() {
		if movesMatch(lm, m) {
			return true
		}
	}
	return false
}

func (g *Game) repetitionCount() int {
	key := g.current().repetitionKey()
	count := 0
	for _, k := range g.keys {
		if k == key {
			count++
		}
	}
	return count
}

func (g *Game) updateTerminal() {
	if g.term == Resignation || g.term == DrawOffer || g.term == ThreefoldRepetition || g.term == FiftyMoveRule {
		return
	}
	if g.term == Checkmate || g.term == Stalemate || g.term == FivefoldRepetition || g.term == SeventyFiveMoveRule || g.term == InsufficientMaterial {
		return
	}

	pos := g.current()
	moves := pos.legalMoves()
	inCheck := pos.inCheck(pos.turn)

	if len(moves) == 0 {
		if inCheck {
			g.outcome = WhiteWins
			if pos.turn == White {
				g.outcome = BlackWins
			}
			g.term = Checkmate
		} else {
			g.outcome = Draw
			g.term = Stalemate
		}
		return
	}

	if g.repetitionCount() >= 5 {
		g.outcome = Draw
		g.term = FivefoldRepetition
		return
	}
	if pos.halfMove >= 150 {
		g.outcome = Draw
		g.term = SeventyFiveMoveRule
		return
	}
	if hasInsufficientMaterial(pos) {
		g.outcome = Draw
		g.term = InsufficientMaterial
	}
}

func hasInsufficientMaterial(pos Position) bool {
	if !pos.kingSquare(White).Valid() || !pos.kingSquare(Black).Valid() {
		return false
	}
	var knights, whiteBishops, blackBishops int
	for sq := A1; sq <= H8; sq++ {
		p := pos.board[sq]
		if p.IsEmpty() || p.Type == King {
			continue
		}
		switch p.Type {
		case Pawn, Rook, Queen:
			return false
		case Knight:
			knights++
		case Bishop:
			if p.Color == White {
				whiteBishops++
			} else {
				blackBishops++
			}
		}
	}
	bishops := whiteBishops + blackBishops
	if knights == 0 && bishops == 0 {
		return true
	}
	if knights == 1 && bishops == 0 {
		return true
	}
	if knights == 0 && bishops == 1 {
		return true
	}
	if knights == 0 && whiteBishops == 1 && blackBishops == 1 {
		// same color bishops only draw
		wSq, bSq := NoSquare, NoSquare
		for sq := A1; sq <= H8; sq++ {
			p := pos.board[sq]
			if p.Type != Bishop {
				continue
			}
			if p.Color == White {
				wSq = sq
			} else {
				bSq = sq
			}
		}
		return squareColor(wSq) == squareColor(bSq)
	}
	return false
}

func squareColor(sq Square) int {
	return (fileOf(sq) + rankOf(sq)) % 2
}

// Perft counts legal move tree nodes at a given depth (divide perft).
func Perft(pos Position, depth int) int64 {
	if depth == 0 {
		return 1
	}
	moves := pos.legalMoves()
	var nodes int64
	for _, m := range moves {
		cp := pos.clone()
		cp.makeMove(m)
		nodes += Perft(cp, depth-1)
	}
	return nodes
}
