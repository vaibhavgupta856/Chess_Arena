package chess

import (
	"slices"
	"testing"
)

func TestStalemate(t *testing.T) {
	g := mustGameFromFEN(t, "k7/8/1K6/8/8/8/7Q/8 b - - 0 1")
	if len(g.LegalMoves()) != 0 {
		t.Fatalf("black should have no legal moves in stalemate, got %d", len(g.LegalMoves()))
	}
	assertOutcome(t, g, Draw, Stalemate)
}

func TestInsufficientMaterialKVSK(t *testing.T) {
	g := mustGameFromFEN(t, "8/8/8/8/8/8/8/Kk6 w - - 0 1")
	assertOutcome(t, g, Draw, InsufficientMaterial)
}

func TestInsufficientMaterialKBvsK(t *testing.T) {
	g := mustGameFromFEN(t, "8/8/8/8/8/8/B7/Kk6 w - - 0 1")
	assertOutcome(t, g, Draw, InsufficientMaterial)
}

func TestInsufficientMaterialKNvsK(t *testing.T) {
	g := mustGameFromFEN(t, "8/8/8/8/8/8/N7/Kk6 w - - 0 1")
	assertOutcome(t, g, Draw, InsufficientMaterial)
}

func TestSameColorBishopsNotAutoDraw(t *testing.T) {
	g := mustGameFromFEN(t, "8/5b2/8/8/3B4/8/8/Kk6 w - - 0 1")
	if g.IsOver() {
		t.Fatal("K+B vs K+B should not trigger automatic insufficient-material draw")
	}
}

func TestSufficientMaterialKBvsKN(t *testing.T) {
	g := mustGameFromFEN(t, "8/8/8/8/8/N7/b7/Kk6 w - - 0 1")
	if g.IsOver() {
		t.Fatal("K+B vs K+N should not be an automatic draw")
	}
}

func TestThreefoldRepetitionClaim(t *testing.T) {
	g := NewGame()
	playSAN(t, g, "Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8")
	assertClaimable(t, g, ThreefoldRepetitionClaim)
	if err := g.ClaimDraw(ThreefoldRepetitionClaim); err != nil {
		t.Fatalf("ClaimDraw: %v", err)
	}
	assertOutcome(t, g, Draw, ThreefoldRepetition)
}

func TestThreefoldNotClaimableBeforeThreeRepeats(t *testing.T) {
	g := NewGame()
	playSAN(t, g, "Nf3", "Nf6", "Ng1", "Ng8", "Nf3")
	claims := g.ClaimableDraws()
	if slices.Contains(claims, ThreefoldRepetitionClaim) {
		t.Fatal("threefold should not be claimable before third repetition")
	}
}

func TestFiftyMoveRuleClaim(t *testing.T) {
	g := mustGameFromFEN(t, "2k5/1q1nbppp/r3p3/3pP3/3P4/2N1B3/PP3PPP/R1BQ1RK1 w - - 100 17")
	assertClaimable(t, g, FiftyMoveRuleClaim)
	if err := g.ClaimDraw(FiftyMoveRuleClaim); err != nil {
		t.Fatalf("ClaimDraw: %v", err)
	}
	assertOutcome(t, g, Draw, FiftyMoveRule)
}

func TestFivefoldRepetitionAutoDraw(t *testing.T) {
	g := NewGame()
	moves := []string{
		"Nf3", "Nf6", "Ng1", "Ng8",
		"Nf3", "Nf6", "Ng1", "Ng8",
		"Nf3", "Nf6", "Ng1", "Ng8",
		"Nf3", "Nf6", "Ng1", "Ng8",
		"Nf3", "Nf6",
	}
	for _, m := range moves {
		if g.IsOver() {
			break
		}
		playSAN(t, g, m)
	}
	assertOutcome(t, g, Draw, FivefoldRepetition)
}

func TestResign(t *testing.T) {
	g := NewGame()
	if err := g.Resign(White); err != nil {
		t.Fatalf("Resign: %v", err)
	}
	assertOutcome(t, g, BlackWins, Resignation)
}
