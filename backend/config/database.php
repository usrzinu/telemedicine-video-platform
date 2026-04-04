<?php

class Database {
    // Database credentials from environment
    private $host;
    private $port;
    private $db_name;
    private $username;
    private $password;
    public $conn;

    public function __construct() {
        $this->host = getenv('DB_HOST') ?: "localhost";
        $this->port = getenv('DB_PORT') ?: "5432";
        $this->db_name = getenv('DB_NAME') ?: "auramed_db";
        $this->username = getenv('DB_USER') ?: "postgres";
        $this->password = getenv('DB_PASS') ?: "usrzinu";
    }

    // Get the database connection
    public function getConnection() {
        $this->conn = null;

        try {
            // Set up PDO connection for PostgreSQL
            $dsn = "pgsql:host=" . $this->host . ";port=" . $this->port . ";dbname=" . $this->db_name;
            $this->conn = new PDO($dsn, $this->username, $this->password);
            
            // Enable error mode exception
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch(PDOException $exception) {
            // Echo connection error message - normally we log this in production
            echo json_encode([
                "status" => "error",
                "message" => "Database Connection error: " . $exception->getMessage()
            ]);
            exit;
        }

        return $this->conn;
    }
}
?>
