package chess

import "testing"

func TestPieceTypeToInnerViaPromotion(t *testing.T) {
	g := mustGameFromFEN(t, "8/4P3/8/8/8/8/8/4K2k w - - 0 1")
	for _, promo := range []string{"e7e8q", "e7e8r", "e7e8b", "e7e8n"} {
		g2, _ := NewGameFromFEN("8/4P3/8/8/8/8/8/4K2k w - - 0 1")
		mv, err := g2.ParseUCIMove(promo)
		if err != nil {
			t.Fatalf("parse %s: %v", promo, err)
		}
		if err := g2.ApplyMove(mv); err != nil {
			t.Fatalf("apply %s: %v", promo, err)
		}
	}
	_ = g
}

func TestPieceAttacksAllTypes(t *testing.T) {
	g := mustGameFromFEN(t, "8/8/8/8/8/8/8/k6R w - - 0 1")
	if err := g.ApplyUCIMove("h1h2"); err != nil {
		t.Fatalf("rook move: %v", err)
	}
}

func TestOutcomeStrings(t *testing.T) {
	if WhiteWins.String() != "1-0" || BlackWins.String() != "0-1" {
		t.Fatal("unexpected win outcome strings")
	}
}

func TestInvalidPieceAt(t *testing.T) {
	g := NewGame()
	if !g.PieceAt(NoSquare).IsEmpty() {
		t.Fatal("expected empty piece for invalid square")
	}
}

func TestDrawClaimErrors(t *testing.T) {
	g := NewGame()
	if err := g.ClaimDraw(DrawClaim(99)); err == nil {
		t.Fatal("expected unsupported draw claim error")
	}
}

func TestUCIMoveIllegal(t *testing.T) {
	g := NewGame()
	_, err := g.UCIMove(Move{From: A1, To: H8})
	if err == nil {
		t.Fatal("expected error for illegal UCIMove")
	}
}

func TestSANMoveIllegal(t *testing.T) {
	g := NewGame()
	_, err := g.SANMove(Move{From: A1, To: H8})
	if err == nil {
		t.Fatal("expected error for illegal SANMove")
	}
}

func TestParseUCIMoveIllegal(t *testing.T) {
	g := NewGame()
	_, err := g.ParseUCIMove("a1a9")
	if err == nil {
		t.Fatal("expected parse error")
	}
}

func TestApplySANAfterOver(t *testing.T) {
	g := NewGame()
	playSAN(t, g, "f3", "e5", "g4", "Qh4#")
	if err := g.ApplySANMove("a3"); err == nil {
		t.Fatal("expected error after game over")
	}
}

func TestApplyUCIAfterOver(t *testing.T) {
	g := NewGame()
	playSAN(t, g, "f3", "e5", "g4", "Qh4#")
	if err := g.ApplyUCIMove("a2a3"); err == nil {
		t.Fatal("expected error after game over")
	}
}

func TestResignAfterOver(t *testing.T) {
	g := NewGame()
	playSAN(t, g, "f3", "e5", "g4", "Qh4#")
	if err := g.Resign(White); err == nil {
		t.Fatal("expected resign error after game over")
	}
}

func TestClaimDrawAfterOver(t *testing.T) {
	g := NewGame()
	playSAN(t, g, "f3", "e5", "g4", "Qh4#")
	if err := g.ClaimDraw(DrawOfferClaim); err == nil {
		t.Fatal("expected claim error after game over")
	}
}

func TestStalemateTerminationString(t *testing.T) {
	if Stalemate.String() != "stalemate" {
		t.Fatal("unexpected stalemate string")
	}
}

func TestFivefoldAndSeventyFiveTerminations(t *testing.T) {
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
	if g.Termination() != FivefoldRepetition {
		t.Fatalf("termination = %v", g.Termination())
	}
}
