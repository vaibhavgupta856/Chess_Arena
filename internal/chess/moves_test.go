package chess

import "testing"

func TestPawnMoves(t *testing.T) {
	tests := []struct {
		name    string
		fen     string
		square  string
		want    []string
		notWant []string
	}{
		{
			name:   "white one and two square",
			fen:    "8/8/8/8/8/8/4P3/8 w - - 0 1",
			square: "e2",
			want:   []string{"e3", "e4"},
		},
		{
			name:   "white blocked one square",
			fen:    "8/8/8/8/4p3/8/4P3/8 w - - 0 1",
			square: "e2",
			want:   []string{"e3"},
			notWant: []string{"e4"},
		},
		{
			name:   "black one and two square",
			fen:    "8/4p3/8/8/8/8/8/8 b - - 0 1",
			square: "e7",
			want:   []string{"e6", "e5"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			g := mustGameFromFEN(t, tt.fen)
			sq, err := ParseSquare(tt.square)
			if err != nil {
				t.Fatal(err)
			}
			moves := g.LegalMovesFrom(sq)
			got := make([]string, len(moves))
			for i, m := range moves {
				got[i] = m.To.String()
			}
			for _, w := range tt.want {
				found := false
				for _, gsq := range got {
					if gsq == w {
						found = true
						break
					}
				}
				if !found {
					t.Fatalf("missing destination %s in %v", w, got)
				}
			}
			for _, nw := range tt.notWant {
				for _, gsq := range got {
					if gsq == nw {
						t.Fatalf("unexpected destination %s in %v", nw, got)
					}
				}
			}
		})
	}
}

func TestKnightMoves(t *testing.T) {
	g := mustGameFromFEN(t, "8/8/8/8/4N3/8/8/8 w - - 0 1")
	e4, _ := ParseSquare("e4")
	moves := g.LegalMovesFrom(e4)
	want := []string{"c3", "c5", "d2", "d6", "f2", "f6", "g3", "g5"}
	if len(moves) != len(want) {
		t.Fatalf("knight moves = %d, want %d", len(moves), len(want))
	}
	for _, w := range want {
		assertContainsUCI(t, g, "e4"+w)
	}
}

func TestBishopMoves(t *testing.T) {
	g := mustGameFromFEN(t, "8/8/8/8/4B3/8/8/8 w - - 0 1")
	assertContainsUCI(t, g, "e4h7")
	assertContainsUCI(t, g, "e4a8")
}

func TestRookMoves(t *testing.T) {
	g := mustGameFromFEN(t, "8/8/8/8/4R3/8/8/8 w - - 0 1")
	assertContainsUCI(t, g, "e4e8")
	assertContainsUCI(t, g, "e4a4")
}

func TestQueenMoves(t *testing.T) {
	g := mustGameFromFEN(t, "8/8/8/8/4Q3/8/8/8 w - - 0 1")
	assertContainsUCI(t, g, "e4e8")
	assertContainsUCI(t, g, "e4h7")
}

func TestKingMoves(t *testing.T) {
	g := mustGameFromFEN(t, "8/8/8/8/3K4/8/8/8 w - - 0 1")
	moves := g.LegalMoves()
	if len(moves) != 8 {
		t.Fatalf("king moves = %d, want 8", len(moves))
	}
}
