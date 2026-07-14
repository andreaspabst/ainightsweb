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
