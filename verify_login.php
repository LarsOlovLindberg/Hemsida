<?php
session_start(); // Starta sessionen

$db_path = 'huvudman_data.sqlite';
$username_from_form = $_POST['username'] ?? '';
$password_from_form = $_POST['password'] ?? '';

if (empty($username_from_form) || empty($password_from_form)) {
    header('Location: login.php?error=1');
    exit();
}

try {
    $pdo = new PDO('sqlite:' . $db_path);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE username = :user");
    $stmt->execute([':user' => $username_from_form]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Verifiera lösenordet
    if ($user && password_verify($password_from_form, $user['password_hash'])) {
        // Lösenordet är korrekt!
        $_SESSION['loggedin'] = true;
        $_SESSION['username'] = $username_from_form;
        
        // Skicka användaren till huvudsidan
        header('Location: index.php');
        exit();
    } else {
        // Felaktigt lösenord eller användare
        header('Location: login.php?error=1');
        exit();
    }

} catch (Exception $e) {
    // Generellt fel
    header('Location: login.php?error=1');
    exit();
}
?>