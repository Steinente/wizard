# Wizard

## Betriebsarten

Das Projekt hat zwei sinnvolle Wege zum Bauen und Ausführen:

1. Lokale Entwicklung (`DEV`)
2. Docker-basierter Betrieb für Test/Prod

Diese Datei ist die zentrale Doku für beide Wege.

## Schnellstart

Für lokale Entwicklung:

```bash
pnpm dev
```

Für Test/Prod per Docker:

```bash
docker compose up -d --build
```

## Entwicklung

Voraussetzungen:

- Node.js und pnpm
- laufende PostgreSQL-Datenbank oder Docker-Postgres
- installierte Abhängigkeiten (`pnpm install`)

### Alles lokal starten

Vom Repo-Root:

```bash
pnpm dev
```

Das startet:

- Server im Watch-Modus
- Client UI per Angular Dev Server

Standardmäßig:

- Client UI: `http://localhost:4200`
- Server: `http://localhost:3000`

### Einzelne Befehle

Nur Client UI:

```bash
pnpm dev:client-ui
```

Nur Server:

```bash
pnpm dev:server
```

### Lokale Datenbank-Migrationen

Neue oder geänderte Migrationen im Dev-Modus anwenden:

```bash
pnpm --filter @wizard/server prisma:migrate
```

Prisma Client neu generieren:

```bash
pnpm --filter @wizard/server prisma:generate
```

## Docker-Betrieb für Test/Prod

Einfachster Start vom Repo-Root:

```bash
docker compose up -d --build
```

Danach ist die App standardmäßig unter `http://localhost:8080` bzw. unter der VM-/Host-IP auf Port `8080` erreichbar.

Stoppen und neu deployen:

```bash
docker compose down
docker compose up -d --build
```

### Wichtige anpassbare Variablen

Die `docker-compose.yml` nutzt sinnvolle Defaults. Du kannst Werte per Shell-Umgebung oder `.env` im Repo überschreiben.
Verwende bewusst die `DOCKER_`-Varianten, damit es keine Kollision mit deiner bestehenden App-`.env` gibt:

- `DOCKER_CLIENT_UI_URL` (Default: `http://localhost:8080`)
- `DOCKER_CLIENT_A11Y_URL` (Default: `http://localhost:8080`)
- `DOCKER_SERVER_PORT` (Default: `3000`)
- `DOCKER_DATABASE_URL` (Default: `postgresql://wizard:wizard@postgres:5432/wizard`)
- `DOCKER_POSTGRES_USER` / `DOCKER_POSTGRES_PASSWORD` / `DOCKER_POSTGRES_DB`
- `DOCKER_HOST_DISCONNECT_TIMEOUT_MS` (Default: `600000`)

Beispiel für LAN:

```bash
DOCKER_CLIENT_UI_URL=http://192.168.178.50:8080 DOCKER_CLIENT_A11Y_URL=http://192.168.178.50:8080 docker compose up -d --build
```

### Hinweise zum Docker-Betrieb

- Der Client verbindet lokal im Dev-Modus weiter zu `http://localhost:3000`.
- Im Docker-Betrieb nutzt der Client die gleiche Origin und Nginx proxyt `/socket.io` intern zum Server.
- Datenbankdaten sind persistent im Volume `postgres_data`.

### Datenbank-Migrationen im Docker-/Deploy-Kontext

Wenn du die Datenbank gezielt aktualisieren willst, ohne einen Dev-Migrate-Lauf zu machen:

```bash
pnpm --filter @wizard/server prisma:deploy
```

Das ist der passende Weg für bestehende Migrationsdateien in Test-/Prod-Umgebungen.

## Builds

Alles bauen:

```bash
pnpm build
```

Nur Client UI bauen:

```bash
pnpm build:client-ui
```

Nur Server bauen:

```bash
pnpm build:server
```

## Empfehlung

- `DEV`: `pnpm dev`
- `Test/Prod`: `docker compose up -d --build`
- DB-Update für bestehende Migrationen: `pnpm --filter @wizard/server prisma:deploy`
