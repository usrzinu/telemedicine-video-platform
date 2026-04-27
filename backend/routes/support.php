<?php

/**
 * SUPPORT ROUTE HANDLER
 */

require_once __DIR__ . '/../controllers/SupportController.php';

$supportController = new SupportController();
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($uri === '/api/support/create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $supportController->createTicket($data);

} else if ($uri === '/api/support/my-tickets' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $userId = $_GET['user_id'] ?? null;
    $supportController->getMyTickets($userId);

} else if ($uri === '/api/support/reply' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $supportController->patientReply($data);

} else if (strpos($uri, '/api/support/ticket/') !== false && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $parts = explode('/', $uri);
    $ticketId = end($parts);
    $supportController->getTicketDetails($ticketId);

} else if ($uri === '/api/admin/support/tickets' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $supportController->getAllTickets();

} else if ($uri === '/api/admin/support/reply' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $supportController->adminReply($data);

} else {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "Endpoint not found in Support Router."]);
}
