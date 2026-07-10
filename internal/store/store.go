package store

import (
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

var (
	ErrNotFound      = errors.New("not found")
	ErrAlreadyExists = errors.New("already exists")
	ErrNotFriends    = errors.New("not friends")
)

type User struct {
	ID          string    `json:"id"`
	Username    string    `json:"username"`
	DisplayName string    `json:"displayName"`
	AvatarURL   string    `json:"avatarUrl,omitempty"`
	EloRating   int       `json:"eloRating"`
	CreatedAt   time.Time `json:"createdAt"`
}

type FriendRequest struct {
	ID        string    `json:"id"`
	FromID    string    `json:"fromId"`
	FromName  string    `json:"fromUsername"`
	ToID      string    `json:"toId"`
	ToName    string    `json:"toUsername"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
}

type Friend struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	EloRating   int    `json:"eloRating"`
}

type Challenge struct {
	ID           string    `json:"id"`
	ChallengerID string    `json:"challengerId"`
	OpponentID   string    `json:"opponentId"`
	GameID       string    `json:"gameId"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"createdAt"`
}

type Store struct {
	db *sql.DB
}

func Open(path string) (*Store, error) {
	if path == "" {
		path = "chessarena.db"
	}
	if dir := filepath.Dir(path); dir != "." && dir != "" {
		_ = os.MkdirAll(dir, 0o755)
	}
	db, err := sql.Open("sqlite", path+"?_pragma=foreign_keys(1)")
	if err != nil {
		return nil, err
	}
	s := &Store{db: db}
	if err := s.migrate(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return s, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) migrate() error {
	schema := `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT DEFAULT '',
  elo_rating INTEGER NOT NULL DEFAULT 1200,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS friend_requests (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL REFERENCES users(id),
  to_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  UNIQUE(from_id, to_id)
);
CREATE TABLE IF NOT EXISTS friendships (
  user_a TEXT NOT NULL REFERENCES users(id),
  user_b TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_a, user_b)
);
CREATE TABLE IF NOT EXISTS friend_challenges (
  id TEXT PRIMARY KEY,
  challenger_id TEXT NOT NULL REFERENCES users(id),
  opponent_id TEXT NOT NULL REFERENCES users(id),
  game_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);
`
	_, err := s.db.Exec(schema)
	return err
}

func (s *Store) CreateUser(id, username, passwordHash, displayName string) (*User, error) {
	username = strings.TrimSpace(username)
	if username == "" {
		return nil, fmt.Errorf("username cannot be empty")
	}
	if len(username) > 32 {
		return nil, fmt.Errorf("username must be at most 32 characters")
	}
	displayName = strings.TrimSpace(displayName)
	if displayName == "" {
		displayName = username
	}
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := s.db.Exec(
		`INSERT INTO users (id, username, password_hash, display_name, created_at) VALUES (?, ?, ?, ?, ?)`,
		id, username, passwordHash, displayName, now,
	)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			return nil, ErrAlreadyExists
		}
		return nil, err
	}
	return s.GetUserByID(id)
}

func (s *Store) GetUserByUsername(username string) (id, passwordHash string, err error) {
	err = s.db.QueryRow(`SELECT id, password_hash FROM users WHERE username = ? COLLATE NOCASE`, username).Scan(&id, &passwordHash)
	if errors.Is(err, sql.ErrNoRows) {
		return "", "", ErrNotFound
	}
	return id, passwordHash, err
}

func (s *Store) GetUserByID(id string) (*User, error) {
	u := &User{}
	var created string
	err := s.db.QueryRow(
		`SELECT id, username, display_name, avatar_url, elo_rating, created_at FROM users WHERE id = ?`,
		id,
	).Scan(&u.ID, &u.Username, &u.DisplayName, &u.AvatarURL, &u.EloRating, &created)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	u.CreatedAt, _ = time.Parse(time.RFC3339, created)
	return u, nil
}

func (s *Store) UpdateProfile(id, displayName, avatarURL string) (*User, error) {
	_, err := s.db.Exec(`UPDATE users SET display_name = ?, avatar_url = ? WHERE id = ?`, displayName, avatarURL, id)
	if err != nil {
		return nil, err
	}
	return s.GetUserByID(id)
}

func (s *Store) SearchUsers(query string, limit int) ([]User, error) {
	if limit <= 0 {
		limit = 20
	}
	q := "%" + strings.TrimSpace(query) + "%"
	rows, err := s.db.Query(
		`SELECT id, username, display_name, avatar_url, elo_rating, created_at FROM users WHERE username LIKE ? COLLATE NOCASE LIMIT ?`,
		q, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []User
	for rows.Next() {
		var u User
		var created string
		if err := rows.Scan(&u.ID, &u.Username, &u.DisplayName, &u.AvatarURL, &u.EloRating, &created); err != nil {
			return nil, err
		}
		u.CreatedAt, _ = time.Parse(time.RFC3339, created)
		out = append(out, u)
	}
	return out, rows.Err()
}

func (s *Store) CreateFriendRequest(id, fromID, toID string) error {
	if fromID == toID {
		return fmt.Errorf("cannot friend yourself")
	}
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := s.db.Exec(
		`INSERT INTO friend_requests (id, from_id, to_id, status, created_at) VALUES (?, ?, ?, 'pending', ?)`,
		id, fromID, toID, now,
	)
	if err != nil && strings.Contains(err.Error(), "UNIQUE") {
		return ErrAlreadyExists
	}
	return err
}

func (s *Store) RespondFriendRequest(requestID, userID string, accept bool) error {
	var fromID, toID, status string
	err := s.db.QueryRow(`SELECT from_id, to_id, status FROM friend_requests WHERE id = ?`, requestID).
		Scan(&fromID, &toID, &status)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if userID != toID {
		return fmt.Errorf("not authorized")
	}
	if status != "pending" {
		return fmt.Errorf("request already handled")
	}
	newStatus := "declined"
	if accept {
		newStatus = "accepted"
	}
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`UPDATE friend_requests SET status = ? WHERE id = ?`, newStatus, requestID); err != nil {
		return err
	}
	if accept {
		a, b := canonicalPair(fromID, toID)
		now := time.Now().UTC().Format(time.RFC3339)
		if _, err := tx.Exec(`INSERT OR IGNORE INTO friendships (user_a, user_b, created_at) VALUES (?, ?, ?)`, a, b, now); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func canonicalPair(a, b string) (string, string) {
	if a < b {
		return a, b
	}
	return b, a
}

func (s *Store) ListFriends(userID string) ([]Friend, error) {
	rows, err := s.db.Query(`
SELECT u.id, u.username, u.display_name, u.elo_rating
FROM friendships f
JOIN users u ON u.id = CASE WHEN f.user_a = ? THEN f.user_b ELSE f.user_a END
WHERE f.user_a = ? OR f.user_b = ?`, userID, userID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Friend
	for rows.Next() {
		var f Friend
		if err := rows.Scan(&f.ID, &f.Username, &f.DisplayName, &f.EloRating); err != nil {
			return nil, err
		}
		if f.ID == userID {
			continue
		}
		out = append(out, f)
	}
	return out, rows.Err()
}

func (s *Store) PendingRequests(userID string) ([]FriendRequest, error) {
	rows, err := s.db.Query(`
SELECT fr.id, fr.from_id, fu.username, fr.to_id, tu.username, fr.status, fr.created_at
FROM friend_requests fr
JOIN users fu ON fu.id = fr.from_id
JOIN users tu ON tu.id = fr.to_id
WHERE fr.to_id = ? AND fr.status = 'pending'`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanRequests(rows)
}

func scanRequests(rows *sql.Rows) ([]FriendRequest, error) {
	var out []FriendRequest
	for rows.Next() {
		var r FriendRequest
		var created string
		if err := rows.Scan(&r.ID, &r.FromID, &r.FromName, &r.ToID, &r.ToName, &r.Status, &created); err != nil {
			return nil, err
		}
		r.CreatedAt, _ = time.Parse(time.RFC3339, created)
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *Store) AreFriends(a, b string) (bool, error) {
	x, y := canonicalPair(a, b)
	var n int
	err := s.db.QueryRow(`SELECT COUNT(1) FROM friendships WHERE user_a = ? AND user_b = ?`, x, y).Scan(&n)
	return n > 0, err
}

func (s *Store) CreateChallenge(id, challengerID, opponentID, gameID string) (*Challenge, error) {
	ok, err := s.AreFriends(challengerID, opponentID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrNotFriends
	}
	now := time.Now().UTC().Format(time.RFC3339)
	_, err = s.db.Exec(
		`INSERT INTO friend_challenges (id, challenger_id, opponent_id, game_id, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)`,
		id, challengerID, opponentID, gameID, now,
	)
	if err != nil {
		return nil, err
	}
	return &Challenge{ID: id, ChallengerID: challengerID, OpponentID: opponentID, GameID: gameID, Status: "pending", CreatedAt: time.Now().UTC()}, nil
}

func (s *Store) GetChallenge(id string) (*Challenge, error) {
	c := &Challenge{}
	var created string
	err := s.db.QueryRow(
		`SELECT id, challenger_id, opponent_id, game_id, status, created_at FROM friend_challenges WHERE id = ?`,
		id,
	).Scan(&c.ID, &c.ChallengerID, &c.OpponentID, &c.GameID, &c.Status, &created)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	c.CreatedAt, _ = time.Parse(time.RFC3339, created)
	return c, nil
}

func (s *Store) UpdateChallengeStatus(id, status string) error {
	res, err := s.db.Exec(`UPDATE friend_challenges SET status = ? WHERE id = ?`, status, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) PendingChallengesFor(userID string) ([]Challenge, error) {
	rows, err := s.db.Query(
		`SELECT id, challenger_id, opponent_id, game_id, status, created_at FROM friend_challenges WHERE opponent_id = ? AND status = 'pending'`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Challenge
	for rows.Next() {
		var c Challenge
		var created string
		if err := rows.Scan(&c.ID, &c.ChallengerID, &c.OpponentID, &c.GameID, &c.Status, &created); err != nil {
			return nil, err
		}
		c.CreatedAt, _ = time.Parse(time.RFC3339, created)
		out = append(out, c)
	}
	return out, rows.Err()
}

type LeaderboardEntry struct {
	Rank        int    `json:"rank"`
	ID          string `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	EloRating   int    `json:"eloRating"`
}

func (s *Store) Leaderboard(limit int) ([]LeaderboardEntry, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.db.Query(
		`SELECT id, username, display_name, elo_rating FROM users ORDER BY elo_rating DESC, username ASC LIMIT ?`,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []LeaderboardEntry
	rank := 0
	for rows.Next() {
		rank++
		var e LeaderboardEntry
		if err := rows.Scan(&e.ID, &e.Username, &e.DisplayName, &e.EloRating); err != nil {
			return nil, err
		}
		e.Rank = rank
		out = append(out, e)
	}
	return out, rows.Err()
}

func (s *Store) SetElo(userID string, elo int) error {
	if elo < 100 {
		elo = 100
	}
	res, err := s.db.Exec(`UPDATE users SET elo_rating = ? WHERE id = ?`, elo, userID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}
