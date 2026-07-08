package chess

import "testing"

func TestFoolsMate(t *testing.T) {
	g := NewGame()
	playSAN(t, g, "f3", "e5", "g4", "Qh4#")
	assertOutcome(t, g, BlackWins, Checkmate)
}

func TestBackRankMate(t *testing.T) {
	g := mustGameFromFEN(t, "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1")
	playSAN(t, g, "Re8#")
	assertOutcome(t, g, WhiteWins, Checkmate)
}

func TestCheckmateNoEscape(t *testing.T) {
	g := mustGameFromFEN(t, "7k/5Q2/6K1/8/8/8/8/8 w - - 0 1")
	playSAN(t, g, "Qf8#")
	assertOutcome(t, g, WhiteWins, Checkmate)
	if len(g.LegalMoves()) != 0 {
		t.Fatal("checkmated side should have no legal moves")
	}
}
