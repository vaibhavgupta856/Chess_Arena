package main

import (
	"encoding/json"
	"net/http"

	"github.com/conan/chessarena/internal/chess"
)

func (s *server) coachHintHandler(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	session, ok := s.getSession(id)
	if !ok {
		http.Error(w, "game not found", http.StatusNotFound)
		return
	}
	if session.mode != "bot" && session.mode != "local" {
		http.Error(w, "coach only in bot or local games", http.StatusForbidden)
		return
	}
	hint, ok := chess.HintForPosition(session.game)
	if !ok {
		http.Error(w, "no hint available", http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, hint)
}

func (s *server) coachAnalyzeHandler(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	session, ok := s.getSession(id)
	if !ok {
		http.Error(w, "game not found", http.StatusNotFound)
		return
	}
	if session.mode != "bot" && session.mode != "local" {
		http.Error(w, "coach only in bot or local games", http.StatusForbidden)
		return
	}
	var req struct {
		Type string `json:"type"` // last_move | threats
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	if req.Type == "threats" {
		writeJSON(w, http.StatusOK, map[string]string{
			"explanation": chess.ThreatSummary(session.game),
		})
		return
	}

	analysis, ok := chess.AnalyzeLastMove(session.game)
	if !ok {
		writeJSON(w, http.StatusOK, map[string]string{
			"label":       "good",
			"explanation": chess.ThreatSummary(session.game),
		})
		return
	}
	writeJSON(w, http.StatusOK, analysis)
}
