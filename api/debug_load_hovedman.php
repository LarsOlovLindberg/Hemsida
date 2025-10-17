<?php
// api/debug_load_hovedman.php
// DEBUG: Visa vad som hämtas från databasen för en huvudman

require_once('auth_check.php');
require_once('db_connect.php');

header('Content-Type: application/json; charset=utf-8');

try {
    $pdo = get_db_connection();
    
    $pnr = $_GET['pnr'] ?? '900810-2312';
    
    // Hämta raden
    $stmt = $pdo->prepare("SELECT * FROM huvudman WHERE PERSONNUMMER = :pnr");
    $stmt->execute([':pnr' => $pnr]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$row) {
        echo json_encode(['error' => 'Ingen huvudman hittad för ' . $pnr], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
    
    // Filtrera bara kostnads- och inkomst-kolumner
    $kostnadInkomst = [];
    $kostnadCols = [
        'HYRA', 'EL_KOSTNAD', 'HEMFORSAKRING', 'RESKOSTNADER', 'FACK_AVGIFT_AKASSA',
        'MEDICIN_KOSTNAD', 'LAKARVARDSKOSTNAD', 'AKUT_TANDVARDSKOSTNAD', 'BARNOMSORG_AVGIFT',
        'FARDTJANST_AVGIFT', 'BREDBAND', 'OVRIG_KOSTNAD_BELOPP',
        'LON', 'PENSION_LIVRANTA_SJUK_AKTIVITET', 'SJUKPENNING_FORALDRAPENNING',
        'ARBETSLOSHETSERSTATTNING', 'BOSTADSBIDRAG', 'BARNBIDRAG_STUDIEBIDRAG',
        'UNDERHALLSSTOD_EFTERLEVANDEPENSION', 'ETABLERINGSERSATTNING', 'AVTALSFOrSAKRING_AFA',
        'HYRESINTAKT_INNEBOENDE', 'BARNS_INKOMST', 'SKATTEATERBARING', 'STUDIEMEDEL',
        'VANTAD_INKOMST_BELOPP', 'OVRIG_INKOMST_BELOPP'
    ];
    
    foreach ($kostnadCols as $col) {
        if (isset($row[$col])) {
            $val = $row[$col];
            $kostnadInkomst[$col] = [
                'value' => $val,
                'type' => gettype($val),
                'isNull' => is_null($val),
                'asString' => (string)$val
            ];
        }
    }
    
    $response = [
        'personnummer' => $pnr,
        'total_columns' => count($row),
        'kostnader_inkomster' => $kostnadInkomst,
        'raw_row_sample' => array_slice($row, 0, 10) // Första 10 kolumner
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
