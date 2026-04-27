<?php

/**
 * SUPPORT MODEL
 * Handles database operations for tickets and messages.
 */

class SupportModel {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Create a new support ticket
     */
    public function createTicket($user_id, $subject) {
        $query = "INSERT INTO support_tickets (user_id, subject, status) VALUES (:user_id, :subject, 'open') RETURNING id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':subject', $subject);
        
        if ($stmt->execute()) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return $row['id'];
        }
        return false;
    }

    /**
     * Add a message to a ticket
     */
    public function addMessage($ticket_id, $sender_role, $message, $is_auto = false) {
        $query = "INSERT INTO support_messages (ticket_id, sender_role, message, is_auto) 
                  VALUES (:ticket_id, :sender_role, :message, :is_auto)";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':ticket_id', $ticket_id);
        $stmt->bindParam(':sender_role', $sender_role);
        $stmt->bindParam(':message', $message);
        $stmt->bindParam(':is_auto', $is_auto, PDO::PARAM_BOOL);
        
        return $stmt->execute();
    }

    /**
     * Get all tickets for a specific user
     */
    public function getUserTickets($user_id) {
        $query = "SELECT * FROM support_tickets WHERE user_id = :user_id ORDER BY created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get all tickets for admin
     */
    public function getAllTickets() {
        $query = "SELECT t.*, u.name as user_name, u.email as user_email 
                  FROM support_tickets t 
                  JOIN users u ON t.user_id = u.id 
                  ORDER BY t.created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get messages for a ticket
     */
    public function getMessages($ticket_id) {
        $query = "SELECT * FROM support_messages WHERE ticket_id = :ticket_id ORDER BY created_at ASC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':ticket_id', $ticket_id);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Update ticket status
     */
    public function updateStatus($ticket_id, $status) {
        $query = "UPDATE support_tickets SET status = :status WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':status', $status);
        $stmt->bindParam(':id', $ticket_id);
        return $stmt->execute();
    }
    
    /**
     * Get ticket by ID
     */
    public function getTicketById($ticket_id) {
        $query = "SELECT t.*, u.name as user_name FROM support_tickets t JOIN users u ON t.user_id = u.id WHERE t.id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $ticket_id);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
