package main

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/conan/chessarena/internal/auth"
	"github.com/conan/chessarena/internal/store"
)

type registerRequest struct {
	Username    string `json:"username"`
	Password    string `json:"password"`
	DisplayName string `json:"displayName"`
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type authResponse struct {
	Token string      `json:"token"`
	User  *store.User `json:"user"`
}

func (s *server) registerHandler(w http.ResponseWriter, r *http.Request) {
	if s.store == nil {
		http.Error(w, "accounts unavailable", http.StatusServiceUnavailable)
		return
	}
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	display := strings.TrimSpace(req.DisplayName)
	if display == "" {
		display = req.Username
	}
	id := s.nextID() + s.nextID()
	user, err := s.store.CreateUser(id, req.Username, hash, display)
	if err == store.ErrAlreadyExists {
		http.Error(w, "username already taken — pick a different one", http.StatusConflict)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	token, err := s.auth.IssueToken(user.ID, user.Username)
	if err != nil {
		http.Error(w, "token error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, authResponse{Token: token, User: user})
}

func (s *server) loginHandler(w http.ResponseWriter, r *http.Request) {
	if s.store == nil {
		http.Error(w, "accounts unavailable", http.StatusServiceUnavailable)
		return
	}
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	id, hash, err := s.store.GetUserByUsername(req.Username)
	if err == store.ErrNotFound {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if !auth.CheckPassword(hash, req.Password) {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}
	user, err := s.store.GetUserByID(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	token, err := s.auth.IssueToken(user.ID, user.Username)
	if err != nil {
		http.Error(w, "token error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, authResponse{Token: token, User: user})
}

func (s *server) meHandler(w http.ResponseWriter, r *http.Request) {
	userID := s.userIDFromRequest(r)
	if userID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	user, err := s.store.GetUserByID(userID)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (s *server) updateProfileHandler(w http.ResponseWriter, r *http.Request) {
	userID := s.userIDFromRequest(r)
	if userID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req struct {
		DisplayName string `json:"displayName"`
		AvatarURL   string `json:"avatarUrl"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	user, err := s.store.UpdateProfile(userID, req.DisplayName, req.AvatarURL)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (s *server) searchUsersHandler(w http.ResponseWriter, r *http.Request) {
	userID := s.userIDFromRequest(r)
	if userID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	q := r.URL.Query().Get("q")
	if len(strings.TrimSpace(q)) < 2 {
		writeJSON(w, http.StatusOK, []store.User{})
		return
	}
	users, err := s.store.SearchUsers(q, 20)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, users)
}

func (s *server) getUserHandler(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	user, err := s.store.GetUserByID(id)
	if err == store.ErrNotFound {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (s *server) leaderboardHandler(w http.ResponseWriter, r *http.Request) {
	if s.store == nil {
		http.Error(w, "accounts unavailable", http.StatusServiceUnavailable)
		return
	}
	entries, err := s.store.Leaderboard(50)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if entries == nil {
		entries = []store.LeaderboardEntry{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"leaderboard": entries})
}

func (s *server) userIDFromRequest(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if h == "" {
		return ""
	}
	claims, err := s.auth.ParseToken(h)
	if err != nil {
		return ""
	}
	return claims.UserID
}

func (s *server) playerIDForGame(r *http.Request, fallback string) string {
	if uid := s.userIDFromRequest(r); uid != "" {
		return uid
	}
	return fallback
}
