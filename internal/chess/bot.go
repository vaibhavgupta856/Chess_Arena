package chess

import (
	"math/rand"
	"sort"
)

var pieceValues = map[PieceType]int{
	Pawn: 100, Knight: 320, Bishop: 330, Rook: 500, Queen: 900, King: 20000,
}

// pieceSquare bonus tables (from white's perspective; flip for black)
var pstPawn = [64]int{
	0, 0, 0, 0, 0, 0, 0, 0,
	50, 50, 50, 50, 50, 50, 50, 50,
	10, 10, 20, 30, 30, 20, 10, 10,
	5, 5, 10, 25, 25, 10, 5, 5,
	0, 0, 0, 20, 20, 0, 0, 0,
	5, -5, -10, 0, 0, -10, -5, 5,
	5, 10, 10, -20, -20, 10, 10, 5,
	0, 0, 0, 0, 0, 0, 0, 0,
}

var pstKnight = [64]int{
	-50, -40, -30, -30, -30, -30, -40, -50,
	-40, -20, 0, 0, 0, 0, -20, -40,
	-30, 0, 10, 15, 15, 10, 0, -30,
	-30, 5, 15, 20, 20, 15, 5, -30,
	-30, 0, 15, 20, 20, 15, 0, -30,
	-30, 5, 10, 15, 15, 10, 5, -30,
	-40, -20, 0, 5, 5, 0, -20, -40,
	-50, -40, -30, -30, -30, -30, -40, -50,
}

// ChooseBotMove picks a move for the side to move at the given strength level.
func ChooseBotMove(g *Game, level BotLevel) (Move, bool) {
	return chooseMove(g.current(), level, g.Turn())
}

// BestMove returns the engine's top move (for coach hints).
func BestMove(g *Game, depth int) (Move, int, bool) {
	if depth < 1 {
		depth = 3
	}
	moves := g.LegalMoves()
	if len(moves) == 0 {
		return Move{}, 0, false
	}
	cfg := BotStrong.config()
	cfg.depth = depth
	cfg.blunderChance = 0
	cfg.randomTies = false
	cfg.usePST = true
	return pickBest(g.current(), moves, cfg, g.Turn())
}

func chooseMove(pos Position, level BotLevel, turn Color) (Move, bool) {
	moves := pos.legalMoves()
	if len(moves) == 0 {
		return Move{}, false
	}
	if len(moves) == 1 {
		return moves[0], true
	}
	cfg := level.config()
	move, _, ok := pickBest(pos, moves, cfg, turn)
	return move, ok
}

func pickBest(pos Position, moves []Move, cfg botConfig, turn Color) (Move, int, bool) {
	type scored struct {
		move  Move
		score int
	}
	scoredMoves := make([]scored, 0, len(moves))
	for _, m := range moves {
		cp := pos.clone()
		cp.makeMove(m)
		score := -negamax(cp, cfg.depth-1, -1_000_000_000, 1_000_000_000, cfg.usePST)
		scoredMoves = append(scoredMoves, scored{move: m, score: score})
	}
	sort.Slice(scoredMoves, func(i, j int) bool {
		return scoredMoves[i].score > scoredMoves[j].score
	})

	if cfg.blunderChance > 0 && rand.Float64() < cfg.blunderChance && len(scoredMoves) >= 3 {
		worst := scoredMoves[len(scoredMoves)-3:]
		return worst[rand.Intn(len(worst))].move, worst[0].score, true
	}

	bestScore := scoredMoves[0].score
	best := []Move{scoredMoves[0].move}
	for i := 1; i < len(scoredMoves); i++ {
		if scoredMoves[i].score == bestScore {
			best = append(best, scoredMoves[i].move)
		} else {
			break
		}
	}
	if cfg.randomTies && len(best) > 1 {
		return best[rand.Intn(len(best))], bestScore, true
	}
	return best[0], bestScore, true
}

func negamax(pos Position, depth int, alpha, beta int, usePST bool) int {
	if depth == 0 {
		return evaluate(pos, usePST)
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
		score := -negamax(cp, depth-1, -beta, -alpha, usePST)
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

func evaluate(pos Position, usePST bool) int {
	score := 0
	for sq := A1; sq <= H8; sq++ {
		p := pos.board[sq]
		if p.IsEmpty() {
			continue
		}
		v := pieceValues[p.Type]
		if usePST {
			v += pstValue(p, sq)
		}
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

func pstValue(p Piece, sq Square) int {
	idx := int(sq)
	if p.Color == Black {
		idx = 63 - idx
	}
	switch p.Type {
	case Pawn:
		return pstPawn[idx]
	case Knight:
		return pstKnight[idx]
	default:
		return 0
	}
}

// ScoreMove evaluates a single move from the current position.
func ScoreMove(g *Game, m Move, depth int) int {
	pos := g.current().clone()
	pos.makeMove(m)
	return -negamax(pos, depth-1, -1_000_000_000, 1_000_000_000, true)
}
