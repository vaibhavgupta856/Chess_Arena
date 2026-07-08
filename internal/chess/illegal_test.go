package chess

import "testing"

func TestIllegalMoveRejected(t *testing.T) {
	g := NewGame()
	if err := g.ApplyUCIMove("e2e5"); err == nil {
		t.Fatal("pawn cannot move three squares")
	}
}

func TestCannotMoveAfterGameOver(t *testing.T) {
	g := NewGame()
	playSAN(t, g, "f3", "e5", "g4", "Qh4#")
	if err := g.ApplySANMove("a3"); err == nil {
		t.Fatal("should not allow moves after checkmate")
	}
}

func TestCannotMoveOpponentPiece(t *testing.T) {
	g := NewGame()
	if err := g.ApplyUCIMove("e7e5"); err == nil {
		t.Fatal("white cannot move black pawn")
	}
}

func TestApplyMoveWrongTurn(t *testing.T) {
	g := NewGame()
	e7, _ := ParseSquare("e7")
	e5, _ := ParseSquare("e5")
	m := Move{From: e7, To: e5}
	if err := g.ApplyMove(m); err == nil {
		t.Fatal("should reject move of opponent piece")
	}
}

func TestMovingIntoCheckIllegal(t *testing.T) {
	g := mustGameFromFEN(t, "4k3/8/8/8/8/3b4/8/4K3 w - - 0 1")
	assertIllegalUCI(t, g, "e1f1")
}

func TestClaimDrawWhenNotEligible(t *testing.T) {
	g := NewGame()
	if err := g.ClaimDraw(ThreefoldRepetitionClaim); err == nil {
		t.Fatal("should not allow threefold claim without repetitions")
	}
}

func TestParseSquareInvalid(t *testing.T) {
	if _, err := ParseSquare("z9"); err == nil {
		t.Fatal("expected error for invalid square")
	}
}

func TestInvalidFEN(t *testing.T) {
	if _, err := NewGameFromFEN("not-a-fen"); err == nil {
		t.Fatal("expected error for invalid FEN")
	}
}
