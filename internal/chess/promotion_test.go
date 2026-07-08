package chess

import "testing"

func TestPromotionToQueen(t *testing.T) {
	g := mustGameFromFEN(t, "8/4P3/8/8/8/8/8/4K2k w - - 0 1")
	assertContainsUCI(t, g, "e7e8q")
	playUCI(t, g, "e7e8q")
	e8, _ := ParseSquare("e8")
	if g.PieceAt(e8).Type != Queen || g.PieceAt(e8).Color != White {
		t.Fatalf("e8 = %+v, want white queen", g.PieceAt(e8))
	}
}

func TestUnderpromotion(t *testing.T) {
	g := mustGameFromFEN(t, "8/4P3/8/8/8/8/8/4K2k w - - 0 1")
	for _, promo := range []string{"e7e8r", "e7e8b", "e7e8n"} {
		assertContainsUCI(t, g, promo)
	}
}

func TestPromotionRequiredOnBackRank(t *testing.T) {
	g := mustGameFromFEN(t, "8/4P3/8/8/8/8/8/4K2k w - - 0 1")
	assertNotContainsUCI(t, g, "e7e8")
}

func TestBlackPromotion(t *testing.T) {
	g := mustGameFromFEN(t, "4k2K/8/8/8/8/8/4p3/8 b - - 0 1")
	assertContainsUCI(t, g, "e2e1q")
	playUCI(t, g, "e2e1q")
	e1, _ := ParseSquare("e1")
	if g.PieceAt(e1).Type != Queen || g.PieceAt(e1).Color != Black {
		t.Fatalf("e1 = %+v, want black queen", g.PieceAt(e1))
	}
}
