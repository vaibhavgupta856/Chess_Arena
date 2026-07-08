package chess

// Undo stores state needed to reverse a move.
type Undo struct {
	captured     Piece
	castling     CastleRights
	epSquare     Square
	halfMove     int
	fullMove     int
	turn         Color
	movedRook    Square
	rookFrom     Piece
	rookTo       Square
}

func (pos *Position) makeMove(m Move) Undo {
	u := Undo{
		captured: pos.board[m.To],
		castling: pos.castling,
		epSquare: pos.epSquare,
		halfMove: pos.halfMove,
		fullMove: pos.fullMove,
		turn:     pos.turn,
	}
	moving := pos.board[m.From]

	// Reset en passant; may set later.
	pos.epSquare = NoSquare
	pos.halfMove++
	if moving.Type == Pawn || !pos.board[m.To].IsEmpty() || m.EnPassant {
		pos.halfMove = 0
	}

	if m.EnPassant {
		capSq := m.To
		if pos.turn == White {
			capSq = Square(int(m.To) - 8)
		} else {
			capSq = Square(int(m.To) + 8)
		}
		u.captured = pos.board[capSq]
		pos.board[capSq] = Piece{}
	}

	if m.Castle == KingsideCastle {
		if pos.turn == White {
			u.movedRook = H1
			u.rookFrom = pos.board[H1]
			u.rookTo = F1
			pos.board[F1] = pos.board[H1]
			pos.board[H1] = Piece{}
		} else {
			u.movedRook = H8
			u.rookFrom = pos.board[H8]
			u.rookTo = F8
			pos.board[F8] = pos.board[H8]
			pos.board[H8] = Piece{}
		}
	} else if m.Castle == QueensideCastle {
		if pos.turn == White {
			u.movedRook = A1
			u.rookFrom = pos.board[A1]
			u.rookTo = D1
			pos.board[D1] = pos.board[A1]
			pos.board[A1] = Piece{}
		} else {
			u.movedRook = A8
			u.rookFrom = pos.board[A8]
			u.rookTo = D8
			pos.board[D8] = pos.board[A8]
			pos.board[A8] = Piece{}
		}
	}

	pos.board[m.To] = moving
	pos.board[m.From] = Piece{}
	if m.Promotion != NoPieceType {
		pos.board[m.To] = Piece{Type: m.Promotion, Color: moving.Color}
	}

	// Castling rights
	pos.castling = pos.updateCastlingRights(m, moving)

	// En passant target
	if moving.Type == Pawn {
		if pos.turn == White && rankOf(m.From) == 1 && rankOf(m.To) == 3 {
			pos.epSquare = Square(int(m.From) + 8)
		} else if pos.turn == Black && rankOf(m.From) == 6 && rankOf(m.To) == 4 {
			pos.epSquare = Square(int(m.From) - 8)
		}
	}

	if pos.turn == Black {
		pos.fullMove++
	}
	pos.turn = pos.turn.Opposite()
	return u
}

func (pos *Position) unmakeMove(m Move, u Undo) {
	pos.turn = u.turn
	pos.castling = u.castling
	pos.epSquare = u.epSquare
	pos.halfMove = u.halfMove
	pos.fullMove = u.fullMove

	moving := pos.board[m.To]
	if m.Promotion != NoPieceType {
		moving = Piece{Type: Pawn, Color: u.turn}
	}
	pos.board[m.From] = moving
	pos.board[m.To] = u.captured

	if m.EnPassant {
		capSq := m.To
		if u.turn == White {
			capSq = Square(int(m.To) - 8)
		} else {
			capSq = Square(int(m.To) + 8)
		}
		pos.board[capSq] = u.captured
		pos.board[m.To] = Piece{}
	}

	if m.Castle != NotCastle && u.movedRook.Valid() {
		pos.board[u.movedRook] = u.rookFrom
		pos.board[u.rookTo] = Piece{}
	}
}

func (pos Position) updateCastlingRights(m Move, moving Piece) CastleRights {
	cr := pos.castling
	if moving.Type == King {
		if moving.Color == White {
			cr &^= WhiteKingSide | WhiteQueenSide
		} else {
			cr &^= BlackKingSide | BlackQueenSide
		}
	}
	// Rook left corner or was captured
	for _, sq := range []Square{A1, H1, A8, H8} {
		if m.From == sq || m.To == sq {
			switch sq {
			case A1:
				cr &^= WhiteQueenSide
			case H1:
				cr &^= WhiteKingSide
			case A8:
				cr &^= BlackQueenSide
			case H8:
				cr &^= BlackKingSide
			}
		}
	}
	return cr
}

func (pos Position) legalMoves() []Move {
	pseudo := pos.pseudoLegalMoves()
	legal := make([]Move, 0, len(pseudo))
	for _, m := range pseudo {
		cp := pos.clone()
		cp.makeMove(m)
		if !cp.inCheck(pos.turn) {
			m.GivesCheck = cp.inCheck(cp.turn)
			legal = append(legal, m)
		}
	}
	return legal
}

func (pos Position) pseudoLegalMoves() []Move {
	var moves []Move
	c := pos.turn
	for sq := A1; sq <= H8; sq++ {
		p := pos.board[sq]
		if p.IsEmpty() || p.Color != c {
			continue
		}
		switch p.Type {
		case Pawn:
			moves = append(moves, pos.pawnMoves(sq, p)...)
		case Knight:
			moves = append(moves, pos.knightMoves(sq, p)...)
		case Bishop:
			moves = append(moves, pos.sliderMoves(sq, p, bishopOffsets[:])...)
		case Rook:
			moves = append(moves, pos.sliderMoves(sq, p, rookOffsets[:])...)
		case Queen:
			moves = append(moves, pos.sliderMoves(sq, p, append(bishopOffsets[:], rookOffsets[:]...))...)
		case King:
			moves = append(moves, pos.kingMoves(sq, p)...)
		}
	}
	moves = append(moves, pos.castleMoves()...)
	return moves
}

func (pos Position) pawnMoves(from Square, p Piece) []Move {
	var moves []Move
	dir := 8
	startRank := 1
	promoRank := 7
	if p.Color == Black {
		dir = -8
		startRank = 6
		promoRank = 0
	}
	to := Square(int(from) + dir)
	if to.Valid() && pos.board[to].IsEmpty() {
		moves = append(moves, pos.promoMoves(from, to, p.Color, rankOf(to) == promoRank)...)
		if rankOf(from) == startRank {
			to2 := Square(int(from) + 2*dir)
			if pos.board[to2].IsEmpty() {
				moves = append(moves, Move{From: from, To: to2})
			}
		}
	}
	for _, cap := range []int{dir - 1, dir + 1} {
		to = Square(int(from) + cap)
		if !to.Valid() || abs(fileOf(from)-fileOf(to)) != 1 {
			continue
		}
		if pos.board[to].isEnemy(p) {
			moves = append(moves, pos.promoMoves(from, to, p.Color, rankOf(to) == promoRank, true)...)
		} else if to == pos.epSquare {
			moves = append(moves, pos.promoMoves(from, to, p.Color, rankOf(to) == promoRank, true, true)...)
		}
	}
	return moves
}

func (pos Position) promoMoves(from, to Square, c Color, promo bool, flags ...bool) []Move {
	capture := len(flags) > 0 && flags[0]
	ep := len(flags) > 1 && flags[1]
	if !promo {
		m := Move{From: from, To: to, Capture: capture, EnPassant: ep}
		return []Move{m}
	}
	types := []PieceType{Queen, Rook, Bishop, Knight}
	out := make([]Move, 0, 4)
	for _, pt := range types {
		m := Move{From: from, To: to, Promotion: pt, Capture: capture, EnPassant: ep}
		out = append(out, m)
	}
	return out
}

func (pos Position) knightMoves(from Square, p Piece) []Move {
	return pos.leapMoves(from, p, knightOffsets[:], true)
}

func (pos Position) kingMoves(from Square, p Piece) []Move {
	return pos.leapMoves(from, p, kingOffsets[:], false)
}

func (pos Position) leapMoves(from Square, p Piece, offsets []int, knight bool) []Move {
	var moves []Move
	for _, d := range offsets {
		to := Square(int(from) + d)
		if !to.Valid() {
			continue
		}
		df := abs(fileOf(from) - fileOf(to))
		dr := abs(rankOf(from) - rankOf(to))
		if knight {
			if !((df == 1 && dr == 2) || (df == 2 && dr == 1)) {
				continue
			}
		} else if df > 1 || dr > 1 {
			continue
		}
		target := pos.board[to]
		if target.IsEmpty() {
			moves = append(moves, Move{From: from, To: to})
		} else if target.isEnemy(p) {
			moves = append(moves, Move{From: from, To: to, Capture: true})
		}
	}
	return moves
}

func (pos Position) sliderMoves(from Square, p Piece, dirs []int) []Move {
	var moves []Move
	for _, d := range dirs {
		cur := int(from) + d
		for onBoard(cur) {
			if crossedFile(cur-d, cur, d) {
				break
			}
			to := Square(cur)
			target := pos.board[to]
			if target.IsEmpty() {
				moves = append(moves, Move{From: from, To: to})
			} else {
				if target.isEnemy(p) {
					moves = append(moves, Move{From: from, To: to, Capture: true})
				}
				break
			}
			cur += d
		}
	}
	return moves
}

func (pos Position) castleMoves() []Move {
	var moves []Move
	if pos.inCheck(pos.turn) {
		return moves
	}
	if pos.turn == White {
		if pos.castling.Has(White, true) &&
			pos.board[F1].IsEmpty() && pos.board[G1].IsEmpty() &&
			!pos.squareAttacked(E1, Black) && !pos.squareAttacked(F1, Black) && !pos.squareAttacked(G1, Black) {
			moves = append(moves, Move{From: E1, To: G1, Castle: KingsideCastle})
		}
		if pos.castling.Has(White, false) &&
			pos.board[B1].IsEmpty() && pos.board[C1].IsEmpty() && pos.board[D1].IsEmpty() &&
			!pos.squareAttacked(E1, Black) && !pos.squareAttacked(C1, Black) && !pos.squareAttacked(D1, Black) {
			moves = append(moves, Move{From: E1, To: C1, Castle: QueensideCastle})
		}
	} else {
		if pos.castling.Has(Black, true) &&
			pos.board[F8].IsEmpty() && pos.board[G8].IsEmpty() &&
			!pos.squareAttacked(E8, White) && !pos.squareAttacked(F8, White) && !pos.squareAttacked(G8, White) {
			moves = append(moves, Move{From: E8, To: G8, Castle: KingsideCastle})
		}
		if pos.castling.Has(Black, false) &&
			pos.board[B8].IsEmpty() && pos.board[C8].IsEmpty() && pos.board[D8].IsEmpty() &&
			!pos.squareAttacked(E8, White) && !pos.squareAttacked(C8, White) && !pos.squareAttacked(D8, White) {
			moves = append(moves, Move{From: E8, To: C8, Castle: QueensideCastle})
		}
	}
	return moves
}

func movesMatch(a, b Move) bool {
	return a.From == b.From && a.To == b.To && a.Promotion == b.Promotion
}
