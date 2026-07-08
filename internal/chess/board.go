package chess

// startingBoard is the standard chess start position (A1=0).
var startingBoard = [64]Piece{
	{Rook, White}, {Knight, White}, {Bishop, White}, {Queen, White}, {King, White}, {Bishop, White}, {Knight, White}, {Rook, White},
	{Pawn, White}, {Pawn, White}, {Pawn, White}, {Pawn, White}, {Pawn, White}, {Pawn, White}, {Pawn, White}, {Pawn, White},
	{}, {}, {}, {}, {}, {}, {}, {},
	{}, {}, {}, {}, {}, {}, {}, {},
	{}, {}, {}, {}, {}, {}, {}, {},
	{}, {}, {}, {}, {}, {}, {}, {},
	{Pawn, Black}, {Pawn, Black}, {Pawn, Black}, {Pawn, Black}, {Pawn, Black}, {Pawn, Black}, {Pawn, Black}, {Pawn, Black},
	{Rook, Black}, {Knight, Black}, {Bishop, Black}, {Queen, Black}, {King, Black}, {Bishop, Black}, {Knight, Black}, {Rook, Black},
}

// CastleRights tracks castling availability (KQkq).
type CastleRights uint8

const (
	WhiteKingSide  CastleRights = 1 << iota
	WhiteQueenSide
	BlackKingSide
	BlackQueenSide
)

func (cr CastleRights) Has(c Color, kingside bool) bool {
	switch {
	case c == White && kingside:
		return cr&WhiteKingSide != 0
	case c == White && !kingside:
		return cr&WhiteQueenSide != 0
	case c == Black && kingside:
		return cr&BlackKingSide != 0
	case c == Black && !kingside:
		return cr&BlackQueenSide != 0
	default:
		return false
	}
}

func (cr CastleRights) Without(c Color, kingside bool) CastleRights {
	switch {
	case c == White && kingside:
		return cr &^ WhiteKingSide
	case c == White && !kingside:
		return cr &^ WhiteQueenSide
	case c == Black && kingside:
		return cr &^ BlackKingSide
	case c == Black && !kingside:
		return cr &^ BlackQueenSide
	default:
		return cr
	}
}

func (cr CastleRights) String() string {
	if cr == 0 {
		return "-"
	}
	s := ""
	if cr&WhiteKingSide != 0 {
		s += "K"
	}
	if cr&WhiteQueenSide != 0 {
		s += "Q"
	}
	if cr&BlackKingSide != 0 {
		s += "k"
	}
	if cr&BlackQueenSide != 0 {
		s += "q"
	}
	return s
}

func parseCastleRights(s string) (CastleRights, error) {
	if s == "-" {
		return 0, nil
	}
	var cr CastleRights
	for _, ch := range s {
		switch ch {
		case 'K':
			cr |= WhiteKingSide
		case 'Q':
			cr |= WhiteQueenSide
		case 'k':
			cr |= BlackKingSide
		case 'q':
			cr |= BlackQueenSide
		default:
			return 0, errInvalidFEN
		}
	}
	return cr, nil
}

func (p Piece) sameColor(other Piece) bool {
	return !p.IsEmpty() && !other.IsEmpty() && p.Color == other.Color
}

func (p Piece) isEnemy(other Piece) bool {
	return !p.IsEmpty() && !other.IsEmpty() && p.Color != other.Color
}
