<?php
// api/save_huvudman_dashboard.php
require_once('auth_check.php');
require_once('db_connect.php');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

if (!isset($_GET['pnr']) || $_GET['pnr'] === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Inget personnummer angivet.']);
    exit;
}

$pnr = $_GET['pnr'];

$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);
if (!is_array($payload) || !isset($payload['details']) || !is_array($payload['details'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Ogiltig data.']);
    exit;
}

// FIX: Vitlistan är uppdaterad för att matcha de omdöpta kolumnerna i databasen.
$WHITELIST = [
    // Grunduppgifter från Översikt
    'Fornamn', 'Efternamn', 'Adress', 'Postnummer', 'Ort',

    // kontakter
    'KontaktpersonNamn', 'KontaktpersonTel',
    'BoendeKontaktpersonNamn', 'BoendeKontaktpersonTel',

    // inkomster
    'PENSION_LIVRANTA_SJUK_AKTIVITET', 'PensionLeverantor',
    'BOSTADSBIDRAG', 'BostadsbidragLeverantor',

    // utgifter
    'HYRA', 'HyraLeverantor',
    'Omsorgsavgift', 'OmsorgsavgiftLeverantor',
    'EL_KOSTNAD', 'ElLeverantor',
    'HEMFORSAKRING', 'HemforsakringLeverantor',
    'LAKARVARDSKOSTNAD', 'LakarvardskostnadLeverantor',
    'MEDICIN_KOSTNAD', 'MedicinLeverantor',
    'BREDBAND', 'BredbandLeverantor',
    'FickpengarManad', 'FickpengarLeverantor',

    // vecko-schema
    'FickpengMondag', 'FickpengTisdag', 'FickpengOnsdag',
    'FickpengTorsdag', 'FickpengFredag', 'FickpengTotalVecka',
];

$incoming = $payload['details'];
$fields = [];
$params = [];

foreach ($incoming as $key => $val) {
    if (!in_array($key, $WHITELIST, true)) continue;

    if ($val === '' || $val === null) {
        $fields[] = "$key = NULL";
        continue;
    }
    
    if (preg_match('/(Kostnad|Hyra|Belopp|Avgift|Pension|Bidrag|Fickpeng)/i', $key)) {
        $val = str_replace(',', '.', (string)$val);
        if (is_numeric($val)) $val = (float)$val;
    }

    $param = ':' . $key;
    $fields[] = "$key = $param";
    $params[$param] = $val;
}


if (empty($fields)) {
    echo json_encode(['success' => true, 'message' => 'Inga ändringar att spara.']);
    exit;
}

try {
    $pdo = get_db_connection();

    $chk = $pdo->prepare("SELECT 1 FROM huvudman WHERE PERSONNUMMER = :pnr");
    $chk->execute([':pnr' => $pnr]);
    if (!$chk->fetchColumn()) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Huvudman saknas.']);
        exit;
    }

    $sql = "UPDATE huvudman SET " . implode(', ', $fields) . " WHERE PERSONNUMMER = :pnr";
    $stmt = $pdo->prepare($sql);
    $params[':pnr'] = $pnr;
    $stmt->execute($params);

    echo json_encode(['success' => true, 'message' => 'Sparat.']);
} catch (Throwable $e) {
    http_response_code(500);
    error_log("Fel i save_huvudman_dashboard.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Databasfel', 'debug' => $e->getMessage()]);
}

