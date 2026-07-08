package chess

import "errors"

var errInvalidFEN = errors.New("chess: invalid FEN")

// Position is a pure chess position without game outcome metadata.
type Position struct {
	board    [64]Piece
	turn     Color
	castling CastleRights
	epSquare Square
	halfMove int
	fullMove int
}

func startingPosition() Position {
	return Position{
		board:    startingBoard,
		turn:     White,
		castling: WhiteKingSide | WhiteQueenSide | BlackKingSide | BlackQueenSide,
		epSquare: NoSquare,
		halfMove: 0,
		fullMove: 1,
	}
}

func (pos Position) pieceAt(sq Square) Piece {
	if !sq.Valid() {
		return Piece{}
	}
	return pos.board[sq]
}

func (pos Position) kingSquare(c Color) Square {
	for sq := A1; sq <= H8; sq++ {
		p := pos.board[sq]
		if p.Type == King && p.Color == c {
			return sq
		}
	}
	return NoSquare
}

// repetitionKey identifies a position for three/fivefold repetition (FIDE: board, turn, rights, ep).
func (pos Position) repetitionKey() uint64 {
	return pos.hash()
}

func (pos Position) hash() uint64 {
	var h uint64
	for sq := A1; sq <= H8; sq++ {
		p := pos.board[sq]
		h = h*37 + uint64(sq)*13 + uint64(p.Type)*3 + uint64(p.Color)
	}
	h = h*5 + uint64(pos.turn)
	h = h*5 + uint64(pos.castling)
	if pos.epSquare.Valid() {
		h = h*5 + uint64(pos.epSquare)
	}
	return h
}

func (pos Position) clone() Position {
	return pos
}
