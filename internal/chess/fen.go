package chess

import (
	"fmt"
	"strconv"
	"strings"
)

func (pos Position) fen() string {
	var b strings.Builder
	empty := 0
	for rank := 7; rank >= 0; rank-- {
		for file := 0; file < 8; file++ {
			sq := Square(rank*8 + file)
			p := pos.board[sq]
			if p.IsEmpty() {
				empty++
				continue
			}
			if empty > 0 {
				b.WriteByte(byte('0' + empty))
				empty = 0
			}
			ch := pieceFENChar(p)
			if p.Color == White {
				ch = byte(strings.ToUpper(string(ch))[0])
			}
			b.WriteByte(ch)
		}
		if empty > 0 {
			b.WriteByte(byte('0' + empty))
			empty = 0
		}
		if rank > 0 {
			b.WriteByte('/')
		}
	}
	ep := "-"
	if pos.epSquare.Valid() {
		ep = pos.epSquare.String()
	}
	return fmt.Sprintf("%s %s %s %s %d %d",
		b.String(),
		colorFEN(pos.turn),
		pos.castling.String(),
		ep,
		pos.halfMove,
		pos.fullMove,
	)
}

func colorFEN(c Color) string {
	if c == Black {
		return "b"
	}
	return "w"
}

func parseFEN(fen string) (Position, error) {
	parts := strings.Fields(strings.TrimSpace(fen))
	if len(parts) != 6 {
		return Position{}, errInvalidFEN
	}
	var pos Position
	rank := 7
	file := 0
	for _, ch := range parts[0] {
		if ch == '/' {
			rank--
			file = 0
			if rank < 0 {
				return Position{}, errInvalidFEN
			}
			continue
		}
		if ch >= '1' && ch <= '8' {
			file += int(ch - '0')
			if file > 8 {
				return Position{}, errInvalidFEN
			}
			continue
		}
		if file >= 8 || rank < 0 {
			return Position{}, errInvalidFEN
		}
		p, err := pieceFromFENChar(ch)
		if err != nil {
			return Position{}, err
		}
		pos.board[Square(rank*8+file)] = p
		file++
	}
	if rank != 0 || file != 8 {
		return Position{}, errInvalidFEN
	}
	switch parts[1] {
	case "w":
		pos.turn = White
	case "b":
		pos.turn = Black
	default:
		return Position{}, errInvalidFEN
	}
	cr, err := parseCastleRights(parts[2])
	if err != nil {
		return Position{}, err
	}
	pos.castling = cr
	if parts[3] == "-" {
		pos.epSquare = NoSquare
	} else {
		sq, err := ParseSquare(parts[3])
		if err != nil {
			return Position{}, errInvalidFEN
		}
		pos.epSquare = sq
	}
	half, err := strconv.Atoi(parts[4])
	if err != nil {
		return Position{}, errInvalidFEN
	}
	pos.halfMove = half
	full, err := strconv.Atoi(parts[5])
	if err != nil {
		return Position{}, errInvalidFEN
	}
	pos.fullMove = full
	return pos, nil
}

func pieceFromFENChar(ch rune) (Piece, error) {
	upper := strings.ToUpper(string(ch))
	color := Black
	if ch >= 'A' && ch <= 'Z' {
		color = White
	}
	var pt PieceType
	switch upper {
	case "P":
		pt = Pawn
	case "N":
		pt = Knight
	case "B":
		pt = Bishop
	case "R":
		pt = Rook
	case "Q":
		pt = Queen
	case "K":
		pt = King
	default:
		return Piece{}, errInvalidFEN
	}
	return Piece{Type: pt, Color: color}, nil
}
