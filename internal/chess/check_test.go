package chess

import "testing"

func TestCheckDetection(t *testing.T) {
	g := mustGameFromFEN(t, "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3")
	if !g.InCheck() {
		t.Fatal("white should be in check from queen on h4")
	}
}

func TestMustEvadeCheck(t *testing.T) {
	g := mustGameFromFEN(t, "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1")
	playSAN(t, g, "Re8")
	if !g.InCheck() {
		t.Fatal("black should be in check after Re8")
	}
	moves := g.LegalMoves()
	for _, m := range moves {
		if m.To.String() == "f8" && m.From.String() != "e8" {
			t.Fatal("black cannot move another piece to f8 while in check from rook")
		}
	}
}

func TestPinnedPieceCannotMoveOffPinLine(t *testing.T) {
	g := mustGameFromFEN(t, "4k3/8/8/8/3B4/8/4r3/4K3 w - - 0 1")
	b4, _ := ParseSquare("b4")
	moves := g.LegalMovesFrom(b4)
	if len(moves) != 0 {
		t.Fatalf("pinned bishop should have no legal moves, got %d", len(moves))
	}
}

func TestCannotMoveIntoCheck(t *testing.T) {
	g := mustGameFromFEN(t, "4k3/8/8/8/8/3b4/8/4K3 w - - 0 1")
	assertNotContainsUCI(t, g, "e1f1")
}

func TestBlockCheck(t *testing.T) {
	g := mustGameFromFEN(t, "7k/8/8/8/8/5Q2/8/r5K1 w - - 0 1")
	assertContainsSAN(t, g, "Qf1")
}

func TestCaptureCheckingPiece(t *testing.T) {
	g := mustGameFromFEN(t, "5k2/8/8/8/8/8/8/4RrK1 w - - 0 1")
	assertContainsSAN(t, g, "Rxf1")
}
