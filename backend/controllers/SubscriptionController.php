<?php
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../models/SubscriptionModel.php';

class SubscriptionController {
    private $db;
    private $subscriptionModel;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->subscriptionModel = new SubscriptionModel($this->db);
    }

    /**
     * GET /api/subscription/status?doctor_id=X
     */
    public function getStatus() {
        try {
            $doctor_id = isset($_GET['doctor_id']) ? intval($_GET['doctor_id']) : null;
            if (!$doctor_id) {
                $this->response("error", "doctor_id is required.");
                return;
            }

            $status = $this->subscriptionModel->getStatus($doctor_id);
            if (!$status) {
                $this->response("error", "Doctor not found.");
                return;
            }

            $history = $this->subscriptionModel->getHistory($doctor_id);

            http_response_code(200);
            echo json_encode([
                "status" => "success",
                "data" => [
                    "current" => $status,
                    "history" => $history
                ]
            ]);
        } catch (Exception $e) {
            $this->response("error", "Server exception: " . $e->getMessage());
        }
    }

    /**
     * POST /api/subscription/renew
     * Body: { doctor_id, plan_name, amount, transaction_id }
     */
    public function renew() {
        try {
            $input = json_decode(file_get_contents("php://input"), true);

            if (empty($input['doctor_id']) || empty($input['plan_name']) || empty($input['amount']) || empty($input['transaction_id'])) {
                $this->response("error", "All fields are required (doctor_id, plan_name, amount, transaction_id).");
                return;
            }

            $ok = $this->subscriptionModel->activate(
                intval($input['doctor_id']),
                $input['plan_name'],
                $input['amount'],
                $input['transaction_id']
            );

            if ($ok) {
                $this->response("success", "Subscription activated successfully.");
            } else {
                $this->response("error", "Failed to activate subscription. It might be a duplicate transaction.");
            }
        } catch (Exception $e) {
            $this->response("error", "Internal server error during renewal.");
        }
    }

    private function response($status, $message) {
        http_response_code($status === "success" ? 200 : 400);
        echo json_encode([
            "status" => $status,
            "message" => $message
        ]);
    }
}
?>
