package chess

import "testing"

func TestPerftStartingPosition(t *testing.T) {
	pos := startingPosition()
	cases := []struct {
		depth int
		want  int64
	}{
		{1, 20},
		{2, 400},
		{3, 8902},
		{4, 197281},
	}
	for _, tc := range cases {
		got := Perft(pos, tc.depth)
		if got != tc.want {
			t.Fatalf("perft depth %d = %d, want %d", tc.depth, got, tc.want)
		}
	}
}

func TestPerftKiwipete(t *testing.T) {
	pos, err := parseFEN("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1")
	if err != nil {
		t.Fatal(err)
	}
	cases := []struct {
		depth int
		want  int64
	}{
		{1, 48},
		{2, 2039},
		{3, 97862},
	}
	for _, tc := range cases {
		got := Perft(pos, tc.depth)
		if got != tc.want {
			t.Fatalf("kiwipete depth %d = %d, want %d", tc.depth, got, tc.want)
		}
	}
}
