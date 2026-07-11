package main

import (
	"encoding/json"
	"net/http"

	"github.com/conan/chessarena/internal/store"
)

func (s *server) friendRequestHandler(w http.ResponseWriter, r *http.Request) {
	userID := s.userIDFromRequest(r)
	if userID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req struct {
		ToUserID string `json:"toUserId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ToUserID == "" {
		http.Error(w, "toUserId required", http.StatusBadRequest)
		return
	}
	id := s.nextID()
	if err := s.store.CreateFriendRequest(id, userID, req.ToUserID); err == store.ErrAlreadyExists {
		http.Error(w, "request already sent", http.StatusConflict)
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"id": id, "status": "pending"})
}

func (s *server) friendRespondHandler(w http.ResponseWriter, r *http.Request) {
	userID := s.userIDFromRequest(r)
	if userID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req struct {
		RequestID string `json:"requestId"`
		Accept    bool   `json:"accept"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.RequestID == "" {
		http.Error(w, "requestId required", http.StatusBadRequest)
		return
	}
	if err := s.store.RespondFriendRequest(req.RequestID, userID, req.Accept); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *server) friendsListHandler(w http.ResponseWriter, r *http.Request) {
	userID := s.userIDFromRequest(r)
	if userID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	friends, err := s.store.ListFriends(userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	requests, err := s.store.PendingRequests(userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	challenges, err := s.store.PendingChallengesFor(userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"friends":    friends,
		"requests":   requests,
		"challenges": challenges,
	})
}

func (s *server) friendChallengeHandler(w http.ResponseWriter, r *http.Request) {
	userID := s.userIDFromRequest(r)
	if userID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req struct {
		OpponentID string `json:"opponentId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.OpponentID == "" {
		http.Error(w, "opponentId required", http.StatusBadRequest)
		return
	}

	gameID := s.nextID()
	session := newSession(gameID, "online", "white", userID, "")
	s.mu.Lock()
	s.sessions[gameID] = session
	s.mu.Unlock()

	challengeID := s.nextID()
	ch, err := s.store.CreateChallenge(challengeID, userID, req.OpponentID, gameID)
	if err == store.ErrNotFriends {
		http.Error(w, "not friends", http.StatusForbidden)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"challenge": ch,
		"gameId":    gameID,
		"game":      s.encodeState(session, userID),
	})
}

func (s *server) acceptChallengeHandler(w http.ResponseWriter, r *http.Request) {
	userID := s.userIDFromRequest(r)
	if userID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	challengeID := r.PathValue("id")
	ch, err := s.store.GetChallenge(challengeID)
	if err == store.ErrNotFound {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if ch.OpponentID != userID {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	session, ok := s.getSession(ch.GameID)
	if !ok {
		http.Error(w, "game not found", http.StatusNotFound)
		return
	}
	session.mu.Lock()
	session.blackPlayer = userID
	session.mu.Unlock()
	_ = s.store.UpdateChallengeStatus(challengeID, "accepted")
	s.broadcast(ch.GameID)
	state := s.encodeState(session, userID)
	state.YourColor = "black"
	writeJSON(w, http.StatusOK, state)
}

func (s *server) declineChallengeHandler(w http.ResponseWriter, r *http.Request) {
	userID := s.userIDFromRequest(r)
	if userID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	challengeID := r.PathValue("id")
	ch, err := s.store.GetChallenge(challengeID)
	if err == store.ErrNotFound {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if ch.OpponentID != userID {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	if err := s.store.UpdateChallengeStatus(challengeID, "declined"); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "declined"})
}
