<?php
session_start();

// Om session-variabeln 'loggedin' inte finns eller inte är true, är användaren inte inloggad.
if (!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true) {
    
    // -- START PÅ ÄNDRING --
    // Kontrollera om detta är ett API-anrop.
    // Vi kollar antingen efter den gamla X-Requested-With-headern
    // ELLER om anropet accepterar ett JSON-svar, vilket moderna fetch-anrop gör.
    $is_api_request = (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest') 
                      || (isset($_SERVER['HTTP_ACCEPT']) && strpos(strtolower($_SERVER['HTTP_ACCEPT']), 'application/json') !== false);
    // -- SLUT PÅ ÄNDRING --

    if ($is_api_request) {
        // Om det är ett API-anrop, skicka ett 401-fel (Unauthorized) med JSON
        http_response_code(401);
        echo json_encode(['error' => 'Not authorized or session expired.']);
    } else {
        // Annars, om det är en vanlig sidladdning, skicka till inloggningssidan.
        header('Location: login.php'); // Ändrade till login.php istället för /login.php för bättre kompatibilitet
    }
    exit;
}
?>