package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/conan/chessarena/internal/chess"
	"github.com/gorilla/websocket"
)

type server struct {
	mu       sync.RWMutex
	sessions map[string]*gameSession
	subs     map[string]map[*websocket.Conn]struct{}
}

type moveRecordJSON struct {
	SAN string `json:"san"`
	UCI string `json:"uci"`
}

type gameState struct {
	ID             string           `json:"id"`
	FEN            string           `json:"fen"`
	Outcome        string           `json:"outcome"`
	Over           bool             `json:"over"`
	Turn           string           `json:"turn"`
	HalfMoves      int              `json:"halfMoves"`
	FullMoves      int              `json:"fullMoves"`
	Termination    string           `json:"termination"`
	InCheck        bool             `json:"inCheck"`
	History        []moveRecordJSON `json:"history"`
	PositionFENs   []string         `json:"positionFens"`
	Ply            int              `json:"ply"`
	Mode           string           `json:"mode"`
	YourColor      string           `json:"yourColor,omitempty"`
	WhitePlayer    string           `json:"whitePlayer,omitempty"`
	BlackPlayer    string           `json:"blackPlayer,omitempty"`
	WaitingFor     string           `json:"waitingFor,omitempty"`
	DrawOfferBy    string           `json:"drawOfferBy,omitempty"`
	ClaimableDraws []string         `json:"claimableDraws,omitempty"`
}

type createGameRequest struct {
	Mode     string `json:"mode"`
	PlayAs   string `json:"playAs"`
	ClientID string `json:"clientId"`
}

type joinRequest struct {
	ClientID string `json:"clientId"`
}

type playerRequest struct {
	ClientID string `json:"clientId"`
	Color    string `json:"color"`
}

type drawResponseRequest struct {
	ClientID string `json:"clientId"`
	Accept   bool   `json:"accept"`
	Color    string `json:"color"`
}

func newServer() *server {
	return &server{
		sessions: make(map[string]*gameSession),
		subs:     make(map[string]map[*websocket.Conn]struct{}),
	}
}

func (s *server) newGameHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req createGameRequest
	if r.Body != nil {
		_ = json.NewDecoder(r.Body).Decode(&req)
	}
	mode := req.Mode
	if mode == "" {
		mode = "local"
	}
	id := s.nextID()
	session := newSession(id, mode, req.PlayAs, req.ClientID)
	if err := session.maybeBotMove(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	s.mu.Lock()
	s.sessions[id] = session
	s.mu.Unlock()

	writeJSON(w, http.StatusCreated, s.encodeState(session, req.ClientID))
}

func (s *server) getSession(id string) (*gameSession, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	session, ok := s.sessions[id]
	return session, ok
}

func (s *server) broadcast(id string) {
	s.mu.RLock()
	session, ok := s.sessions[id]
	subs := s.subs[id]
	s.mu.RUnlock()
	if !ok || len(subs) == 0 {
		return
	}
	msg, err := json.Marshal(s.encodeState(session, ""))
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
	session, ok := s.getSession(id)
	if !ok {
		http.Error(w, "game not found", http.StatusNotFound)
		return
	}
	clientID := r.URL.Query().Get("clientId")
	writeJSON(w, http.StatusOK, s.encodeState(session, clientID))
}

func (s *server) joinHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id := r.PathValue("id")
	session, ok := s.getSession(id)
	if !ok {
		http.Error(w, "game not found", http.StatusNotFound)
		return
	}
	var req joinRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ClientID == "" {
		http.Error(w, "clientId required", http.StatusBadRequest)
		return
	}
	color, err := session.join(req.ClientID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	s.broadcast(id)
	state := s.encodeState(session, req.ClientID)
	state.YourColor = color
	writeJSON(w, http.StatusOK, state)
}

type moveRequest struct {
	UCI      string `json:"uci"`
	SAN      string `json:"san"`
	ClientID string `json:"clientId"`
}

func (s *server) moveHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id := r.PathValue("id")
	session, ok := s.getSession(id)
	if !ok {
		http.Error(w, "game not found", http.StatusNotFound)
		return
	}
	var req moveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if !session.canMove(req.ClientID) {
		http.Error(w, "not your turn", http.StatusForbidden)
		return
	}

	g := session.game
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
	session.drawOfferBy = chess.NoColor
	if err := session.maybeBotMove(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	s.broadcast(id)
	writeJSON(w, http.StatusOK, s.encodeState(session, req.ClientID))
}

func (s *server) legalMovesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id := r.PathValue("id")
	session, ok := s.getSession(id)
	if !ok {
		http.Error(w, "game not found", http.StatusNotFound)
		return
	}
	ply := len(session.game.MoveHistory())
	if plyStr := r.URL.Query().Get("ply"); plyStr != "" {
		var viewPly int
		if _, err := fmt.Sscanf(plyStr, "%d", &viewPly); err == nil && viewPly >= 0 && viewPly <= session.game.Ply() {
			ply = viewPly
		}
	}
	_ = ply
	g := session.game
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

func (s *server) resignHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id := r.PathValue("id")
	session, ok := s.getSession(id)
	if !ok {
		http.Error(w, "game not found", http.StatusNotFound)
		return
	}
	var req playerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	color := parseColor(req.Color)
	if color == chess.NoColor && req.ClientID != "" {
		color = session.playerColor(req.ClientID)
	}
	if color == chess.NoColor {
		http.Error(w, "color required", http.StatusBadRequest)
		return
	}
	if err := session.game.Resign(color); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	session.drawOfferBy = chess.NoColor
	s.broadcast(id)
	writeJSON(w, http.StatusOK, s.encodeState(session, req.ClientID))
}

type drawRequest struct {
	Type     string `json:"type"`
	ClientID string `json:"clientId"`
	Color    string `json:"color"`
}

func (s *server) drawHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id := r.PathValue("id")
	session, ok := s.getSession(id)
	if !ok {
		http.Error(w, "game not found", http.StatusNotFound)
		return
	}
	var req drawRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	switch req.Type {
	case "draw_offer":
		color := parseColor(req.Color)
		if color == chess.NoColor && req.ClientID != "" {
			color = session.playerColor(req.ClientID)
		}
		if color == chess.NoColor {
			http.Error(w, "color required", http.StatusBadRequest)
			return
		}
		if err := session.offerDraw(color); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
	case "threefold_repetition", "fifty_move_rule":
		var claim chess.DrawClaim
		if req.Type == "threefold_repetition" {
			claim = chess.ThreefoldRepetitionClaim
		} else {
			claim = chess.FiftyMoveRuleClaim
		}
		if err := session.game.ClaimDraw(claim); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
	default:
		http.Error(w, "unsupported draw type", http.StatusBadRequest)
		return
	}

	s.broadcast(id)
	writeJSON(w, http.StatusOK, s.encodeState(session, req.ClientID))
}

func (s *server) drawResponseHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id := r.PathValue("id")
	session, ok := s.getSession(id)
	if !ok {
		http.Error(w, "game not found", http.StatusNotFound)
		return
	}
	var req drawResponseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	color := parseColor(req.Color)
	if color == chess.NoColor {
		color = session.playerColor(req.ClientID)
	}
	if color == chess.NoColor && session.mode == "local" && session.drawOfferBy != chess.NoColor {
		color = session.drawOfferBy.Opposite()
	}
	if color == chess.NoColor {
		http.Error(w, "not a player", http.StatusForbidden)
		return
	}
	if err := session.respondDraw(color, req.Accept); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	s.broadcast(id)
	writeJSON(w, http.StatusOK, s.encodeState(session, req.ClientID))
}

func parseColor(s string) chess.Color {
	switch s {
	case "white":
		return chess.White
	case "black":
		return chess.Black
	default:
		return chess.NoColor
	}
}

func (s *server) nextID() string {
	const letters = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 8)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}

func (s *server) encodeState(session *gameSession, clientID string) gameState {
	g := session.game
	history := g.MoveHistory()
	records := make([]moveRecordJSON, 0, len(history))
	for _, rec := range history {
		records = append(records, moveRecordJSON{
			SAN: rec.SAN,
			UCI: rec.UCI,
		})
	}
	claims := make([]string, 0)
	for _, c := range g.ClaimableDraws() {
		if c != chess.DrawOfferClaim {
			claims = append(claims, c.String())
		}
	}
	waiting := ""
	if session.mode == "online" {
		if session.whitePlayer == "" {
			waiting = "white"
		} else if session.blackPlayer == "" {
			waiting = "black"
		}
	}
	yourColor := ""
	if session.mode == "local" {
		yourColor = "both"
	} else if clientID != "" {
		switch session.playerColor(clientID) {
		case chess.White:
			yourColor = "white"
		case chess.Black:
			yourColor = "black"
		}
	}
	drawOffer := ""
	if session.drawOfferBy != chess.NoColor {
		drawOffer = session.drawOfferBy.String()
	}
	fens := make([]string, 0, g.Ply()+1)
	for i := 0; i <= g.Ply(); i++ {
		if fen, err := g.FENAt(i); err == nil {
			fens = append(fens, fen)
		}
	}
	return gameState{
		ID:             session.id,
		FEN:            g.FEN(),
		Outcome:        g.Outcome().String(),
		Over:           g.IsOver(),
		Turn:           g.Turn().String(),
		HalfMoves:      g.HalfMoveClock(),
		FullMoves:      g.MoveCount(),
		Termination:    g.Termination().String(),
		InCheck:        g.InCheck(),
		History:        records,
		PositionFENs:   fens,
		Ply:            g.Ply(),
		Mode:           session.mode,
		YourColor:      yourColor,
		WhitePlayer:    session.whitePlayer,
		BlackPlayer:    session.blackPlayer,
		WaitingFor:     waiting,
		DrawOfferBy:    drawOffer,
		ClaimableDraws: claims,
	}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func (s *server) wsHandler(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	s.mu.RLock()
	_, ok := s.sessions[id]
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

	state, _ := s.getSession(id)
	_ = conn.WriteJSON(s.encodeState(state, r.URL.Query().Get("clientId")))

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
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("POST /games", s.newGameHandler)
	mux.HandleFunc("GET /games/{id}", s.gameStateHandler)
	mux.HandleFunc("POST /games/{id}/join", s.joinHandler)
	mux.HandleFunc("POST /games/{id}/moves", s.moveHandler)
	mux.HandleFunc("GET /games/{id}/moves", s.legalMovesHandler)
	mux.HandleFunc("POST /games/{id}/resign", s.resignHandler)
	mux.HandleFunc("POST /games/{id}/draw", s.drawHandler)
	mux.HandleFunc("POST /games/{id}/draw/respond", s.drawResponseHandler)
	mux.HandleFunc("GET /ws/games/{id}", s.wsHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	addr := ":" + port
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
