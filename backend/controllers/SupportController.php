<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/SupportModel.php';

class SupportController {
    private $supportModel;
    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->supportModel = new SupportModel($this->db);
        $this->ensureSchema();
    }

    /**
     * Safely add is_read column if it doesn't exist yet.
     */
    private function ensureSchema() {
        try {
            $query = "SELECT COUNT(*) FROM information_schema.columns 
                      WHERE table_name = 'support_messages' AND column_name = 'is_read'";
            $stmt = $this->db->prepare($query);
            $stmt->execute();
            $exists = $stmt->fetchColumn() > 0;

            if (!$exists) {
                $this->db->exec("ALTER TABLE support_messages ADD COLUMN is_read BOOLEAN DEFAULT FALSE");
            }
        } catch (Exception $e) {
            // Non-fatal: schema check failed, continue without crashing
            error_log("SupportController ensureSchema error: " . $e->getMessage());
        }
    }

    /**
     * POST /api/support/create
     */
    public function createTicket($data) {
        if (empty($data['user_id']) || empty($data['subject']) || empty($data['message'])) {
            $this->response("error", "User ID, subject, and message are required.");
            return;
        }

        $ticketId = $this->supportModel->createTicket($data['user_id'], $data['subject']);
        if ($ticketId) {
            // 1. Save patient message
            $this->supportModel->addMessage($ticketId, 'patient', $data['message']);
            
            // 2. Add auto-reply
            $this->supportModel->addMessage($ticketId, 'admin', "Support will reply within 24 hours", true);

            $this->response("success", "Ticket created successfully.", ["ticket_id" => $ticketId]);
        } else {
            $this->response("error", "Failed to create support ticket.");
        }
    }

    /**
     * GET /api/support/my-tickets
     */
    public function getMyTickets($userId) {
        $tickets = $this->supportModel->getUserTickets($userId);
        echo json_encode(["status" => "success", "data" => $tickets]);
    }

    /**
     * GET /api/support/ticket/{id}
     */
    public function getTicketDetails($ticketId) {
        $ticket = $this->supportModel->getTicketById($ticketId);
        if (!$ticket) {
            $this->response("error", "Ticket not found.");
            return;
        }
        $messages = $this->supportModel->getMessages($ticketId);

        // Mark patient messages as read (admin is viewing)
        $this->supportModel->markAsRead($ticketId);

        echo json_encode([
            "status" => "success",
            "data" => [
                "ticket" => $ticket,
                "messages" => $messages
            ]
        ]);
    }

    /**
     * GET /api/admin/support/tickets
     */
    public function getAllTickets() {
        $tickets = $this->supportModel->getAllTickets();
        echo json_encode(["status" => "success", "data" => $tickets]);
    }

    /**
     * POST /api/admin/support/reply
     */
    public function adminReply($data) {
        if (empty($data['ticket_id']) || empty($data['message'])) {
            $this->response("error", "Ticket ID and message are required.");
            return;
        }

        if ($this->supportModel->addMessage($data['ticket_id'], 'admin', $data['message'])) {
            // Mark as resolved after admin reply
            $this->supportModel->updateStatus($data['ticket_id'], 'resolved');
            $this->response("success", "Reply sent and ticket resolved.");
        } else {
            $this->response("error", "Failed to send reply.");
        }
    }

    /**
     * POST /api/support/reply
     */
    public function patientReply($data) {
        if (empty($data['ticket_id']) || empty($data['message'])) {
            $this->response("error", "Ticket ID and message are required.");
            return;
        }

        if ($this->supportModel->addMessage($data['ticket_id'], 'patient', $data['message'])) {
            // Set back to open so admin sees it
            $this->supportModel->updateStatus($data['ticket_id'], 'open');
            $this->response("success", "Reply sent.");
        } else {
            $this->response("error", "Failed to send reply.");
        }
    }

    /**
     * GET /api/admin/support/unread-count
     */
    public function getUnreadCount() {
        try {
            $count = $this->supportModel->getUnreadCount();
            echo json_encode(["status" => "success", "count" => $count]);
        } catch (Exception $e) {
            // is_read column might not exist yet on some setups
            echo json_encode(["status" => "success", "count" => 0]);
        }
    }

    private function response($status, $message, $extra = []) {
        echo json_encode(array_merge([
            "status" => $status,
            "message" => $message
        ], $extra));
    }
}
