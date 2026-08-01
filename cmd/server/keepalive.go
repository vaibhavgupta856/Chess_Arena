package main

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// startSelfKeepAlive pings this service's public URL on an interval so Render's
// free tier does not spin down after 15 minutes of no inbound traffic.
// RENDER_EXTERNAL_URL is set automatically on Render.
func startSelfKeepAlive() {
	base := strings.TrimRight(os.Getenv("RENDER_EXTERNAL_URL"), "/")
	if base == "" {
		return
	}
	url := base + "/health"
	interval := 10 * time.Minute
	client := &http.Client{Timeout: 20 * time.Second}

	go func() {
		// First ping shortly after boot so deploys stay warm.
		time.Sleep(30 * time.Second)
		ping := func() {
			resp, err := client.Get(url)
			if err != nil {
				log.Printf("keepalive ping failed: %v", err)
				return
			}
			_ = resp.Body.Close()
		}
		ping()
		t := time.NewTicker(interval)
		defer t.Stop()
		for range t.C {
			ping()
		}
	}()
	log.Printf("keepalive enabled → %s every %s", url, interval)
}
