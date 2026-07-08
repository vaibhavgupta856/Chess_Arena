package chess

import (
	"strings"
	"testing"
)

func TestNewGameStartingPosition(t *testing.T) {
	g := NewGame()
	if g.Turn() != White {
		t.Fatalf("turn = %v, want white", g.Turn())
	}
	if g.IsOver() {
		t.Fatal("new game should not be over")
	}
	if g.Outcome() != Ongoing {
		t.Fatalf("outcome = %v, want ongoing", g.Outcome())
	}
	if g.InCheck() {
		t.Fatal("starting position should not be in check")
	}
	if len(g.LegalMoves()) != 20 {
		t.Fatalf("starting legal moves = %d, want 20", len(g.LegalMoves()))
	}
}

func TestTurnAlternation(t *testing.T) {
	g := NewGame()
	playSAN(t, g, "e4")
	if g.Turn() != Black {
		t.Fatalf("turn after e4 = %v, want black", g.Turn())
	}
	playSAN(t, g, "e5")
	if g.Turn() != White {
		t.Fatalf("turn after e5 = %v, want white", g.Turn())
	}
}

func TestFENRoundTrip(t *testing.T) {
	g := NewGame()
	playSAN(t, g, "e4", "e5", "Nf3")
	fen := g.FEN()
	g2, err := NewGameFromFEN(fen)
	if err != nil {
		t.Fatalf("NewGameFromFEN: %v", err)
	}
	if g2.FEN() != fen {
		t.Fatalf("FEN round-trip failed:\n got %s\nwant %s", g2.FEN(), fen)
	}
	if g2.Turn() != g.Turn() {
		t.Fatalf("turn mismatch after FEN reload")
	}
}

func TestMoveHistory(t *testing.T) {
	g := NewGame()
	playSAN(t, g, "e4", "e5", "Nf3")
	history := g.MoveHistory()
	if len(history) != 3 {
		t.Fatalf("history length = %d, want 3", len(history))
	}
	if history[0].SAN != "e4" || history[0].UCI != "e2e4" {
		t.Fatalf("first move = %+v, want e4/e2e4", history[0])
	}
	if history[2].SAN != "Nf3" {
		t.Fatalf("third move SAN = %q, want Nf3", history[2].SAN)
	}
}

func TestMoveCountAndHalfMoveClock(t *testing.T) {
	g := NewGame()
	if g.MoveCount() != 1 {
		t.Fatalf("move count = %d, want 1", g.MoveCount())
	}
	if g.HalfMoveClock() != 0 {
		t.Fatalf("half move clock = %d, want 0", g.HalfMoveClock())
	}
	playSAN(t, g, "Nf3", "Nf6")
	if g.HalfMoveClock() != 2 {
		t.Fatalf("half move clock after two knight moves = %d, want 2", g.HalfMoveClock())
	}
}

func TestPieceAt(t *testing.T) {
	g := NewGame()
	e2, _ := ParseSquare("e2")
	e4, _ := ParseSquare("e4")
	p := g.PieceAt(e2)
	if p.Type != Pawn || p.Color != White {
		t.Fatalf("e2 piece = %+v, want white pawn", p)
	}
	playSAN(t, g, "e4")
	if g.PieceAt(e4).Type != Pawn || g.PieceAt(e4).Color != White {
		t.Fatalf("e4 piece = %+v, want white pawn after e4", g.PieceAt(e4))
	}
}

func TestSmokeSequence(t *testing.T) {
	g := NewGame()
	playSAN(t, g, "e4", "e5", "Nf3")
	wantPrefix := "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b"
	if !strings.HasPrefix(g.FEN(), wantPrefix) {
		t.Fatalf("unexpected FEN: %s", g.FEN())
	}
}
