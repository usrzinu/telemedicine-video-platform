<?php
/**
 * AuraMed Local Development Router
 * 
 * This script allows you to run the project using PHP's built-in server:
 * php -S localhost:8000 router.php
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// 1. Route API requests to the backend routes script
if (strpos($uri, '/api/') === 0) {
    include __DIR__ . '/backend/routes/auth.php';
    exit;
}

// 2. Serve static files from the Frontend directory
// If the URI is just '/', serve index.html
if ($uri === '/') {
    $uri = '/index.html';
}

$file = __DIR__ . '/Frontend' . $uri;

if (file_exists($file) && !is_dir($file)) {
    // Determine MIME type for the browser
    $ext = pathinfo($file, PATHINFO_EXTENSION);
    $mimes = [
        'html' => 'text/html',
        'css'  => 'text/css',
        'js'   => 'application/javascript',
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'svg'  => 'image/svg+xml'
    ];
    if (isset($mimes[$ext])) {
        header("Content-Type: " . $mimes[$ext]);
    }
    readfile($file);
    exit;
}

// 3. Fallback to 404
http_response_code(404);
echo "404 Not Found: " . htmlspecialchars($uri);
