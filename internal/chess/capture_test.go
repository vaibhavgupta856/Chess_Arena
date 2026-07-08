package chess

import "testing"

func TestCapture(t *testing.T) {
	g := mustGameFromFEN(t, "rnbqkbnr/pppp1ppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1")
	assertContainsUCI(t, g, "e4d5")
	playUCI(t, g, "e4d5")
	d5, _ := ParseSquare("d5")
	if g.PieceAt(d5).Type != Pawn || g.PieceAt(d5).Color != White {
		t.Fatalf("d5 = %+v, want white pawn after capture", g.PieceAt(d5))
	}
}

func TestCannotCaptureOwnPiece(t *testing.T) {
	g := mustGameFromFEN(t, "8/8/8/8/8/3N4/8/3N4 w - - 0 1")
	d2, _ := ParseSquare("d2")
	moves := g.LegalMovesFrom(d2)
	for _, m := range moves {
		if m.To == d2 {
			t.Fatal("knight should not capture own knight on d2")
		}
	}
}

func TestCaptureRemovesCapturedPiece(t *testing.T) {
	g := mustGameFromFEN(t, "rnbqkbnr/pppp1ppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1")
	playUCI(t, g, "e4d5")
	e4, _ := ParseSquare("e4")
	if !g.PieceAt(e4).IsEmpty() {
		t.Fatal("e4 should be empty after capture")
	}
}
