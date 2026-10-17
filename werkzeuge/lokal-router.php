<?php
/*
 * Router für den lokalen Entwicklungs-Server (npm run lokal, siehe lokal.mjs): PHP-Webserver mit website/ als Wurzel.
 * Verwaltung und Zugang kommen aus tests/.tmp/lokal/ (mit dem lokalen Passwort verschlüsselt), nicht aus website/ –
 * so wird weder das echte Passwort gebraucht noch die echte admin.enc.js berührt.
 * books.js/empfehlungen.js/info.js kommen aus tests/.tmp/lokal/daten/ (lokal.mjs kopiert sie beim Start aus website/),
 * und speichern.php schreibt dorthin: „Veröffentlichen“ beim Testen ändert nie die eingecheckten Dateien in website/.
 * Alles andere: website/ wie auf dem Webspace.
 */
$lokal = dirname(__DIR__) . '/tests/.tmp/lokal';
$pfad = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if (in_array($pfad, ['/books.js', '/empfehlungen.js', '/info.js'], true) && is_file($lokal . '/daten' . $pfad)) {
  header('Content-Type: text/javascript; charset=utf-8');
  header('Cache-Control: no-store');
  readfile($lokal . '/daten' . $pfad);
  return true;
}

if ($pfad === '/assets/admin.enc.js') {
  header('Content-Type: text/javascript; charset=utf-8');
  header('Cache-Control: no-store');
  readfile($lokal . '/admin.enc.js');
  return true;
}
if ($pfad === '/speichern.php') {
  define('DSM_ZUGANG_DATEI', $lokal . '/speichern-zugang.php');
  define('DSM_DATEN_ORDNER', $lokal . '/daten');
  require dirname(__DIR__) . '/website/speichern.php';
  return true;
}
if (substr($pfad, -4) === '.php' || strpos($pfad, '/sicherung/') === 0) { // sonst nichts ausführen (z. B. eine echte speichern-zugang.php in website/)
  http_response_code(404);
  return true;
}
return false; // Datei aus website/ ausliefern
