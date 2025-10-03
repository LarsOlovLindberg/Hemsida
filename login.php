<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="utf-8"/>
    <title>Logga in - Godman App</title>
    <style>
        body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f0f2f5; }
        form { padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        input { display: block; width: 100%; padding: 0.5rem; margin-bottom: 1rem; border: 1px solid #ccc; border-radius: 4px; }
        button { width: 100%; padding: 0.75rem; border: none; background-color: #28a745; color: white; border-radius: 4px; cursor: pointer; }
        .error { color: red; margin-bottom: 1rem; }
    </style>
</head>
<body>
    <form action="verify_login.php" method="post">
        <h2>Logga in</h2>
        <?php
        // Visa ett felmeddelande om inloggningen misslyckades
        if (isset($_GET['error'])) {
            echo '<p class="error">Felaktigt användarnamn eller lösenord.</p>';
        }
        ?>
        <label for="username">Användarnamn:</label>
        <input type="text" id="username" name="username" required>
        <label for="password">Lösenord:</label>
        <input type="password" id="password" name="password" required>
        <button type="submit">Logga in</button>
    </form>
</body>
</html>