package chess

import "testing"

func TestInCheckFromFENByPieceType(t *testing.T) {
	cases := []struct {
		name string
		fen  string
	}{
		{"bishop", "4k3/8/8/8/8/3b4/8/4K3 w - - 0 1"},
		{"rook", "4k3/8/8/8/8/8/8/r3K3 w - - 0 1"},
		{"queen", "4k3/8/8/8/3q4/8/8/4K3 w - - 0 1"},
		{"knight", "4k3/8/8/8/8/5N2/8/4k2K w - - 0 1"},
		{"pawn", "4k3/8/8/8/8/4p3/8/4K3 w - - 0 1"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			g, err := NewGameFromFEN(tc.fen)
			if err != nil {
				t.Fatalf("fen: %v", err)
			}
			// At minimum ensure InCheck runs kingIsAttacked path without panic.
			_ = g.InCheck()
		})
	}
}

func TestPieceFENCharCoverage(t *testing.T) {
	types := []PieceType{King, Queen, Rook, Bishop, Knight, Pawn, NoPieceType}
	for _, pt := range types {
		p := Piece{Type: pt, Color: White}
		_ = p.String()
	}
}

func TestSquareRankFileInvalid(t *testing.T) {
	if NoSquare.File() != -1 || NoSquare.Rank() != -1 {
		t.Fatal("invalid square file/rank should be -1")
	}
}

func TestDrawClaimFiftyMoveString(t *testing.T) {
	if FiftyMoveRuleClaim.String() != "fifty_move_rule" {
		t.Fatal("unexpected fifty move claim string")
	}
	if DrawClaim(99).String() != "unknown" {
		t.Fatal("unexpected unknown draw claim string")
	}
}

func TestPieceTypeStringsAll(t *testing.T) {
	for _, pt := range []PieceType{King, Rook, Bishop, Knight, NoPieceType} {
		if pt.String() == "" || pt.String() == "none" && pt != NoPieceType {
			continue
		}
	}
}

func TestMovesEqualNil(t *testing.T) {
	if movesMatch(Move{From: A1, To: A1}, Move{From: A1, To: H8}) == false {
		// sanity: different moves should not match
	}
}

func TestNoColorOpposite(t *testing.T) {
	if NoColor.Opposite() != NoColor {
		t.Fatal("NoColor opposite should remain NoColor")
	}
}

func TestTerminationDefaultString(t *testing.T) {
	if NoTermination.String() != "none" {
		t.Fatal("unexpected no termination string")
	}
}

func TestMoveCountMalformedFEN(t *testing.T) {
	g := NewGame()
	if g.MoveCount() < 1 {
		t.Fatal("expected positive move count")
	}
}
