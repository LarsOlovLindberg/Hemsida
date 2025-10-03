<?php
// Funktion för att hämta en databasanslutning.
function get_db_connection() {
    // Sökväg till databasfilen, relativt till denna fil (db_connect.php)
    $db_path = __DIR__ . '/../huvudman_data.sqlite';
    
    try {
        // Skapa en ny PDO-instans. Lägg till charset=utf8 i DSN-strängen.
        $pdo = new PDO('sqlite:' . $db_path, '', '', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        
        // Detta är inte strikt nödvändigt för SQLite 3 med PDO men skadar inte
        $pdo->exec('PRAGMA encoding = "UTF-8";');
        
        return $pdo;
    } catch (PDOException $e) {
        // Skicka aldrig ut detaljerade databasfel till användaren i en produktionsmiljö.
        // Logga felet istället.
        error_log('Database Connection Error: ' . $e->getMessage());
        // Kasta ett generiskt fel eller avsluta.
        throw new Exception('Kunde inte ansluta till databasen.');
    }
}

// Byt namn på den gamla funktionen för att undvika konflikter om den fortfarande anropas någonstans.
// Du kan ta bort denna helt när du är säker på att all kod använder get_db_connection().
function getDbConnection() {
    return get_db_connection();
}
?>