# Docker Deployment (VM)

## Voraussetzung

- Docker Engine + Docker Compose Plugin auf der VM
- Ports freigegeben: `8080` (App), optional `5432` (DB)

## Start (einfachster Weg)

Im Projektordner ausfuehren:

```bash
docker compose up -d --build
```

Danach ist die App unter `http://<VM-IP>:8080` erreichbar.

## Stop / Update

```bash
docker compose down
docker compose up -d --build
```

## Wichtige anpassbare Variablen

Die `docker-compose.yml` nutzt sinnvolle Defaults. Du kannst Werte per Shell-Umgebung oder `.env` im Repo ueberschreiben.
Verwende bewusst die `DOCKER_`-Varianten, damit es keine Kollision mit deiner bestehenden App-`.env` gibt:

- `DOCKER_CLIENT_UI_URL` (Default: `http://localhost:8080`)
- `DOCKER_CLIENT_A11Y_URL` (Default: `http://localhost:8080`)
- `DOCKER_SERVER_PORT` (Default: `3000`)
- `DOCKER_DATABASE_URL` (Default: `postgresql://wizard:wizard@postgres:5432/wizard`)
- `DOCKER_POSTGRES_USER` / `DOCKER_POSTGRES_PASSWORD` / `DOCKER_POSTGRES_DB`
- `DOCKER_HOST_DISCONNECT_TIMEOUT_MS` (Default: `600000`)

Beispiel fuer LAN:

```bash
DOCKER_CLIENT_UI_URL=http://192.168.178.50:8080 DOCKER_CLIENT_A11Y_URL=http://192.168.178.50:8080 docker compose up -d --build
```

## Hinweise

- Der Client verbindet lokal im Dev-Modus weiter zu `http://localhost:3000` (ng serve + server dev).
- Im Docker-Betrieb nutzt der Client die gleiche Origin und Nginx proxyt `/socket.io` intern zum Server.
- Datenbankdaten sind persistent im Volume `postgres_data`.
