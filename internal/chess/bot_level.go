package chess

import "strings"

// BotLevel selects engine strength (approximate ELO).
type BotLevel string

const (
	BotBeginner BotLevel = "beginner" // ~400
	BotCasual   BotLevel = "casual"   // ~800
	BotClub     BotLevel = "club"     // ~1200
	BotStrong   BotLevel = "strong"   // ~1600
)

func ParseBotLevel(s string) BotLevel {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "beginner", "400":
		return BotBeginner
	case "club", "1200":
		return BotClub
	case "strong", "1600":
		return BotStrong
	default:
		return BotCasual
	}
}

func (l BotLevel) Elo() int {
	switch l {
	case BotBeginner:
		return 400
	case BotClub:
		return 1200
	case BotStrong:
		return 1600
	default:
		return 800
	}
}

func (l BotLevel) String() string {
	return string(l)
}

type botConfig struct {
	depth         int
	blunderChance float64 // 0-1 pick suboptimal move
	randomTies    bool
	usePST        bool
}

func (l BotLevel) config() botConfig {
	switch l {
	case BotBeginner:
		return botConfig{depth: 1, blunderChance: 0.25, randomTies: true, usePST: false}
	case BotClub:
		return botConfig{depth: 3, blunderChance: 0.05, randomTies: true, usePST: true}
	case BotStrong:
		return botConfig{depth: 4, blunderChance: 0, randomTies: false, usePST: true}
	default:
		return botConfig{depth: 2, blunderChance: 0.08, randomTies: true, usePST: false}
	}
}
