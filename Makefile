env ?= dev

# Logika wyboru pliku na podstawie zmiennej 'env'
ifeq ($(env), dev)
	ENV_FILE = docker-compose.yml
	ENV_NAME = DEWELOPERSKIE
endif
ifeq ($(env), prod)
	ENV_FILE = docker-compose.prod.yml
	ENV_NAME = PRODUKCYJNE
endif

DC = docker compose -f $(ENV_FILE)


.PHONY: setup
setup: pull build restart info
	@echo "✅ Środowisko $(ENV_NAME) zostało pomyślnie zaktualizowane i uruchomione!"

.PHONY: up
up:
	@echo "🚀 Uruchamianie środowiska Docker..."
	$(DC) up -d

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

info:
	@echo "👉 Aktywne środowisko: $(ENV_NAME) ($(ENV_FILE))"