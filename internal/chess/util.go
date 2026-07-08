package chess

func onBoard(sq int) bool {
	return sq >= 0 && sq <= 63
}

func fileOf(sq Square) int { return int(sq) % 8 }
func rankOf(sq Square) int { return int(sq) / 8 }

func abs(n int) int {
	if n < 0 {
		return -n
	}
	return n
}
