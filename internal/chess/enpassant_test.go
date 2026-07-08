package chess

import "testing"

func TestEnPassantCapture(t *testing.T) {
	g := NewGame()
	playSAN(t, g, "e4", "d5", "e5", "f5")
	assertContainsUCI(t, g, "e5f6")
	playUCI(t, g, "e5f6")
	f6, _ := ParseSquare("f6")
	if g.PieceAt(f6).Type != Pawn || g.PieceAt(f6).Color != White {
		t.Fatalf("f6 = %+v, want white pawn after en passant", g.PieceAt(f6))
	}
	f5, _ := ParseSquare("f5")
	if !g.PieceAt(f5).IsEmpty() {
		t.Fatal("f5 should be empty after en passant capture")
	}
}

func TestEnPassantWindowCloses(t *testing.T) {
	g := NewGame()
	playSAN(t, g, "e4", "d5", "e5", "f5", "Nc3", "a6")
	assertNotContainsUCI(t, g, "e5f6")
}

func TestEnPassantOnlyAfterDoublePush(t *testing.T) {
	g := mustGameFromFEN(t, "8/8/8/4p3/3P4/8/8/8 w - - 0 1")
	assertNotContainsUCI(t, g, "e4f5")
}
