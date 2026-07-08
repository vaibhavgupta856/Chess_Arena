package chess

import "testing"

func TestKingsideCastlingLegal(t *testing.T) {
	g := mustGameFromFEN(t, "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1")
	assertContainsUCI(t, g, "e1g1")
}

func TestQueensideCastlingLegal(t *testing.T) {
	g := mustGameFromFEN(t, "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1")
	assertContainsUCI(t, g, "e1c1")
}

func TestCannotCastleWhenInCheck(t *testing.T) {
	g := mustGameFromFEN(t, "r3k2r/8/8/8/8/4b3/8/R3K2R w KQkq - 0 1")
	assertNotContainsUCI(t, g, "e1g1")
	assertNotContainsUCI(t, g, "e1c1")
}

func TestCannotCastleThroughCheck(t *testing.T) {
	g := mustGameFromFEN(t, "r3k2r/8/8/8/2b5/8/8/R3K2R w KQkq - 0 1")
	assertNotContainsUCI(t, g, "e1g1")
}

func TestCannotCastleWithPiecesInWay(t *testing.T) {
	g := mustGameFromFEN(t, "r3k2r/8/8/8/8/8/8/R3KN1R w KQkq - 0 1")
	assertNotContainsUCI(t, g, "e1g1")
}

func TestCastlingRightsLostAfterKingMove(t *testing.T) {
	g := mustGameFromFEN(t, "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1")
	playSAN(t, g, "Ke2", "Ke7", "Kd1", "Kd8")
	assertNotContainsUCI(t, g, "e1g1")
	assertNotContainsUCI(t, g, "e1c1")
}

func TestCastlingRightsLostAfterRookMove(t *testing.T) {
	g := mustGameFromFEN(t, "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1")
	playSAN(t, g, "Ra2", "Ra7", "Ra1", "Ra8", "Rh2", "Rh7", "Rh1", "Rh8")
	assertNotContainsUCI(t, g, "e1g1")
	assertNotContainsUCI(t, g, "e1c1")
}

func TestCastlingUpdatesBoard(t *testing.T) {
	g := mustGameFromFEN(t, "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1")
	playUCI(t, g, "e1g1")
	g1, _ := ParseSquare("g1")
	f1, _ := ParseSquare("f1")
	h1, _ := ParseSquare("h1")
	if g.PieceAt(g1).Type != King {
		t.Fatal("king should be on g1 after castling")
	}
	if g.PieceAt(f1).Type != Rook {
		t.Fatal("rook should be on f1 after kingside castle")
	}
	if !g.PieceAt(h1).IsEmpty() {
		t.Fatal("h1 should be empty after kingside castle")
	}
}

func TestBlackCastling(t *testing.T) {
	g := mustGameFromFEN(t, "r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1")
	assertContainsUCI(t, g, "e8g8")
	assertContainsUCI(t, g, "e8c8")
}
