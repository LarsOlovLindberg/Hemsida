<?php
session_start();

// Ta bort alla sessionsvariabler
$_SESSION = array();

// Förstör sessionen
session_destroy();

// Skicka användaren till inloggningssidan
header('location: login.php');
exit;
?>