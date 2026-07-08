package chess

var (
	knightOffsets = [8]int{-17, -15, -10, -6, 6, 10, 15, 17}
	kingOffsets   = [8]int{-9, -8, -7, -1, 1, 7, 8, 9}
	bishopOffsets = [4]int{-9, -7, 7, 9}
	rookOffsets   = [4]int{-8, -1, 1, 8}
)

func (pos Position) squareAttacked(sq Square, by Color) bool {
	if !sq.Valid() {
		return false
	}
	if by == White {
		for _, delta := range []int{-9, -7} {
			t := int(sq) + delta
			if !onBoard(t) || abs(fileOf(sq)-fileOf(Square(t))) != 1 {
				continue
			}
			p := pos.board[Square(t)]
			if p.Type == Pawn && p.Color == White && rankOf(Square(t)) == rankOf(sq)-1 {
				return true
			}
		}
	} else {
		for _, delta := range []int{7, 9} {
			t := int(sq) + delta
			if !onBoard(t) || abs(fileOf(sq)-fileOf(Square(t))) != 1 {
				continue
			}
			p := pos.board[Square(t)]
			if p.Type == Pawn && p.Color == Black && rankOf(Square(t)) == rankOf(sq)+1 {
				return true
			}
		}
	}
	// Knights
	for _, d := range knightOffsets {
		t := int(sq) + d
		if !onBoard(t) {
			continue
		}
		if abs(fileOf(sq)-fileOf(Square(t))) > 2 || abs(rankOf(sq)-rankOf(Square(t))) > 2 {
			continue
		}
		p := pos.board[Square(t)]
		if p.Type == Knight && p.Color == by {
			return true
		}
	}
	// King
	for _, d := range kingOffsets {
		t := int(sq) + d
		if !onBoard(t) {
			continue
		}
		if abs(fileOf(sq)-fileOf(Square(t))) > 1 || abs(rankOf(sq)-rankOf(Square(t))) > 1 {
			continue
		}
		p := pos.board[Square(t)]
		if p.Type == King && p.Color == by {
			return true
		}
	}
	if pos.slidingAttacked(sq, by, bishopOffsets[:], Bishop) {
		return true
	}
	if pos.slidingAttacked(sq, by, rookOffsets[:], Rook) {
		return true
	}
	if pos.slidingAttacked(sq, by, append(bishopOffsets[:], rookOffsets[:]...), Queen) {
		return true
	}
	return false
}

func (pos Position) slidingAttacked(target Square, by Color, dirs []int, want PieceType) bool {
	for _, d := range dirs {
		cur := int(target) + d
		for onBoard(cur) {
			if crossedFile(cur-d, cur, d) {
				break
			}
			p := pos.board[Square(cur)]
			if !p.IsEmpty() {
				if p.Color == by && (p.Type == want || p.Type == Queen) {
					return true
				}
				break
			}
			cur += d
		}
	}
	return false
}

func crossedFile(from, to, delta int) bool {
	if delta == 8 || delta == -8 {
		return false
	}
	return abs(fileOf(Square(from))-fileOf(Square(to))) > 1
}

func (pos Position) inCheck(c Color) bool {
	ks := pos.kingSquare(c)
	if !ks.Valid() {
		return false
	}
	return pos.squareAttacked(ks, c.Opposite())
}
