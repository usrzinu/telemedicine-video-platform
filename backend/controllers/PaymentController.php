<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/PaymentModel.php';
require_once __DIR__ . '/../models/AppointmentModel.php';

class PaymentController {
    private $db;
    private $paymentModel;
    private $appointmentModel;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->paymentModel = new PaymentModel($this->db);
        $this->appointmentModel = new AppointmentModel($this->db);
    }

    /**
     * POST /api/payment/pay
     */
    public function pay() {
        try {
            $input = json_decode(file_get_contents("php://input"), true);

            if (empty($input['appointment_id']) || empty($input['patient_id']) || empty($input['amount']) || empty($input['payment_method'])) {
                $this->response("error", "Missing required fields.");
                return;
            }

            $valid_methods = ['bkash', 'nagad', 'card'];
            $method = $input['payment_method'];

            if (!in_array($method, $valid_methods)) {
                $this->response("error", "Invalid payment method. Allowed: bkash, nagad, card.");
                return;
            }

            $phone_number = null;
            $transaction_id = null;
            $card_number = null;

            if ($method === 'bkash' || $method === 'nagad') {
                if (empty($input['phone_number']) || empty($input['transaction_id'])) {
                    $this->response("error", "Phone number and Transaction ID are required for Mobile Banking.");
                    return;
                }
                $phone_number = $input['phone_number'];
                $transaction_id = $input['transaction_id'];
            } else if ($method === 'card') {
                if (empty($input['card_number'])) {
                    $this->response("error", "Card number is required.");
                    return;
                }
                $card_number = $input['card_number'];
            }

            // Save Payment
            $result = $this->paymentModel->createPayment(
                $input['appointment_id'], 
                $input['patient_id'], 
                $input['amount'], 
                $method, 
                $transaction_id,
                $phone_number,
                $card_number
            );

            if ($result === true) {
                http_response_code(200);
                echo json_encode([
                    "status" => "success",
                    "message" => "Payment submitted. Waiting for doctor verification."
                ]);
            } else {
                $this->response("error", $result);
            }
        } catch (Exception $e) {
            $this->response("error", "Server exception: " . $e->getMessage());
        }
    }


    /**
     * GET /api/payment/doctor-requests?doctor_id=X
     */
    public function getDoctorPaymentRequests() {
        try {
            $doctor_id = $_GET['doctor_id'] ?? null;
            if (!$doctor_id) {
                $this->response("error", "doctor_id is required.");
                return;
            }

            $requests = $this->paymentModel->getPendingPaymentsByDoctor($doctor_id);

            http_response_code(200);
            echo json_encode([
                "status" => "success",
                "data" => $requests
            ]);
        } catch (Exception $e) {
            $this->response("error", "Server exception: " . $e->getMessage());
        }
    }

    /**
     * POST /api/payment/verify-doctor
     * Body: { appointment_id, status } // status: confirmed | rejected
     */
    public function verifyByDoctor() {
        try {
            $input = json_decode(file_get_contents("php://input"), true);

            if (empty($input['appointment_id']) || empty($input['status'])) {
                $this->response("error", "appointment_id and status are required.");
                return;
            }

            $result = $this->paymentModel->doctorVerifyPayment($input['appointment_id'], $input['status'], $this->appointmentModel);

            http_response_code(200);
            echo json_encode($result);

        } catch (Exception $e) {
            $this->response("error", "Server exception: " . $e->getMessage());
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
