package chess

import (
	"slices"
	"strings"
	"testing"
)

func mustGameFromFEN(t *testing.T, fen string) *Game {
	t.Helper()
	g, err := NewGameFromFEN(fen)
	if err != nil {
		t.Fatalf("NewGameFromFEN(%q): %v", fen, err)
	}
	return g
}

func playSAN(t *testing.T, g *Game, moves ...string) {
	t.Helper()
	for _, m := range moves {
		if err := g.ApplySANMove(m); err != nil {
			t.Fatalf("ApplySANMove(%q): %v", m, err)
		}
	}
}

func playUCI(t *testing.T, g *Game, moves ...string) {
	t.Helper()
	for _, m := range moves {
		if err := g.ApplyUCIMove(m); err != nil {
			t.Fatalf("ApplyUCIMove(%q): %v", m, err)
		}
	}
}

func assertLegalUCI(t *testing.T, g *Game, uci string) {
	t.Helper()
	mv, err := g.ParseUCIMove(uci)
	if err != nil {
		t.Fatalf("expected legal move %q, got error: %v", uci, err)
	}
	if !g.IsLegal(mv) {
		t.Fatalf("expected legal move %q", uci)
	}
}

func assertContainsSAN(t *testing.T, g *Game, san string) {
	t.Helper()
	want := strings.TrimSuffix(strings.TrimSuffix(san, "#"), "+")
	for _, m := range g.LegalMoves() {
		encoded, err := g.SANMove(m)
		if err != nil {
			continue
		}
		encoded = strings.TrimSuffix(strings.TrimSuffix(encoded, "#"), "+")
		if encoded == want {
			return
		}
	}
	t.Fatalf("legal moves missing SAN %q", san)
}

func assertIllegalUCI(t *testing.T, g *Game, uci string) {
	t.Helper()
	if err := g.ApplyUCIMove(uci); err == nil {
		t.Fatalf("expected illegal move %q", uci)
	}
}

func assertOutcome(t *testing.T, g *Game, wantOutcome Outcome, wantTerm Termination) {
	t.Helper()
	if g.Outcome() != wantOutcome {
		t.Fatalf("outcome = %v, want %v", g.Outcome(), wantOutcome)
	}
	if g.Termination() != wantTerm {
		t.Fatalf("termination = %v, want %v", g.Termination(), wantTerm)
	}
	if !g.IsOver() {
		t.Fatalf("expected game to be over")
	}
}

func assertContainsUCI(t *testing.T, g *Game, uci string) {
	t.Helper()
	legal := g.LegalMoves()
	for _, m := range legal {
		if m.UCI() == uci {
			return
		}
	}
	ucis := make([]string, len(legal))
	for i, m := range legal {
		ucis[i] = m.UCI()
	}
	t.Fatalf("legal moves missing %q, have: %s", uci, strings.Join(ucis, ", "))
}

func assertNotContainsUCI(t *testing.T, g *Game, uci string) {
	t.Helper()
	for _, m := range g.LegalMoves() {
		if m.UCI() == uci {
			t.Fatalf("illegal move %q present in legal moves", uci)
		}
	}
}

func assertClaimable(t *testing.T, g *Game, claim DrawClaim) {
	t.Helper()
	claims := g.ClaimableDraws()
	if !slices.Contains(claims, claim) {
		t.Fatalf("claimable draws %v missing %v", claims, claim)
	}
}

func sq(file byte, rank int) Square {
	s, err := ParseSquare(string([]byte{file, byte('0' + rank)}))
	if err != nil {
		panic(err)
	}
	return s
}
