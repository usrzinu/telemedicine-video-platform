<?php

class Database {
    // Database Config
    private $host = "localhost";
    private $port = "5432";
    private $db_name = "auramed_db";
    private $username = "postgres";
    private $password = "usrzinu";
    public $conn;

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
