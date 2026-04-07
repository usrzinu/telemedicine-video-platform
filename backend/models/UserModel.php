<?php

class UserModel {
    private $conn;
    private $table_name = "users";

    public function __construct($db) {
        $this->conn = $db;
    }

    // Find a user by email
    public function findUserByEmail($email) {
        $query = "SELECT id, name, email, password, role FROM " . $this->table_name . " WHERE email = :email LIMIT 1";
        
        $stmt = $this->conn->prepare($query);
        
        // Sanitize
        $email = htmlspecialchars(strip_tags($email));
        
        // Bind value
        $stmt->bindParam(":email", $email);
        
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return $row;
        }
        
        return false;
    }

    // Create a new user
    public function createUser($name, $email, $password, $role) {
        $query = "INSERT INTO " . $this->table_name . " 
                  (name, email, password, role) 
                  VALUES (:name, :email, :password, :role)";
                  
        $stmt = $this->conn->prepare($query);
        
        // Sanitize values
        $name = htmlspecialchars(strip_tags($name));
        $email = htmlspecialchars(strip_tags($email));
        $role = htmlspecialchars(strip_tags($role));
        
        // Bind values
        $stmt->bindParam(":name", $name);
        $stmt->bindParam(":email", $email);
        $stmt->bindParam(":password", $password); // Password should already be hashed
        $stmt->bindParam(":role", $role);
        
        if ($stmt->execute()) {
            return true;
        }
        
        return false;
    }
    // Find a user by ID
    public function getUserById($id) {
        $query = "SELECT id, name, email, role, is_verified FROM " . $this->table_name . " WHERE id = :id LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            return $stmt->fetch(PDO::FETCH_ASSOC);
        }
        return false;
    }
}
?>
