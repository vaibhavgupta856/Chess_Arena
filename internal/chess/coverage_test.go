package chess

import (
	"strings"
	"testing"
)

func TestAPIHelpersAndTypes(t *testing.T) {
	if White.String() != "white" || Black.String() != "black" || NoColor.String() != "none" {
		t.Fatal("unexpected color strings")
	}
	if White.Opposite() != Black || Black.Opposite() != White {
		t.Fatal("unexpected opposite colors")
	}
	if Queen.String() != "queen" || Pawn.String() != "pawn" {
		t.Fatal("unexpected piece type strings")
	}

	p := Piece{Type: Queen, Color: White}
	if p.IsEmpty() || p.String() != "q" {
		t.Fatalf("piece string = %q", p.String())
	}
	blackP := Piece{Type: King, Color: Black}
	if blackP.String() != "k" {
		t.Fatalf("black king string = %q", blackP.String())
	}

	if NoSquare.String() != "??" {
		t.Fatalf("nosquare string = %q", NoSquare.String())
	}
	if A1.File() != 0 || A1.Rank() != 0 || A1.String() != "a1" {
		t.Fatalf("a1 = file %d rank %d str %s", A1.File(), A1.Rank(), A1.String())
	}
	if _, err := ParseSquare("e4"); err != nil {
		t.Fatalf("parse e4: %v", err)
	}

	if Ongoing.String() != "*" || Draw.String() != "1/2-1/2" {
		t.Fatal("unexpected outcome strings")
	}
	if Checkmate.String() != "checkmate" || FiftyMoveRule.String() != "fifty_move_rule" {
		t.Fatal("unexpected termination strings")
	}
	if ThreefoldRepetitionClaim.String() != "threefold_repetition" {
		t.Fatal("unexpected draw claim string")
	}
}

func TestApplyMoveAndIsLegal(t *testing.T) {
	g := NewGame()
	e2, _ := ParseSquare("e2")
	e4, _ := ParseSquare("e4")
	m := Move{From: e2, To: e4}
	if !g.IsLegal(m) {
		t.Fatal("e2e4 should be legal")
	}
	if err := g.ApplyMove(m); err != nil {
		t.Fatalf("ApplyMove: %v", err)
	}
	if g.IsLegal(m) {
		t.Fatal("e2e4 should not be legal after played")
	}
}

func TestNotationHelpers(t *testing.T) {
	g := NewGame()
	mv, err := g.ParseUCIMove("e2e4")
	if err != nil {
		t.Fatalf("ParseUCIMove: %v", err)
	}
	uci, err := g.UCIMove(mv)
	if err != nil {
		t.Fatalf("UCIMove: %v", err)
	}
	if uci != "e2e4" {
		t.Fatalf("uci = %q", uci)
	}
	san, err := g.SANMove(mv)
	if err != nil {
		t.Fatalf("SANMove: %v", err)
	}
	if san != "e4" {
		t.Fatalf("san = %q", san)
	}
}

func TestDrawOfferClaim(t *testing.T) {
	g := NewGame()
	playSAN(t, g, "e4")
	if err := g.ClaimDraw(DrawOfferClaim); err != nil {
		t.Fatalf("ClaimDraw offer: %v", err)
	}
	assertOutcome(t, g, Draw, DrawOffer)
}

func TestResignInvalidColor(t *testing.T) {
	g := NewGame()
	if err := g.Resign(NoColor); err == nil {
		t.Fatal("expected error for NoColor resign")
	}
}

func TestApplyMoveErrors(t *testing.T) {
	g := NewGame()
	playSAN(t, g, "f3", "e5", "g4", "Qh4#")
	a3, _ := ParseSquare("a3")
	m := Move{From: A1, To: a3}
	if err := g.ApplyMove(m); err == nil {
		t.Fatal("expected error applying move after game over")
	}
}

func TestKingIsAttackedWithoutHistory(t *testing.T) {
	g := mustGameFromFEN(t, "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3")
	if !g.InCheck() {
		t.Fatal("expected in check from FEN without move history")
	}
}

func TestMoveCountParseFallback(t *testing.T) {
	g := NewGame()
	if g.MoveCount() != 1 {
		t.Fatalf("move count = %d", g.MoveCount())
	}
}

func TestAllTerminationMappings(t *testing.T) {
	terms := []Termination{
		Resignation, DrawOffer, SeventyFiveMoveRule, NoTermination,
	}
	for _, term := range terms {
		if term.String() == "" {
			t.Fatalf("empty string for %v", term)
		}
	}
}

func TestPromotionCharAllPieces(t *testing.T) {
	for _, pt := range []PieceType{Queen, Rook, Bishop, Knight, NoPieceType} {
		_ = promotionChar(pt)
	}
}

func TestLegalMovesContainCheckFlag(t *testing.T) {
	g := mustGameFromFEN(t, "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1")
	for _, m := range g.LegalMoves() {
		if strings.HasSuffix(m.UCI(), "e8") && m.GivesCheck {
			return
		}
	}
	t.Fatal("expected at least one checking move")
}

func TestClaimableDrawIncludesOffer(t *testing.T) {
	g := NewGame()
	claims := g.ClaimableDraws()
	if len(claims) == 0 || claims[0] != DrawOfferClaim {
		t.Fatalf("claims = %v", claims)
	}
}
