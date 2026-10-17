<?php
/*
 * Router für den lokalen Entwicklungs-Server (npm run lokal, siehe lokal.mjs): PHP-Webserver mit website/ als Wurzel.
 * Verwaltung und Zugang kommen aus tests/.tmp/lokal/ (mit dem lokalen Passwort verschlüsselt), nicht aus website/ –
 * so wird weder das echte Passwort gebraucht noch die echte admin.enc.js berührt. Alles andere: website/ wie auf dem Webspace.
 */
$lokal = dirname(__DIR__) . '/tests/.tmp/lokal';
$pfad = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($pfad === '/assets/admin.enc.js') {
  header('Content-Type: text/javascript; charset=utf-8');
  header('Cache-Control: no-store');
  readfile($lokal . '/admin.enc.js');
  return true;
}
if ($pfad === '/speichern.php') {
  define('DSM_ZUGANG_DATEI', $lokal . '/speichern-zugang.php');
  require dirname(__DIR__) . '/website/speichern.php';
  return true;
}
if (substr($pfad, -4) === '.php' || strpos($pfad, '/sicherung/') === 0) { // sonst nichts ausführen (z. B. eine echte speichern-zugang.php in website/)
  http_response_code(404);
  return true;
}
return false; // Datei aus website/ ausliefern
