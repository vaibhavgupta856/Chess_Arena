package main

import (
	"encoding/json"
	"log"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"github.com/conan/chessarena/internal/chess"
	"github.com/gorilla/websocket"
)

type server struct {
	mu    sync.RWMutex
	games map[string]*chess.Game
	subs  map[string]map[*websocket.Conn]struct{}
}

type gameState struct {
	ID        string `json:"id"`
	FEN       string `json:"fen"`
	Outcome   string `json:"outcome"`
	Over      bool   `json:"over"`
	Turn      string `json:"turn"`
	HalfMoves int    `json:"halfMoves"`
	FullMoves int    `json:"fullMoves"`
}

func newServer() *server {
	return &server{
		games: make(map[string]*chess.Game),
		subs:  make(map[string]map[*websocket.Conn]struct{}),
	}
}

func (s *server) newGameHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	g := chess.NewGame()
	id := s.nextID()

	s.mu.Lock()
	s.games[id] = g
	s.mu.Unlock()

	writeJSON(w, http.StatusCreated, s.encodeState(id, g))
}

func (s *server) getGame(id string) (*chess.Game, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	g, ok := s.games[id]
	return g, ok
}

func (s *server) broadcast(id string) {
	s.mu.RLock()
	g, ok := s.games[id]
	subs := s.subs[id]
	s.mu.RUnlock()
	if !ok || len(subs) == 0 {
		return
	}
	msg, err := json.Marshal(s.encodeState(id, g))
	if err != nil {
		return
	}
	for c := range subs {
		_ = c.WriteMessage(websocket.TextMessage, msg)
	}
}

func (s *server) gameStateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id := r.PathValue("id")
	g, ok := s.getGame(id)
	if !ok {
		http.Error(w, "game not found", http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, s.encodeState(id, g))
}

type moveRequest struct {
	UCI string `json:"uci"`
	SAN string `json:"san"`
}

func (s *server) moveHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id := r.PathValue("id")
	g, ok := s.getGame(id)
	if !ok {
		http.Error(w, "game not found", http.StatusNotFound)
		return
	}
	var req moveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	var err error
	switch {
	case req.UCI != "" && req.SAN != "":
		http.Error(w, "specify either uci or san, not both", http.StatusBadRequest)
		return
	case req.UCI != "":
		err = g.ApplyUCIMove(req.UCI)
	case req.SAN != "":
		err = g.ApplySANMove(req.SAN)
	default:
		http.Error(w, "missing move (uci or san)", http.StatusBadRequest)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	s.broadcast(id)
	writeJSON(w, http.StatusOK, s.encodeState(id, g))
}

func (s *server) legalMovesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id := r.PathValue("id")
	g, ok := s.getGame(id)
	if !ok {
		http.Error(w, "game not found", http.StatusNotFound)
		return
	}
	moves := g.LegalMoves()
	type moveJSON struct {
		UCI string `json:"uci"`
		SAN string `json:"san"`
	}
	out := make([]moveJSON, 0, len(moves))
	for _, m := range moves {
		san, _ := g.SANMove(m)
		out = append(out, moveJSON{
			UCI: m.UCI(),
			SAN: san,
		})
	}
	writeJSON(w, http.StatusOK, out)
}

type resignRequest struct {
	Color string `json:"color"`
}

func (s *server) resignHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id := r.PathValue("id")
	g, ok := s.getGame(id)
	if !ok {
		http.Error(w, "game not found", http.StatusNotFound)
		return
	}
	var req resignRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	var color chess.Color
	switch req.Color {
	case "white":
		color = chess.White
	case "black":
		color = chess.Black
	default:
		http.Error(w, "color must be \"white\" or \"black\"", http.StatusBadRequest)
		return
	}
	if err := g.Resign(color); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	s.broadcast(id)
	writeJSON(w, http.StatusOK, s.encodeState(id, g))
}

type drawRequest struct {
	Type string `json:"type"`
}

func (s *server) drawHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id := r.PathValue("id")
	g, ok := s.getGame(id)
	if !ok {
		http.Error(w, "game not found", http.StatusNotFound)
		return
	}
	var req drawRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	var claim chess.DrawClaim
	switch req.Type {
	case "draw_offer":
		claim = chess.DrawOfferClaim
	case "threefold_repetition":
		claim = chess.ThreefoldRepetitionClaim
	case "fifty_move_rule":
		claim = chess.FiftyMoveRuleClaim
	default:
		http.Error(w, "unsupported draw type", http.StatusBadRequest)
		return
	}
	if err := g.ClaimDraw(claim); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	s.broadcast(id)
	writeJSON(w, http.StatusOK, s.encodeState(id, g))
}

func (s *server) nextID() string {
	const letters = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 10)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}

func (s *server) encodeState(id string, g *chess.Game) gameState {
	return gameState{
		ID:        id,
		FEN:       g.FEN(),
		Outcome:   g.Outcome().String(),
		Over:      g.IsOver(),
		Turn:      g.Turn().String(),
		HalfMoves: g.HalfMoveClock(),
		FullMoves: g.MoveCount(),
	}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func (s *server) wsHandler(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	s.mu.RLock()
	_, ok := s.games[id]
	s.mu.RUnlock()
	if !ok {
		http.Error(w, "game not found", http.StatusNotFound)
		return
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	s.mu.Lock()
	if s.subs[id] == nil {
		s.subs[id] = make(map[*websocket.Conn]struct{})
	}
	s.subs[id][conn] = struct{}{}
	s.mu.Unlock()

	// Send initial state
	s.broadcast(id)

	// Consume read loop until client disconnects.
	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}

	s.mu.Lock()
	delete(s.subs[id], conn)
	s.mu.Unlock()
	_ = conn.Close()
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func main() {
	rand.Seed(time.Now().UnixNano())
	s := newServer()

	mux := http.NewServeMux()
	mux.HandleFunc("POST /games", s.newGameHandler)
	mux.HandleFunc("GET /games/{id}", s.gameStateHandler)
	mux.HandleFunc("POST /games/{id}/moves", s.moveHandler)
	mux.HandleFunc("GET /games/{id}/moves", s.legalMovesHandler)
	mux.HandleFunc("POST /games/{id}/resign", s.resignHandler)
	mux.HandleFunc("POST /games/{id}/draw", s.drawHandler)
	mux.HandleFunc("GET /ws/games/{id}", s.wsHandler)

	addr := ":8080"
	log.Printf("chess server listening on %s", addr)
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
		if r.Method == http.MethodOptions {
			return
		}
		mux.ServeHTTP(w, r)
	})
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatal(err)
	}
}

