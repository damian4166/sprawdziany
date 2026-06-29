env ?= dev

# Logika wyboru pliku na podstawie zmiennej 'env'
ifeq ($(env), dev)
	ENV_FILE = docker-compose.yml
	ENV_NAME = DEWELOPERSKIE
	ENV_VARS =
endif
ifeq ($(env), prod)
	ENV_FILE = docker-compose.prod.yml
	ENV_NAME = PRODUKCYJNE
	# Czytaj .env.prod TYLKO jeśli istnieje
	ENV_VARS = $(if $(wildcard .env.prod),--env-file .env.prod,)
endif

DC = docker compose $(ENV_VARS) -f $(ENV_FILE)

.PHONY: help
help:
	@echo "Dostępne komendy:"
	@echo "  make up        - uruchom kontenery"
	@echo "  make down      - zatrzymaj kontenery"
	@echo "  make build     - zbuduj obrazy"
	@echo "  make restart   - restart kontenerów"
	@echo "  make logs      - pokaż logi"
	@echo "  make info      - pokaż aktywne środowisko"
	@echo "  make setup     - zaktualizuj, zbuduj i uruchom"

.PHONY: setup
setup: pull build restart info
	@echo "✅ Środowisko $(ENV_NAME) zostało pomyślnie zaktualizowane i uruchomione!"

.PHONY: up
up:
	@echo "🚀 Uruchamianie środowiska Docker..."
	$(DC) up -d --build

.PHONY: down
down:
	@echo "🛑 Zatrzymywanie kontenerów..."
	$(DC) down --remove-orphans

.PHONY: build
build:
	@echo "🔨 Budowanie projektu..."
	$(DC) build

.PHONY: restart
restart: down up
	@echo "🔄 Restart kontenerów docker zakończony!"

.PHONY: pull
pull:
	@echo "📥 Pobieranie aktualizacji..."
	git pull

.PHONY: logs
logs:
	@echo "📋 Logi kontenerów..."
	$(DC) logs -f

.PHONY: info
info:
	@echo "👉 Aktywne środowisko: $(ENV_NAME) ($(ENV_FILE))"