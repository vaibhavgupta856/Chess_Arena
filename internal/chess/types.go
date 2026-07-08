package chess

import "fmt"

// Color represents the side to move or piece color.
type Color int8

const (
	NoColor Color = iota
	White
	Black
)

func (c Color) String() string {
	switch c {
	case White:
		return "white"
	case Black:
		return "black"
	default:
		return "none"
	}
}

func (c Color) Opposite() Color {
	switch c {
	case White:
		return Black
	case Black:
		return White
	default:
		return NoColor
	}
}

// PieceType identifies a chess piece kind without color.
type PieceType int8

const (
	NoPieceType PieceType = iota
	King
	Queen
	Rook
	Bishop
	Knight
	Pawn
)

func (pt PieceType) String() string {
	switch pt {
	case King:
		return "king"
	case Queen:
		return "queen"
	case Rook:
		return "rook"
	case Bishop:
		return "bishop"
	case Knight:
		return "knight"
	case Pawn:
		return "pawn"
	default:
		return "none"
	}
}

// Piece is a colored chess piece.
type Piece struct {
	Type  PieceType
	Color Color
}

func (p Piece) IsEmpty() bool {
	return p.Type == NoPieceType || p.Color == NoColor
}

func (p Piece) String() string {
	if p.IsEmpty() {
		return "."
	}
	symbol := string(pieceFENChar(p))
	if p.Color == White {
		return symbol
	}
	return symbol
}

func pieceFENChar(p Piece) byte {
	switch p.Type {
	case King:
		return 'k'
	case Queen:
		return 'q'
	case Rook:
		return 'r'
	case Bishop:
		return 'b'
	case Knight:
		return 'n'
	case Pawn:
		return 'p'
	default:
		return '.'
	}
}

// Square is a board square from A1 (0) through H8 (63).
type Square int8

const (
	A1 Square = iota
	B1
	C1
	D1
	E1
	F1
	G1
	H1
	A2
	B2
	C2
	D2
	E2
	F2
	G2
	H2
	A3
	B3
	C3
	D3
	E3
	F3
	G3
	H3
	A4
	B4
	C4
	D4
	E4
	F4
	G4
	H4
	A5
	B5
	C5
	D5
	E5
	F5
	G5
	H5
	A6
	B6
	C6
	D6
	E6
	F6
	G6
	H6
	A7
	B7
	C7
	D7
	E7
	F7
	G7
	H7
	A8
	B8
	C8
	D8
	E8
	F8
	G8
	H8
)

const NoSquare Square = -1

func (sq Square) Valid() bool {
	return sq >= A1 && sq <= H8
}

func (sq Square) File() int {
	if !sq.Valid() {
		return -1
	}
	return int(sq) % 8
}

func (sq Square) Rank() int {
	if !sq.Valid() {
		return -1
	}
	return int(sq) / 8
}

func (sq Square) String() string {
	if !sq.Valid() {
		return "??"
	}
	return fmt.Sprintf("%c%d", 'a'+sq.File(), sq.Rank()+1)
}

// ParseSquare parses algebraic square notation such as "e4".
func ParseSquare(s string) (Square, error) {
	if len(s) != 2 {
		return NoSquare, fmt.Errorf("chess: invalid square %q", s)
	}
	file := int(s[0] - 'a')
	rank := int(s[1] - '1')
	if file < 0 || file > 7 || rank < 0 || rank > 7 {
		return NoSquare, fmt.Errorf("chess: invalid square %q", s)
	}
	return Square(rank*8 + file), nil
}

// Move represents a chess move from one square to another.
type Move struct {
	From       Square
	To         Square
	Promotion  PieceType
	Castle     CastleType
	EnPassant  bool
	Capture    bool
	GivesCheck bool
}

type CastleType int8

const (
	NotCastle CastleType = iota
	KingsideCastle
	QueensideCastle
)

func (m Move) UCI() string {
	s := m.From.String() + m.To.String()
	if m.Promotion != NoPieceType {
		s += promotionChar(m.Promotion)
	}
	return s
}

func promotionChar(pt PieceType) string {
	switch pt {
	case Queen:
		return "q"
	case Rook:
		return "r"
	case Bishop:
		return "b"
	case Knight:
		return "n"
	default:
		return ""
	}
}

// Outcome is the result of a game.
type Outcome int8

const (
	Ongoing Outcome = iota
	WhiteWins
	BlackWins
	Draw
)

func (o Outcome) String() string {
	switch o {
	case WhiteWins:
		return "1-0"
	case BlackWins:
		return "0-1"
	case Draw:
		return "1/2-1/2"
	default:
		return "*"
	}
}

// Termination describes how a game ended.
type Termination int8

const (
	NoTermination Termination = iota
	Checkmate
	Stalemate
	Resignation
	DrawOffer
	ThreefoldRepetition
	FivefoldRepetition
	FiftyMoveRule
	SeventyFiveMoveRule
	InsufficientMaterial
)

func (t Termination) String() string {
	switch t {
	case Checkmate:
		return "checkmate"
	case Stalemate:
		return "stalemate"
	case Resignation:
		return "resignation"
	case DrawOffer:
		return "draw_offer"
	case ThreefoldRepetition:
		return "threefold_repetition"
	case FivefoldRepetition:
		return "fivefold_repetition"
	case FiftyMoveRule:
		return "fifty_move_rule"
	case SeventyFiveMoveRule:
		return "seventy_five_move_rule"
	case InsufficientMaterial:
		return "insufficient_material"
	default:
		return "none"
	}
}

// DrawClaim is a draw that a player may claim during the game.
type DrawClaim int8

const (
	DrawOfferClaim DrawClaim = iota
	ThreefoldRepetitionClaim
	FiftyMoveRuleClaim
)

func (d DrawClaim) String() string {
	switch d {
	case DrawOfferClaim:
		return "draw_offer"
	case ThreefoldRepetitionClaim:
		return "threefold_repetition"
	case FiftyMoveRuleClaim:
		return "fifty_move_rule"
	default:
		return "unknown"
	}
}

// MoveRecord stores a played move with notation.
type MoveRecord struct {
	Move Move
	SAN  string
	UCI  string
}
