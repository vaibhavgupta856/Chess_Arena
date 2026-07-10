package chess

import "fmt"

// CoachHint describes a suggested move with explanation.
type CoachHint struct {
	UCI         string `json:"uci"`
	SAN         string `json:"san"`
	Explanation string `json:"explanation"`
}

// CoachAnalysis reviews a position or last move.
type CoachAnalysis struct {
	Label       string `json:"label"` // excellent, good, inaccuracy, blunder
	Explanation string `json:"explanation"`
	BestUCI     string `json:"bestUci,omitempty"`
	BestSAN     string `json:"bestSan,omitempty"`
}

// HintForPosition returns the best move and a plain-language explanation.
func HintForPosition(g *Game) (CoachHint, bool) {
	move, _, ok := BestMove(g, 3)
	if !ok {
		return CoachHint{}, false
	}
	san, _ := g.SANMove(move)
	return CoachHint{
		UCI:         move.UCI(),
		SAN:         san,
		Explanation: explainMove(g, move),
	}, true
}

// AnalyzeLastMove compares the played move to the engine best move.
func AnalyzeLastMove(g *Game) (CoachAnalysis, bool) {
	hist := g.MoveHistory()
	if len(hist) == 0 {
		return CoachAnalysis{}, false
	}
	last := hist[len(hist)-1]

	// Rewind one ply to evaluate alternatives
	if g.Ply() < 1 {
		return CoachAnalysis{Label: "good", Explanation: "Opening move played."}, true
	}
	prevFEN, err := g.FENAt(g.Ply() - 1)
	if err != nil {
		return CoachAnalysis{}, false
	}
	prev, err := NewGameFromFEN(prevFEN)
	if err != nil {
		return CoachAnalysis{}, false
	}

	best, _, ok := BestMove(prev, 3)
	if !ok {
		return CoachAnalysis{Label: "good", Explanation: "Move completed."}, true
	}
	bestScore := ScoreMove(prev, best, 3)

	// Find the played move on previous position
	var played Move
	for _, m := range prev.LegalMoves() {
		if m.UCI() == last.UCI {
			played = m
			break
		}
	}
	if played.From == 0 {
		return CoachAnalysis{Label: "good", Explanation: "Could not re-analyze that move."}, true
	}
	playedScore := ScoreMove(prev, played, 3)
	diff := bestScore - playedScore

	bestSAN, _ := prev.SANMove(best)
	analysis := CoachAnalysis{BestUCI: best.UCI(), BestSAN: bestSAN}

	switch {
	case played.UCI() == best.UCI():
		analysis.Label = "excellent"
		analysis.Explanation = "That matches the engine's top choice. Well played!"
	case diff <= 30:
		analysis.Label = "good"
		analysis.Explanation = fmt.Sprintf("Solid move. The engine slightly prefers %s.", bestSAN)
	case diff <= 120:
		analysis.Label = "inaccuracy"
		analysis.Explanation = fmt.Sprintf("Inaccuracy — %s was stronger here.", bestSAN)
	default:
		analysis.Label = "blunder"
		analysis.Explanation = fmt.Sprintf("That loses material or advantage. %s was much better.", bestSAN)
	}
	return analysis, true
}

// ThreatSummary describes immediate dangers for the side to move.
func ThreatSummary(g *Game) string {
	if g.InCheck() {
		return "Your king is in check! Get out of check before anything else."
	}
	moves := g.LegalMoves()
	if len(moves) == 0 {
		return "No legal moves — the game may be over."
	}
	_, score, ok := BestMove(g, 2)
	if !ok {
		return "Study the center and develop knights and bishops toward the center."
	}
	if score > 200 {
		return "You have a strong attacking chance — look for captures and checks."
	}
	if score < -200 {
		return "Your position is under pressure. Defend hanging pieces and improve king safety."
	}
	return "Develop pieces, control the center, and connect your rooks."
}

func explainMove(g *Game, m Move) string {
	san, _ := g.SANMove(m)
	cp := g.current().clone()
	cp.makeMove(m)
	if cp.inCheck(cp.turn.Opposite()) {
		return fmt.Sprintf("%s puts the opponent in check.", san)
	}
	target := g.current().board[m.To]
	if !target.IsEmpty() {
		return fmt.Sprintf("%s captures the %s.", san, target.Type.String())
	}
	if m.Promotion != NoPieceType {
		return fmt.Sprintf("%s promotes — often the right choice.", san)
	}
	return fmt.Sprintf("%s improves your position.", san)
}
