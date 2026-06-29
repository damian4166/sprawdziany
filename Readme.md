# Sprawdziany Online

Aplikacja quiz live z WebSocket, obsługą pytań ABCD i wysyłaniem wyników mailowo.

## Konfiguracja

### Serwer SMTP

Aplikacja używa MailPita do testowania lokalnie i własnego serwera SMTP w produkcji.

#### Lokalnie (Docker Compose)

MailPit jest automatycznie uruchomiony z `docker compose up`:
- **SMTP**: `mailpit:1025` (bez autoryzacji)
- **Web UI**: http://localhost:8025 — zobacz wysłane maile

#### W produkcji

Skonfiguruj zmienne środowiskowe przed deploymentem (np. w `.env.prod`):

```bash
SMTP_HOST=mail.example.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=user@example.com
SMTP_PASS=password
SMTP_FROM=sprawdziany@example.com
```

## Uruchomienie

### Lokalnie

```bash
cd next
npm install
npm run dev   # Dla developmentu (http://localhost:3000)
```

### Docker Compose

```bash
# Dla developmentu (z MailPit)
docker compose up

# Dla produkcji (z Traefik)
docker compose -f docker-compose.prod.yml up
```

### Makefile

```bash
make help              # Pokaż dostępne komendy
make env=dev up        # Uruchom dev
make env=prod setup    # Setup produkcji (git pull + build + restart)
make env=prod logs     # Pokaż logi
make env=prod down     # Zatrzymaj
```

## Wdrażanie na VPS (GitHub Actions)

### Setup na serwerze

1. SSH na serwer VPS
2. Stwórz folder projektu:
   ```bash
   mkdir -p /app/sprawdziany
   cd /app/sprawdziany
   ```

3. Stwórz sieć Traefik (jeśli jeszcze jej nie ma):
   ```bash
   docker network create proxy
   ```

4. Zainicjuj git repo:
   ```bash
   git clone <repo-url> .
   ```

5. Stwórz `.env.prod` z konfiguracją SMTP:
   ```bash
   cat > .env.prod << 'EOF'
   SMTP_HOST=mail.example.com
   SMTP_PORT=587
   SMTP_SECURE=true
   SMTP_USER=user@example.com
   SMTP_PASS=password
   SMTP_FROM=sprawdziany@example.com
   EOF
   ```

### GitHub Actions (automatyczne)

Przy każdym pushu na `main`:
1. GitHub Actions SSH do VPS
2. Uruchomi `make setup env=prod`
3. Aplikacja zostaje zbudowana i uruchomiona

**Wymagane sekrety GitHub** (Settings → Secrets):
- `VPS_HOST` — adres IP/domena serwera
- `VPS_USERNAME` — użytkownik SSH (np. `root`)
- `VPS_SSH_PRIVATE_KEY` — prywatny klucz SSH

### Monitorowanie deploymentu

```bash
# Na VPS sprawdź logi
make env=prod logs

# Lub bezpośrednio
docker logs sprawdziany
```

## Dane logowania nauczyciela

- Login: `test`
- Hasło: `test`

## Struktura projektu

```
sprawdziany/
├── next/               # Aplikacja Next.js
│   ├── app/           # React components
│   ├── lib/           # Utilities (quiz-state, auth)
│   ├── public/        # Static files
│   ├── data/          # Quiz data (JSON)
│   ├── server.js      # WebSocket server
│   ├── Dockerfile     # Container image
│   └── package.json
├── docker-compose.yml # Dev (z MailPit)
├── docker-compose.prod.yml # Prod (z Traefik)
├── Makefile           # Build automation
└── .github/workflows/deploy.yml # GitHub Actions
```
