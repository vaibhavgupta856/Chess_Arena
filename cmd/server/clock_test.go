package main

import (
	"testing"
	"time"

	"github.com/conan/chessarena/internal/chess"
)

func TestParseTimeControlDefaults(t *testing.T) {
	tc := parseTimeControl("")
	if tc.ID != defaultTimeControlID || tc.InitialMs != 600_000 {
		t.Fatalf("default = %+v", tc)
	}
	u := parseTimeControl("unlimited")
	if u.InitialMs != 0 {
		t.Fatalf("unlimited initial = %d", u.InitialMs)
	}
	three := parseTimeControl("3+2")
	if three.InitialMs != 180_000 || three.IncrementMs != 2_000 {
		t.Fatalf("3+2 = %+v", three)
	}
}

func TestClockStartsForLocalAndPausesWhenOver(t *testing.T) {
	s := newServer()
	session := newSession("g1", "local", "white", "p1", "", "1+0")
	s.sessions["g1"] = session
	s.ensureClockStarted(session)

	session.mu.Lock()
	if !session.clockRunning || session.whiteTimeMs != 60_000 {
		session.mu.Unlock()
		t.Fatalf("expected running clock with 60s, got running=%v white=%d", session.clockRunning, session.whiteTimeMs)
	}
	session.mu.Unlock()

	if err := session.game.Resign(chess.White); err != nil {
		t.Fatal(err)
	}
	session.mu.Lock()
	session.pauseClockLocked(time.Now())
	if session.clockRunning {
		session.mu.Unlock()
		t.Fatal("clock should stop after resign")
	}
	session.mu.Unlock()
}

func TestOnlineClockWaitsForBothPlayers(t *testing.T) {
	s := newServer()
	session := newSession("g2", "online", "white", "w1", "", "5+0")
	s.sessions["g2"] = session
	s.ensureClockStarted(session)

	session.mu.Lock()
	running := session.clockRunning
	session.mu.Unlock()
	if running {
		t.Fatal("online clock must wait for black")
	}

	if _, err := session.join("b1"); err != nil {
		t.Fatal(err)
	}
	s.ensureClockStarted(session)
	session.mu.Lock()
	running = session.clockRunning
	session.mu.Unlock()
	if !running {
		t.Fatal("online clock should start once both seats filled")
	}
}

func TestMoveDebitsAndAddsIncrement(t *testing.T) {
	session := newSession("g3", "local", "white", "p1", "", "3+2")
	session.mu.Lock()
	session.startClockLocked(time.Now().Add(-1500 * time.Millisecond))
	session.mu.Unlock()

	mover, ok := (&server{}).prepareMoveClock(session)
	if !ok || mover != chess.White {
		t.Fatalf("prepare failed ok=%v mover=%v", ok, mover)
	}
	session.mu.Lock()
	if session.whiteTimeMs > 178_600 || session.whiteTimeMs < 178_000 {
		session.mu.Unlock()
		t.Fatalf("white remaining after debit = %d", session.whiteTimeMs)
	}
	beforeInc := session.whiteTimeMs
	session.mu.Unlock()

	if err := session.game.ApplyUCIMove("e2e4"); err != nil {
		t.Fatal(err)
	}
	srv := &server{sessions: map[string]*gameSession{"g3": session}}
	srv.afterMoveClock(session, chess.White)

	session.mu.Lock()
	defer session.mu.Unlock()
	if session.whiteTimeMs != beforeInc+2_000 {
		t.Fatalf("white after increment = %d want %d", session.whiteTimeMs, beforeInc+2_000)
	}
	if session.game.Turn() != chess.Black {
		t.Fatal("turn should be black")
	}
	if !session.clockRunning {
		t.Fatal("clock should run for black")
	}
}

func TestFlagOnExpiredClock(t *testing.T) {
	session := newSession("g4", "local", "white", "p1", "", "1+0")
	session.mu.Lock()
	session.whiteTimeMs = 0
	session.clockRunning = true
	session.turnStartedAt = time.Now().Add(-time.Second)
	session.mu.Unlock()

	_, ok := (&server{}).prepareMoveClock(session)
	if ok {
		t.Fatal("expected flag on expired clock")
	}
	if !session.game.IsOver() || session.game.Termination() != chess.Timeout {
		t.Fatalf("expected timeout, got over=%v term=%s", session.game.IsOver(), session.game.Termination())
	}
	if session.game.Outcome() != chess.BlackWins {
		t.Fatalf("outcome = %s", session.game.Outcome())
	}
}

func TestStaleTimeoutIgnored(t *testing.T) {
	s := newServer()
	session := newSession("g5", "local", "white", "p1", "", "1+0")
	s.sessions["g5"] = session
	session.mu.Lock()
	session.startClockLocked(time.Now())
	oldGen := session.clockGen
	session.clockGen++
	session.mu.Unlock()

	s.finishTimeout("g5", oldGen)
	if session.game.IsOver() {
		t.Fatal("stale timeout should be ignored")
	}
}

func TestUnlimitedNeverRuns(t *testing.T) {
	s := newServer()
	session := newSession("g6", "bot", "white", "p1", chess.BotCasual, "unlimited")
	s.sessions["g6"] = session
	s.ensureClockStarted(session)
	session.mu.Lock()
	defer session.mu.Unlock()
	if session.clockRunning || session.clocksEnabled() {
		t.Fatalf("unlimited should not run clocks")
	}
}

func TestChessFlagAPI(t *testing.T) {
	g := chess.NewGame()
	if err := g.Flag(chess.Black); err != nil {
		t.Fatal(err)
	}
	if g.Outcome() != chess.WhiteWins || g.Termination() != chess.Timeout {
		t.Fatalf("got %s %s", g.Outcome(), g.Termination())
	}
}
