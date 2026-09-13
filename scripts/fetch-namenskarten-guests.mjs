#!/usr/bin/env node
/**
 * Holt die echte Gästeliste für die Namenskarten direkt per API statt
 * manuell aus sales.ainights.ai abzutippen — Digistore24 (funktioniert)
 * und Eventbrite (optional, siehe unten). Schreibt/aktualisiert nur das
 * `attendees`-Array in scripts/data/namenskarten/<event-slug>.json, die
 * feste `staff`-Crew bleibt unangetastet.
 *
 * Aufruf: node scripts/fetch-namenskarten-guests.mjs <event-slug>
 * Voraussetzung: .env mit DIGISTORE24_API_KEY_READONLY (oder
 * DIGISTORE24_API_KEY) und optional EVENTBRITE_API_KEY im Repo-Root.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/social-kit.mjs';

process.loadEnvFile(path.join(ROOT, '.env'));

const DATA_DIR = path.join(ROOT, 'scripts/data/namenskarten');

async function fetchDigistore24Attendees(productId) {
  const key = process.env.DIGISTORE24_API_KEY_READONLY || process.env.DIGISTORE24_API_KEY;
  if (!key) {
    console.warn('DIGISTORE24_API_KEY(_READONLY) fehlt in .env — Digistore24 wird übersprungen.');
    return [];
  }
  // Weiter Zeitraum, damit auch früh gekaufte Tickets erfasst werden —
  // Digistore24s Default (from=heute) liefert sonst fast nichts.
  const res = await fetch('https://www.digistore24.com/api/call/listPurchases', {
    method: 'POST',
    headers: { 'X-DS-API-KEY': key, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ from: '2024-01-01', to: '2027-12-31', page_size: '500' }),
  });
  const json = await res.json();
  if (json.result !== 'success') {
    throw new Error(`Digistore24-API-Fehler: ${json.message ?? JSON.stringify(json)}`);
  }
  const purchases = json.data.purchase_list.filter(
    (p) => p.main_product_id === String(productId)
      && p.billing_status === 'completed'
      // "Test" ist Digistore24s eigenes Kennzeichen für Testkäufe (z. B.
      // "TEST KAUF", eigene Testbestellungen) — taucht in listPurchases
      // standardmäßig mit auf, anders als im sales.ainights.ai-Dashboard.
      && p.transaction_pay_method !== 'Test',
  );
  const byEmail = new Map();
  for (const p of purchases) {
    byEmail.set(p.buyer.email, {
      firstName: p.buyer.first_name.trim(),
      lastName: p.buyer.last_name.trim(),
      company: '',
    });
  }
  return [...byEmail.values()];
}

async function fetchEventbriteAttendees(eventId) {
  const key = process.env.EVENTBRITE_API_KEY;
  if (!key) return { attendees: [], skipped: 'kein EVENTBRITE_API_KEY in .env' };
  const res = await fetch(`https://www.eventbriteapi.com/v3/events/${eventId}/attendees/`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    const body = await res.text();
    // Häufigste Ursache: in .env liegt der "API Key" (App-Kennung) statt
    // des "Private Token" — nur Letzterer funktioniert als Bearer-Token.
    // Siehe https://www.eventbrite.com/platform/api-keys unter "Private Token".
    return { attendees: [], skipped: `Eventbrite-Auth fehlgeschlagen (${res.status}): ${body.slice(0, 200)} — vermutlich der falsche Schlüsseltyp in .env (Private Token statt API Key nötig)` };
  }
  const json = await res.json();
  const attendees = (json.attendees ?? [])
    .filter((a) => a.status === 'Attending' && a.ticket_class_name !== 'Test Ticket')
    .map((a) => ({
      firstName: (a.profile?.first_name ?? '').trim(),
      lastName: (a.profile?.last_name ?? '').trim(),
      company: (a.profile?.company ?? '').trim(),
    }))
    .filter((a) => a.firstName || a.lastName);
  return { attendees, skipped: null };
}

async function main() {
  const eventSlug = process.argv[2];
  if (!eventSlug) {
    console.error('Aufruf: node scripts/fetch-namenskarten-guests.mjs <event-slug>');
    process.exit(1);
  }

  const event = JSON.parse(await fs.readFile(path.join(ROOT, `src/content/events/${eventSlug}.json`), 'utf8'));
  const platforms = event.platforms ?? {};

  const results = [];

  const dsMatch = platforms.digistore?.match(/\/product\/(\d+)/);
  if (dsMatch) {
    console.log(`Digistore24: Produkt ${dsMatch[1]} …`);
    const attendees = await fetchDigistore24Attendees(dsMatch[1]);
    console.log(`  → ${attendees.length} echte Käufer:innen (Testkäufe rausgefiltert).`);
    results.push(...attendees);
  } else {
    console.log('Kein Digistore24-Produkt für dieses Event hinterlegt — übersprungen.');
  }

  if (platforms.eventbrite) {
    console.log(`Eventbrite: Event ${platforms.eventbrite} …`);
    const { attendees, skipped } = await fetchEventbriteAttendees(platforms.eventbrite);
    if (skipped) {
      console.warn(`  → übersprungen: ${skipped}`);
    } else {
      console.log(`  → ${attendees.length} Teilnehmer:innen.`);
      results.push(...attendees);
    }
  }

  // Über alle Kanäle nach Name deduplizieren (jemand könnte theoretisch auf
  // mehreren Plattformen auftauchen) — Groß-/Kleinschreibung ignorieren.
  const seen = new Map();
  for (const a of results) {
    const key = `${a.firstName.toLowerCase()}|${a.lastName.toLowerCase()}`;
    if (!seen.has(key)) seen.set(key, a);
  }
  const attendees = [...seen.values()];

  const dataPath = path.join(DATA_DIR, `${eventSlug}.json`);
  let existing = { staff: [] };
  try {
    existing = JSON.parse(await fs.readFile(dataPath, 'utf8'));
  } catch {
    // Noch keine Datei — staff bleibt leer, muss dann manuell ergänzt werden.
  }
  existing.attendees = attendees;

  await fs.mkdir(DATA_DIR, { recursive: true });
  // Kompaktes Format (eine Zeile pro Person) statt pretty-printed — bleibt
  // von Hand genauso lesbar/korrigierbar wie beim ursprünglichen Anlegen.
  const personLine = (p) => `{ "firstName": ${JSON.stringify(p.firstName)}, "lastName": ${JSON.stringify(p.lastName)}, "company": ${JSON.stringify(p.company)} }`;
  const out = `{\n  "_comment": ${JSON.stringify(existing._comment ?? '')},\n  "staff": [\n${(existing.staff ?? []).map((p) => `    ${personLine(p)}`).join(',\n')}\n  ],\n  "attendees": [\n${attendees.map((p) => `    ${personLine(p)}`).join(',\n')}\n  ]\n}\n`;
  await fs.writeFile(dataPath, out);
  console.log(`Geschrieben: ${dataPath} (${existing.staff?.length ?? 0} Crew + ${attendees.length} Gäste)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
