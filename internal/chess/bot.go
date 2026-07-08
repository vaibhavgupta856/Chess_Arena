package chess

import "math/rand"

var pieceValues = map[PieceType]int{
	Pawn: 100, Knight: 320, Bishop: 330, Rook: 500, Queen: 900, King: 20000,
}

// ChooseBotMove picks a reasonable move for the side to move using shallow search.
func ChooseBotMove(g *Game) (Move, bool) {
	moves := g.LegalMoves()
	if len(moves) == 0 {
		return Move{}, false
	}
	if len(moves) == 1 {
		return moves[0], true
	}

	bestScore := -1_000_000_000
	best := make([]Move, 0, 4)
	turn := g.Turn()

	for _, m := range moves {
		next := g.current().clone()
		next.makeMove(m)
		score := -negamax(next, 2, -1_000_000_000, 1_000_000_000)
		if score > bestScore {
			bestScore = score
			best = best[:0]
			best = append(best, m)
		} else if score == bestScore {
			best = append(best, m)
		}
	}
	_ = turn
	return best[rand.Intn(len(best))], true
}

func negamax(pos Position, depth int, alpha, beta int) int {
	if depth == 0 {
		return evaluate(pos)
	}
	moves := pos.legalMoves()
	if len(moves) == 0 {
		if pos.inCheck(pos.turn) {
			if pos.turn == White {
				return -100000
			}
			return 100000
		}
		return 0
	}
	maxScore := -1_000_000_000
	for _, m := range moves {
		cp := pos.clone()
		cp.makeMove(m)
		score := -negamax(cp, depth-1, -beta, -alpha)
		if score > maxScore {
			maxScore = score
		}
		if score > alpha {
			alpha = score
		}
		if alpha >= beta {
			break
		}
	}
	return maxScore
}

func evaluate(pos Position) int {
	score := 0
	for sq := A1; sq <= H8; sq++ {
		p := pos.board[sq]
		if p.IsEmpty() {
			continue
		}
		v := pieceValues[p.Type]
		if p.Color == White {
			score += v
		} else {
			score -= v
		}
	}
	if pos.turn == White {
		return score
	}
	return -score
}
