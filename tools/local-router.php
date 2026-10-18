<?php
/*
 * Router for the local development server (npm run local, see local.mjs): PHP web server with website/ as its root.
 * The admin app and access file come from tests/.tmp/local/ (encrypted with the local password), not from website/ –
 * so neither the real password is needed nor the real admin.enc.js touched.
 * books.js/recommendations.js/info.js come from tests/.tmp/local/data/ (local.mjs copies them from website/ on start),
 * and save.php writes there: "Publish" while testing never changes the committed files in website/.
 * Everything else: website/ as on the webspace.
 */
$local = dirname(__DIR__) . '/tests/.tmp/local';
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if (in_array($path, ['/books.js', '/recommendations.js', '/info.js'], true) && is_file($local . '/data' . $path)) {
  header('Content-Type: text/javascript; charset=utf-8');
  header('Cache-Control: no-store');
  readfile($local . '/data' . $path);
  return true;
}

if ($path === '/assets/admin.enc.js') {
  header('Content-Type: text/javascript; charset=utf-8');
  header('Cache-Control: no-store');
  readfile($local . '/admin.enc.js');
  return true;
}
if ($path === '/save.php') {
  define('DSM_ACCESS_FILE', $local . '/save-access.php');
  define('DSM_DATA_FOLDER', $local . '/data');
  require dirname(__DIR__) . '/website/save.php';
  return true;
}
if (substr($path, -4) === '.php' || strpos($path, '/backup/') === 0) { // run nothing else (e.g. a real save-access.php in website/)
  http_response_code(404);
  return true;
}
return false; // serve the file from website/
