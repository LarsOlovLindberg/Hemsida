<?php
// Fil: api/get_huvudman_details.php
// Version: 2.2 - Slutgiltig, robust version.

require_once('auth_check.php');
require_once('db_connect.php');
$pdo = get_db_connection();
$input = $_GET['personnummer'] ?? $_GET['pnr'] ?? '';
$personnummer = preg_replace('/\D+/', '', $input); // bara siffror
if ($personnummer === '') {
  http_response_code(400);
  echo json_encode(['error' => 'personnummer saknas']);
  exit;
}

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

$pnr = $_GET['pnr'] ?? null;
$ar = isset($_GET['ar']) ? intval($_GET['ar']) : null;

if (!$pnr || !$ar) {
    http_response_code(400);
    echo json_encode(['error' => 'Personnummer (pnr) och år (ar) måste anges.']);
    exit();
}

try {
    $pdo = get_db_connection();

    $fullData = [
        'huvudmanDetails' => null,
        'overformyndareDetails' => null,
        'bankkontonStart' => [],
        'bankkontonSlut' => [],
        'ovrigaTillgangarStart' => [],
        'ovrigaTillgangarSlut' => [],
        'skulder' => [],
        'redogorelseData' => null
    ];

    // 1. Hämta huvudman-detaljer
    $stmt_hm = $pdo->prepare("SELECT * FROM huvudman WHERE PERSONNUMMER = :pnr");
    $stmt_hm->execute([':pnr' => $pnr]);
    $dbRow = $stmt_hm->fetch(PDO::FETCH_ASSOC);

    if (!$dbRow) {
        http_response_code(404);
        echo json_encode(['error' => 'Huvudman med det angivna personnumret hittades inte.']);
        exit();
    }
    
    $huvudmanDetails = [];
    foreach ($dbRow as $key => $value) {
        $pascalKey = str_replace(' ', '', ucwords(str_replace('_', ' ', strtolower($key))));
        $huvudmanDetails[$pascalKey] = $value;
    }
    $fullData['huvudmanDetails'] = $huvudmanDetails;

    // 2. Hämta alla listor, en i taget med separata, säkra anrop
    $stmt_skulder = $pdo->prepare("SELECT * FROM HuvudmanSkulder WHERE HuvudmanPnr = :pnr ORDER BY RadNr");
    $stmt_skulder->execute([':pnr' => $pnr]);
    $fullData['skulder'] = $stmt_skulder->fetchAll(PDO::FETCH_ASSOC);

    $stmt_bank_start = $pdo->prepare("SELECT * FROM HuvudmanBankkonton WHERE HuvudmanPnr = :pnr AND Typ = 'StartPeriod' ORDER BY RadNr");
    $stmt_bank_start->execute([':pnr' => $pnr]);
    $fullData['bankkontonStart'] = $stmt_bank_start->fetchAll(PDO::FETCH_ASSOC);

    $stmt_bank_slut = $pdo->prepare("SELECT * FROM HuvudmanBankkonton WHERE HuvudmanPnr = :pnr AND Typ = 'SlutPeriod' ORDER BY RadNr");
    $stmt_bank_slut->execute([':pnr' => $pnr]);
    $fullData['bankkontonSlut'] = $stmt_bank_slut->fetchAll(PDO::FETCH_ASSOC);

    $stmt_tillg_start = $pdo->prepare("SELECT * FROM HuvudmanOvrigaTillgangar WHERE HuvudmanPnr = :pnr AND Typ = 'StartPeriod' ORDER BY RadNr");
    $stmt_tillg_start->execute([':pnr' => $pnr]);
    $fullData['ovrigaTillgangarStart'] = $stmt_tillg_start->fetchAll(PDO::FETCH_ASSOC);
    
    $stmt_tillg_slut = $pdo->prepare("SELECT * FROM HuvudmanOvrigaTillgangar WHERE HuvudmanPnr = :pnr AND Typ = 'SlutPeriod' ORDER BY RadNr");
    $stmt_tillg_slut->execute([':pnr' => $pnr]);
    $fullData['ovrigaTillgangarSlut'] = $stmt_tillg_slut->fetchAll(PDO::FETCH_ASSOC);

    // 3. Hämta Överförmyndar-detaljer
    if (!empty($fullData['huvudmanDetails']['OverformyndareId'])) {
        $of_id = $fullData['huvudmanDetails']['OverformyndareId'];
        $stmt_of = $pdo->prepare("SELECT * FROM Overformyndare WHERE ID = :id");
        $stmt_of->execute([':id' => $of_id]);
        $fullData['overformyndareDetails'] = $stmt_of->fetch(PDO::FETCH_ASSOC) ?: null;
    }
    
    // 4. Hämta sparad redogörelse för det valda året
    $stmt_redog = $pdo->prepare("SELECT * FROM HuvudmanRedogorelse WHERE HuvudmanPnr = :pnr AND ArsrakningAr = :ar");
    $stmt_redog->execute([':pnr' => $pnr, ':ar' => $ar]);
    $redogorelseRow = $stmt_redog->fetch(PDO::FETCH_ASSOC);
    if ($redogorelseRow) {
        unset($redogorelseRow['ID'], $redogorelseRow['HuvudmanPnr'], $redogorelseRow['ArsrakningAr']);
        $fullData['redogorelseData'] = $redogorelseRow;
    }
    
    echo json_encode($fullData);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Ett databasfel uppstod i get_huvudman_details.php.', 'message' => $e->getMessage()]);
}
?>