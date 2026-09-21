# Deployment via Laravel Forge

Astro Static Site → gebautes `dist/` wird von nginx über Forge serviert. Gleicher Aufbau wie die Schwester-Repos (axdnwebsite, agenticnuremberg).

## Forge Site anlegen

1. **New Site** in Forge
   - **Root Domain**: `ainights.ai`
   - **Aliases**: `www.ainights.ai` (Forge-Default-Domain bleibt zusätzlich aktiv)
   - **Project Type**: `Static HTML`
   - **Web Directory**: `/dist`  ← wichtig: nicht `/public`
   - **PHP Version**: irrelevant (Static), Default lassen

2. **Git Repository verbinden**
   - Provider: GitHub
   - Repository: `andreaspabst/ainightsweb`
   - Branch: `master`
   - „Install Composer Dependencies" **deaktivieren**

3. **Deploy Script** (Forge → Site → Deployment → Edit Script):

```bash
cd $FORGE_SITE_PATH

git pull origin $FORGE_SITE_BRANCH

# Node 22 muss systemweit installiert sein (siehe „Server-Voraussetzungen")
/usr/bin/npm ci --no-audit --no-fund
/usr/bin/npm run build

# nginx reload macht Forge nach dem Deploy automatisch
```

4. **Quick Deploy aktivieren** (Push auf master → Auto-Deploy)

5. **SSL** einrichten (Forge → Site → SSL → LetsEncrypt), `ainights.ai` und `www.ainights.ai` gemeinsam.

## nginx Anpassung (Site → Nginx Configuration)

Weil `/dist` als Web-Root dient, funktioniert Static-HTML von Haus aus. Die Site nutzt `trailingSlash: 'always'` + `build.format: 'directory'`, jede Seite liegt also als `pfad/index.html` vor.

```nginx
# Verzeichnis-URLs mit / bedienen; sonst 404
location / {
    try_files $uri $uri/ $uri/index.html =404;
}

# Custom 404-Seite (Astro baut src/pages/404.astro immer flach nach dist/404.html)
error_page 404 /404.html;

# Cache-Header für Astro-Assets
location /_astro/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;
}

# www + on-forge → ainights.ai (kanonische Domain)
if ($host = www.ainights.ai) {
    return 301 https://ainights.ai$request_uri;
}
```

### Wichtig: alte WordPress-URLs

Die neue Site bildet die bestehenden URLs 1:1 ab (inkl. trailing slash, `/de/`, `/en/`, `/speaker/…`, `/sessions/…` usw.). Es sind daher normalerweise **keine** zusätzlichen Redirects nötig. Sollte doch eine URL wegfallen, hier einen `301` ergänzen. Der Root `/` leitet auf `/de/` (Default-Sprache).

## DNS

| Host             | Type | Wert                |
| ---------------- | ---- | ------------------- |
| `ainights.ai`    | A    | `<forge-server-ip>` |
| `www.ainights.ai`| A    | `<forge-server-ip>` |

## Server-Voraussetzungen

Node 22 **systemweit** installieren (einmalig via SSH als `forge`-User). NVM funktioniert in Forge-Deploy-Shells nicht zuverlässig.

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v      # → v22.x
which npm    # → /usr/bin/npm
```

## Erwartetes Ergebnis

- Push auf `master` → Forge zieht, baut mit `npm run build`, serviert `dist/`
- `ainights.ai` via HTTPS erreichbar, alle alten URLs funktionieren weiter
- `www.ainights.ai` → 301 auf `https://ainights.ai`

## Medien auf Cloudflare R2 (media.ainights.ai)

Bilder, Videos und generierte Karten liegen in einem R2-Bucket (`ainights-media`, Custom Domain `media.ainights.ai`, Cache über Cloudflare). Der Pfad ist 1:1 wie bisher — `public/wp-content/uploads/…` ↔ `https://media.ainights.ai/wp-content/uploads/…`.

- **Nicht im Repo:** `public/wp-content/uploads/`, `public/img/` und `public/media/` (außer `namenskarten/`) sind gitignored. Auf einer frischen Maschine: `npm run media:pull` (holt fehlende Dateien laut `src/data/media-manifest.json`, ohne Zugangsdaten).
- **Hochladen:** `npm run media:push` (= `node scripts/r2-sync.mjs`; überspringt vorhandene Dateien; `--only <prefix>`, `--dry-run`). Braucht in `.env` `CLOUDFLARE_API_TOKEN` (R2 Edit) und `CLOUDFLARE_ACCOUNT_ID`. Nach jedem neuen Bild/jeder erzeugten Karte ausführen und `src/data/media-manifest.json` committen — Seiten fragen damit ab, ob eine Datei existiert (`src/lib/media.ts`), und der CI-Link-Check (`scripts/check-links.mjs`) prüft alle Medien-URLs dagegen. Ein Deploy ist zum Veröffentlichen von Medien nicht nötig.
- **Build:** `scripts/postbuild.mjs` schreibt im Produktions-Build alle Medien-URLs auf `media.ainights.ai` um. Ausnahme: `/media/namenskarten/` (Gästenamen) bleibt auf `ainights.ai`. Lokal mit Dateien auf der Platte: `MEDIA_LOCAL=1 npm run build`. Die Speaker-Announcement-Grafiken werden **nicht mehr im Build** erzeugt: nach Speaker-Änderungen `node scripts/generate-speaker-announcements.mjs` und `npm run media:push`.
- **Alte URLs (301):** Google und Social-Media-Vorschauen kennen noch `https://ainights.ai/wp-content/uploads/…`, `/img/…`, `/media/…`. Diese Pfade leitet nginx (Forge → Site → Domains → Edit Nginx configuration → General site configuration) per 301 auf den Bucket:

```nginx
# Namenskarten bleiben lokal (Datenschutz)
location ^~ /media/namenskarten/ { try_files $uri =404; }
# Medien-Pfade: lokal ausliefern, falls vorhanden — sonst 301 auf den Bucket
location ~ ^/(wp-content/uploads|img|media)/ { try_files $uri @r2media; }
location @r2media { return 301 https://media.ainights.ai$request_uri; }
```

- **CORS:** Der Bucket erlaubt GET/HEAD von `https://ainights.ai` (und `localhost:4321`), damit Browser-`fetch`/Canvas auf Medien funktionieren. Bilder in `<img>` brauchen das nicht.
- **Achtung Download-Links:** Das `download`-Attribut wirkt nicht über Domaingrenzen — ein `<a download>` auf ein Medium öffnet es dann statt es zu speichern.

### Wichtig: alte WordPress-URLs

Die neue Site bildet die bestehenden URLs 1:1 ab (inkl. trailing slash, `/de/`, `/en/`, `/speaker/…`, `/sessions/…` usw.). Es sind daher normalerweise **keine** zusätzlichen Redirects nötig. Sollte doch eine URL wegfallen, hier einen `301` ergänzen. Der Root `/` leitet auf `/de/` (Default-Sprache).

## DNS

| Host             | Type | Wert                |
| ---------------- | ---- | ------------------- |
| `ainights.ai`    | A    | `<forge-server-ip>` |
| `www.ainights.ai`| A    | `<forge-server-ip>` |

## Server-Voraussetzungen

Node 22 **systemweit** installieren (einmalig via SSH als `forge`-User). NVM funktioniert in Forge-Deploy-Shells nicht zuverlässig.

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v      # → v22.x
which npm    # → /usr/bin/npm
```

## Erwartetes Ergebnis

- Push auf `master` → Forge zieht, baut mit `npm run build`, serviert `dist/`
- `ainights.ai` via HTTPS erreichbar, alle alten URLs funktionieren weiter
- `www.ainights.ai` → 301 auf `https://ainights.ai`

## Medien auf Cloudflare R2 (media.ainights.ai)

Bilder, Videos und generierte Karten liegen in einem R2-Bucket (`ainights-media`, Custom Domain `media.ainights.ai`, Cache über Cloudflare). Der Pfad ist 1:1 wie bisher — `public/wp-content/uploads/…` ↔ `https://media.ainights.ai/wp-content/uploads/…`.

- **Hochladen:** `node scripts/r2-sync.mjs` (überspringt vorhandene Dateien; `--only <prefix>`, `--dry-run`). Braucht in `.env` `CLOUDFLARE_API_TOKEN` (R2 Edit) und `CLOUDFLARE_ACCOUNT_ID`. Nach jedem neuen Bild/Karte ausführen, **bevor** deployt wird.
- **Build:** `scripts/postbuild.mjs` schreibt im Produktions-Build alle Medien-URLs auf `media.ainights.ai` um. Ausnahme: `/media/namenskarten/` (Gästenamen) bleibt auf `ainights.ai`. Lokal ohne Bucket: `MEDIA_LOCAL=1 npm run build`.
- **Alte URLs (301):** Solange die Dateien noch in `public/` liegen, werden sie lokal ausgeliefert. Für Dateien, die nur noch im Bucket liegen, in der nginx-Konfiguration (Forge → Site → Nginx Configuration) ergänzen:

```nginx
# Namenskarten bleiben lokal (Datenschutz)
location ^~ /media/namenskarten/ {
    try_files $uri =404;
}

# Medien-Pfade: lokal ausliefern, falls vorhanden — sonst 301 auf den Bucket
location ~ ^/(wp-content/uploads|img|media)/ {
    try_files $uri @r2media;
}
location @r2media {
    return 301 https://media.ainights.ai$request_uri;
}
```

## Zusatzdomains und Sprachweiche (nginx, in Forge eingetragen)

Hauptdomain bleibt **ainights.ai**. `ai-nights.com`, `ai-nights.de` und `ainights.de` (jeweils + `www.`) sind in Forge als Domains der Site angelegt (DNS bei Hetzner, A-Record auf den Forge-Server, eigenes Let's-Encrypt-Zertifikat je Domain) und leiten per 301 mit Pfad und Query auf `https://ainights.ai` weiter. `www.<alias>` geht zuerst per Forge-Standardregel auf `<alias>` und von dort auf `.ai` (zwei Hops).

Ergänzt in Forge → Site → Domains → „Edit Nginx configuration“ → **General site configuration** (am Ende):

```nginx
# Zusatzdomains -> Hauptdomain ainights.ai (301, Pfad bleibt erhalten)
if ($host ~* "^(www\.)?(ai-nights\.(com|de)|ainights\.de)$") { return 301 https://ainights.ai$request_uri; }
# Startseite: Sprache aus Accept-Language (de -> /de/, sonst /en/)
location = / { add_header Vary Accept-Language always; set $ain_home /de/; if ($http_accept_language ~* "^\s*(?!de)[a-z]{2}") { set $ain_home /en/; } return 302 $ain_home; }
```

- `/` leitet per **302** (nicht 301, weil sprachabhängig) auf `/de/` oder `/en/`. Ohne oder mit unbekanntem `Accept-Language` (Crawler) gilt Deutsch. Die Meta-Refresh-Seite aus `astro.config.mjs` (`'/': '/de/'`) bleibt nur als Fallback im Build.
- Zertifikate erneuern sich über Forge automatisch (Let's Encrypt, ~30 Tage vor Ablauf).
