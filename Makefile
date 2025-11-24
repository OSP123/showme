# Simple Makefile for ShowMe dev workflow

.PHONY: up down logs ps curl-shape

# Start all services in detached mode
up:
	docker compose up -d

# Stop and remove all services, networks, and volumes
down:
	docker compose down -v

# Show status of all services
ps:
	docker compose ps

# Tail logs for all services
logs:
	docker compose logs -f

# Quick check: query Electric shape endpoint
curl-shape:
	curl -s http://localhost:3013/v1/shape || echo "Shape endpoint not responding"
