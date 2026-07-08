package chess

import (
	"fmt"
	"strings"
)

// ApplyUCIMove applies a move in UCI notation (e.g. "e2e4", "e7e8q").
func (g *Game) ApplyUCIMove(uci string) error {
	m, err := parseUCIMove(g.current(), strings.TrimSpace(uci))
	if err != nil {
		return fmt.Errorf("chess: %w", err)
	}
	return g.applyLegalMove(m)
}

// ApplySANMove applies a move in standard algebraic notation (e.g. "e4", "Nf3").
func (g *Game) ApplySANMove(san string) error {
	m, err := decodeSAN(g.current(), strings.TrimSpace(san))
	if err != nil {
		return fmt.Errorf("chess: %w", err)
	}
	return g.applyLegalMove(m)
}

// UCIMove converts a Move to UCI notation for the current position.
func (g *Game) UCIMove(m Move) (string, error) {
	if !g.findMove(m) {
		return "", fmt.Errorf("chess: illegal move %s", m.UCI())
	}
	return m.UCI(), nil
}

// SANMove converts a Move to SAN for the current position.
func (g *Game) SANMove(m Move) (string, error) {
	if !g.findMove(m) {
		return "", fmt.Errorf("chess: illegal move %s", m.UCI())
	}
	return encodeSAN(g.current(), m), nil
}

// ParseUCIMove parses UCI notation into a Move for the current position.
func (g *Game) ParseUCIMove(uci string) (Move, error) {
	m, err := parseUCIMove(g.current(), strings.TrimSpace(uci))
	if err != nil {
		return Move{}, fmt.Errorf("chess: %w", err)
	}
	if !g.findMove(m) {
		return Move{}, fmt.Errorf("chess: illegal move %s", uci)
	}
	return m, nil
}

func parseUCIMove(pos Position, uci string) (Move, error) {
	if len(uci) < 4 {
		return Move{}, fmt.Errorf("invalid UCI %q", uci)
	}
	from, err := ParseSquare(uci[0:2])
	if err != nil {
		return Move{}, err
	}
	to, err := ParseSquare(uci[2:4])
	if err != nil {
		return Move{}, err
	}
	promo := NoPieceType
	if len(uci) == 5 {
		switch uci[4] {
		case 'q':
			promo = Queen
		case 'r':
			promo = Rook
		case 'b':
			promo = Bishop
		case 'n':
			promo = Knight
		default:
			return Move{}, fmt.Errorf("invalid promotion %q", uci)
		}
	}
	candidate := Move{From: from, To: to, Promotion: promo}
	for _, lm := range pos.legalMoves() {
		if movesMatch(lm, candidate) {
			return lm, nil
		}
	}
	return Move{}, fmt.Errorf("invalid move %q", uci)
}

func decodeSAN(pos Position, san string) (Move, error) {
	san = strings.TrimSuffix(strings.TrimSuffix(san, "#"), "+")
	for _, m := range pos.legalMoves() {
		if encodeSAN(pos, m) == san {
			return m, nil
		}
	}
	return Move{}, fmt.Errorf("could not decode algebraic notation %s", san)
}

func encodeSAN(pos Position, m Move) string {
	if m.Castle == KingsideCastle {
		return "O-O"
	}
	if m.Castle == QueensideCastle {
		return "O-O-O"
	}
	moving := pos.board[m.From]
	dest := m.To.String()
	prefix := ""
	switch moving.Type {
	case Knight:
		prefix = "N"
	case Bishop:
		prefix = "B"
	case Rook:
		prefix = "R"
	case Queen:
		prefix = "Q"
	case King:
		prefix = "K"
	}
	capture := ""
	if m.Capture || m.EnPassant {
		if moving.Type == Pawn {
			capture = m.From.FileString() + "x"
		} else {
			capture = "x"
		}
	}
	promo := ""
	if m.Promotion != NoPieceType {
		promo = "=" + strings.ToUpper(promotionChar(m.Promotion))
	}
	return prefix + capture + dest + promo
}

// FileString returns the file letter for a square.
func (sq Square) FileString() string {
	return string(rune('a' + sq.File()))
}
