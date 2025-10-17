<?php
// api/save_huvudman_details_DEBUG.php
// DEBUG VERSION - Loggar allt som sparas

require_once __DIR__ . '/auth_check.php';
require_once __DIR__ . '/db_connect.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

$response = ['success' => false, 'message' => 'Ett okänt fel inträffade.', 'debug' => []];

try {
    $pdo = get_db_connection();

    if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
        throw new Exception('Endast PUT-metoden är tillåten för att uppdatera.');
    }

    if (!isset($_GET['pnr']) || empty($_GET['pnr'])) {
        http_response_code(400);
        throw new Exception('Inget personnummer angivet i URL:en.');
    }
    $pnr = $_GET['pnr'];

    // Läs JSON från body
    $raw_input = file_get_contents('php://input');
    $response['debug']['raw_input'] = substr($raw_input, 0, 500); // Första 500 chars
    
    $json_data = json_decode($raw_input, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Ogiltig JSON-data: ' . json_last_error_msg());
    }

    $details = $json_data['details'] ?? null;
    if (!$details) {
        throw new Exception("Inkommande data saknar 'details'-strukturen");
    }
    
    // LOG: Vilka kostnader-fält skickas?
    $kostnadFields = ['HYRA', 'EL_KOSTNAD', 'HEMFORSAKRING', 'RESKOSTNADER', 'FACK_AVGIFT_AKASSA', 
                       'MEDICIN_KOSTNAD', 'LAKARVARDSKOSTNAD', 'AKUT_TANDVARDSKOSTNAD', 'BARNOMSORG_AVGIFT',
                       'FARDTJANST_AVGIFT', 'BREDBAND', 'OVRIG_KOSTNAD_BELOPP'];
    
    $inkomstFields = ['LON', 'PENSION_LIVRANTA_SJUK_AKTIVITET', 'SJUKPENNING_FORALDRAPENNING', 
                      'ARBETSLOSHETSERSTATTNING', 'BOSTADSBIDRAG', 'BARNBIDRAG_STUDIEBIDRAG',
                      'UNDERHALLSSTOD_EFTERLEVANDEPENSION', 'ETABLERINGSERSATTNING', 'AVTALSFOrSAKRING_AFA',
                      'HYRESINTAKT_INNEBOENDE', 'BARNS_INKOMST', 'SKATTEATERBARING', 'STUDIEMEDEL',
                      'VANTAD_INKOMST_BELOPP', 'OVRIG_INKOMST_BELOPP'];
    
    $response['debug']['kostnader_skickade'] = [];
    foreach ($kostnadFields as $field) {
        if (isset($details[$field])) {
            $response['debug']['kostnader_skickade'][$field] = $details[$field];
        }
    }
    
    $response['debug']['inkomster_skickade'] = [];
    foreach ($inkomstFields as $field) {
        if (isset($details[$field])) {
            $response['debug']['inkomster_skickade'][$field] = $details[$field];
        }
    }
    
    // Gör uppdateringen
    $WHITELIST = [
        'PERSONNUMMER', 'FORNAMN', 'EFTERNAMN', 'HELT_NAMN', 'ADRESS', 'POSTNUMMER', 'ORT', 'VISTELSEADRESS',
        'VISTELSEPOSTNR', 'VISTELSEORT', 'TELEFON', 'MOBIL', 'EPOST', 'MEDBORGARSKAP', 'CIVILSTAND', 'SAMMANBOENDE',
        'MEDSOKANDE_FORNAMN', 'MEDSOKANDE_EFTERNAMN', 'MEDSOKANDE_PERSONNUMMER', 'MEDSOKANDE_MEDBORGARSKAP',
        'MEDSOKANDE_CIVILSTAND', 'MEDSOKANDE_SYSSELSATTNING', 'CLEARINGNUMMER', 'KONTONUMMER', 'BANKNAMN',
        'OVERFORMYNDARE_ID', 'BOENDE_NAMN', 'BOSTAD_TYP', 'BOSTAD_ANTAL_RUM', 'BOSTAD_ANTAL_BOENDE',
        'BOSTAD_KONTRAKTSTID', 'SYSSELSATTNING', 'INKOMSTTYP', 'DEKLARERAT_STATUS', 'ARVODE_UTBETALT_STATUS',
        'MERKOSTNADSERSTATTNING_STATUS', 'ARSR_OVRIGA_UPPLYSNINGAR', 'ERSATTNING_ANNAN_MYNDIGHET_STATUS',
        'ERSATTNING_ANNAN_MYNDIGHET_FRAN', 'HYRA', 'EL_KOSTNAD', 'FACK_AVGIFT_AKASSA', 'RESKOSTNADER', 'HEMFORSAKRING',
        'MEDICIN_KOSTNAD', 'LAKARVARDSKOSTNAD', 'BARNOMSORG_AVGIFT', 'FARDTJANST_AVGIFT', 'AKUT_TANDVARDSKOSTNAD',
        'BREDBAND', 'OVRIG_KOSTNAD_BESKRIVNING', 'OVRIG_KOSTNAD_BELOPP', 'ARBETSLOSHETSERSTATTNING',
        'AVTALSFOrSAKRING_AFA', 'BARNBIDRAG_STUDIEBIDRAG', 'BOSTADSBIDRAG', 'ETABLERINGSERSATTNING', 'BARNS_INKOMST',
        'HYRESINTAKT_INNEBOENDE', 'LON', 'PENSION_LIVRANTA_SJUK_AKTIVITET', 'SJUKPENNING_FORALDRAPENNING',
        'SKATTEATERBARING', 'STUDIEMEDEL', 'UNDERHALLSSTOD_EFTERLEVANDEPENSION', 'VANTAD_INKOMST_BESKRIVNING',
        'VANTAD_INKOMST_BELOPP', 'OVRIG_INKOMST_BESKRIVNING', 'OVRIG_INKOMST_BELOPP', 'TILLGANG_BANKMEDEL_VARDE',
        'TILLGANG_BOSTADSRATT_FASTIGHET_VARDE', 'TILLGANG_FORDON_MM_VARDE', 'SKULD_KFM_VARDE', 'FORORDNANDE_DATUM',
        'SALDO_RAKNINGSKONTO_FORORDNANDE', 'HANDLAGGARE', 'KontaktpersonNamn', 'KontaktpersonTel', 'HANDLAGGARE_LSS',
        'HANDLAGGARE_SOCIAL', 'HYRESVARD_NAMN', 'BUDGET_INKOMSTER_NETTO_MANAD', 'BUDGET_UTGIFTER_VERIFIERADE_MANAD',
        'BUDGET_RESULTAT_MANAD', 'FickpengTotalVecka', 'FickpengMondag', 'FickpengTisdag', 'FickpengOnsdag',
        'FickpengTorsdag', 'FickpengFredag', 'KFM_SKULDFORANDRING', 'KFM_LAST_CHECKED_AT', 'KFM_CASE_NO', 'KFM_STATUS',
        'OVERFORMYNDAR_NAMN', 'BoendeKontaktpersonNamn', 'BoendeKontaktpersonTel', 'Omsorgsavgift', 'FickpengarManad',
        'PensionLeverantor', 'BostadsbidragLeverantor', 'HyraLeverantor', 'Omsorgsavgiftleverantor', 'ElLeverantor',
        'HemforsakringLeverantor', 'LakarvardskostnadLeverantor', 'MedicinLeverantor', 'BredbandLeverantor', 'FickpengarLeverantor'
    ];

    $fields = [];
    $params = [];
    
    foreach ($details as $key => $val) {
        if (in_array($key, $WHITELIST, true)) {
            $paramName = ':' . $key;
            $fields[] = "`$key` = $paramName";
            $params[$paramName] = ($val === '' || $val === null) ? null : $val;
        }
    }
    
    if (empty($fields)) {
        $response['success'] = true;
        $response['message'] = 'Inga datafält att uppdatera.';
        echo json_encode($response);
        exit;
    }
    
    $sql = "UPDATE huvudman SET " . implode(', ', $fields) . " WHERE Personnummer = :Personnummer_WHERE";
    $stmt = $pdo->prepare($sql);
    $params[':Personnummer_WHERE'] = $pnr;
    
    if ($stmt->execute($params)) {
        $response['success'] = true;
        $response['message'] = 'Huvudmannens uppgifter har uppdaterats.';
        $response['debug']['sparade_farben'] = count($fields);
    } else {
        $errorInfo = $stmt->errorInfo();
        throw new Exception('Databasfel: ' . ($errorInfo[2] ?? 'Okänt SQL-fel'));
    }

} catch (Exception $e) {
    http_response_code(500);
    $response['success'] = false;
    $response['message'] = $e->getMessage();
}

echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>
