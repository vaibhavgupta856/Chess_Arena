package chess

import "testing"

func TestParseBotLevel(t *testing.T) {
	if ParseBotLevel("beginner").Elo() != 400 {
		t.Fatal("beginner elo")
	}
	if ParseBotLevel("").Elo() != 800 {
		t.Fatal("default casual")
	}
}

func TestWeakerBotPicksLegalMove(t *testing.T) {
	g := NewGame()
	for _, level := range []BotLevel{BotBeginner, BotCasual, BotClub, BotStrong} {
		m, ok := ChooseBotMove(g, level)
		if !ok {
			t.Fatalf("no move for %s", level)
		}
		if err := g.ApplyMove(m); err != nil {
			t.Fatalf("illegal move %s at %s: %v", m.UCI(), level, err)
		}
	}
}

func TestBestMove(t *testing.T) {
	g := NewGame()
	m, score, ok := BestMove(g, 2)
	if !ok || score == 0 && m.From == 0 {
		t.Fatal("expected best move from start")
	}
}
