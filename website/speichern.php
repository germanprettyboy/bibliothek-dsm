<?php
/*
 * Direkt veröffentlichen: Die Verwaltung (admin.html) schickt books.js, empfehlungen.js oder info.js hierher,
 * die Datei wird sofort im Website-Ordner ersetzt. Einzige Server-Datei der Website, ohne Datenbank, ab PHP 7.1.
 *
 *   GET  speichern.php                 → {"dsm":"speichern","bereit":true|false,"grund"?}
 *   POST speichern.php?datei=info.js   Kopfzeile X-DSM-Schluessel, Inhalt = fertige Datei → {"ok":true,…}
 *
 * Schutz: Der Schlüssel wird aus dem Admin-Passwort abgeleitet und steckt nur in der verschlüsselten Verwaltung
 * (assets/admin.enc.js). Hier liegt nur sein SHA-256 (speichern-zugang.php, erzeugt von werkzeuge/admin-verschluesseln.js).
 * Angenommen werden nur die drei Dateinamen, und nur in genau dem Format, das die Verwaltung erzeugt:
 * feste Kopfzeile, „window.DSM_… = “, ein JSON-Objekt, „;“ – fremder JavaScript-Code kommt so nicht durch.
 * Vor jedem Schreiben wandert die alte Fassung nach sicherung/ (je Datei die letzten 10).
 */
declare(strict_types=1);
date_default_timezone_set('Europe/Rome'); // Namen der Sicherungen in Ortszeit

const DSM_DATEIEN = [
  'books.js' => ["/* Bücherliste der Bibliothek der Deutschen Schule Mailand. Erzeugt mit admin.html – nicht von Hand bearbeiten. */\nwindow.DSM_BIBLIOTHEK = ", 'buecher'],
  'empfehlungen.js' => ["/* Buchempfehlungen der Bibliothek der Deutschen Schule Mailand. Gepflegt über admin.html – nicht von Hand bearbeiten. */\nwindow.DSM_EMPFEHLUNGEN = ", 'gruppen'],
  'info.js' => ["/* Öffnungszeiten, Ferien und Abwesenheiten der Bibliothek der Deutschen Schule Mailand. Gepflegt über admin.html – nicht von Hand bearbeiten. */\nwindow.DSM_INFO = ", 'zeiten'],
];
const DSM_MAX = 8 * 1024 * 1024;
const DSM_SICHERUNGEN = 10;

function dsm_zugang(string $ordner): string {
  $datei = $ordner . '/speichern-zugang.php';
  $hash = is_file($datei) ? include $datei : '';
  return is_string($hash) && preg_match('/^[0-9a-f]{64}$/', $hash) ? $hash : '';
}

// Liefert [HTTP-Status, Antwort]. $lesen holt den Inhalt erst nach geprüftem Schlüssel.
function dsm_speichern(string $methode, string $datei, string $schluessel, callable $lesen, string $ordner): array {
  $hash = dsm_zugang($ordner);
  if ($methode === 'GET') {
    if ($hash === '') return [200, ['bereit' => false, 'grund' => 'zugang']];
    if (!is_writable($ordner)) return [200, ['bereit' => false, 'grund' => 'schreibrecht']];
    return [200, ['bereit' => true]];
  }
  if ($methode !== 'POST') return [405, ['fehler' => 'methode']];
  if ($hash === '') return [503, ['fehler' => 'zugang']];
  if (!hash_equals($hash, hash('sha256', $schluessel))) return [403, ['fehler' => 'schluessel']];
  if (!isset(DSM_DATEIEN[$datei])) return [400, ['fehler' => 'datei']];

  $text = $lesen();
  if (!is_string($text) || $text === '') return [400, ['fehler' => 'leer']];
  if (strlen($text) > DSM_MAX) return [413, ['fehler' => 'gross']];
  list($kopf, $pflicht) = DSM_DATEIEN[$datei];
  if (strncmp($text, $kopf, strlen($kopf)) !== 0 || substr($text, -2) !== ";\n") return [422, ['fehler' => 'format']];
  $json = substr($text, strlen($kopf), -2);
  $daten = $json !== '' && $json[0] === '{' ? json_decode($json, false, 64) : null;
  if (!is_object($daten) || !isset($daten->$pflicht)) return [422, ['fehler' => 'format']];

  $sicherung = $ordner . '/sicherung';
  if (!is_dir($sicherung) && !@mkdir($sicherung, 0755)) return [500, ['fehler' => 'schreibrecht']];
  $sperre = fopen($sicherung . '/.sperre', 'c');
  if (!$sperre || !flock($sperre, LOCK_EX)) return [500, ['fehler' => 'sperre']];
  try {
    $ziel = $ordner . '/' . $datei;
    $name = substr($datei, 0, -3);
    if (is_file($ziel)) {
      copy($ziel, sprintf('%s/%s-%s.js', $sicherung, $name, date('Ymd-His')));
      $alte = glob($sicherung . '/' . $name . '-*.js') ?: [];
      sort($alte);
      foreach (array_slice($alte, 0, max(0, count($alte) - DSM_SICHERUNGEN)) as $alt) @unlink($alt);
    }
    // erst vollständig schreiben, dann in einem Schritt ersetzen: Besucher sehen nie eine halbe Datei
    $neu = $ordner . '/.' . $datei . '.neu';
    if (file_put_contents($neu, $text) !== strlen($text) || !rename($neu, $ziel)) {
      @unlink($neu);
      return [500, ['fehler' => 'schreibrecht']];
    }
  } finally {
    flock($sperre, LOCK_UN);
    fclose($sperre);
  }
  return [200, ['ok' => true, 'datei' => $datei, 'bytes' => strlen($text), 'stand' => isset($daten->stand) ? (string) $daten->stand : '']];
}

if (!defined('DSM_SPEICHERN_TEST')) {
  list($status, $antwort) = dsm_speichern(
    (string) ($_SERVER['REQUEST_METHOD'] ?? ''),
    (string) ($_GET['datei'] ?? ''),
    (string) ($_SERVER['HTTP_X_DSM_SCHLUESSEL'] ?? ''),
    function () { return file_get_contents('php://input', false, null, 0, DSM_MAX + 1); },
    __DIR__
  );
  if ($status === 403) sleep(1); // Raten bremsen
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  header('X-Content-Type-Options: nosniff');
  echo json_encode(['dsm' => 'speichern', 'v' => 1] + $antwort, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
