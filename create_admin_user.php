<?php
// Detta skript ska du bara köra en gång och sedan radera från servern!

$db_path = 'huvudman_data.sqlite'; 
$username = 'LarsLindberg'; // Välj ditt användarnamn
$password = 'lars1914@@Godmanapp@@@'; // VÄLJ ETT STARKT LÖSENORD

// Hasha lösenordet säkert
$password_hash = password_hash($password, PASSWORD_ARGON2ID);

try {
    $pdo = new PDO('sqlite:' . $db_path);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $pdo->prepare("INSERT INTO users (username, password_hash) VALUES (:user, :hash)");
    $stmt->execute([':user' => $username, ':hash' => $password_hash]);

    echo "Användaren '$username' har skapats. RADERA DENNA FIL NU!";

} catch (Exception $e) {
    die("Kunde inte skapa användare: " . $e->getMessage());
}
?>