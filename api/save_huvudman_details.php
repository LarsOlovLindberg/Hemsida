<?php
// api/save_huvudman_details.php
// --- KORRIGERAD VERSION ---

require_once __DIR__ . '/auth_check.php';
require_once __DIR__ . '/db_connect.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

$response = ['success' => false, 'message' => 'Ett okänt fel inträffade.'];

try {
    $pdo = get_db_connection();

    // ÄNDRING 1: Acceptera PUT-metoden istället för POST.
    if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
        throw new Exception('Endast PUT-metoden är tillåten för att uppdatera.');
    }

    // ÄNDRING 2: Hämta personnummer från URL:en (query parameter), inte från body.
    // Din JavaScript-URL är /api/save_huvudman_details.php?pnr=...
    if (!isset($_GET['pnr']) || empty($_GET['pnr'])) {
        http_response_code(400);
        throw new Exception('Inget personnummer angivet i URL:en.');
    }
    $pnr = $_GET['pnr'];

    // ÄNDRING 3: Läs in JSON-data från request body istället för $_POST.
    $json_data = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Ogiltig JSON-data skickades från webbläsaren.');
    }

    // FÖRKLARING: Datan från JavaScript ligger i en 'details'-nyckel.
    $details = $json_data['details'] ?? null;
    if (!$details) {
        throw new Exception("Inkommande data saknar den förväntade 'details'-strukturen.");
    }
    
    // Behåll din vitlista för säkerhet
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
        'VANTAD_INKOMST_BELOPP', 'OVRIG_INKOMST_BELOPP', 'TILLGANG_BANKMEDEL_VARDE',
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
    
    // ÄNDRING 4: Läs från $details-arrayen istället för $_POST
    foreach ($details as $key => $val) {
        if (in_array($key, $WHITELIST, true)) {
            $paramName = ':' . $key;
            $fields[] = "`$key` = $paramName";
            $params[$paramName] = ($val === '' || $val === null) ? null : $val;
        }
    }
    
    if (empty($fields)) {
        $response['success'] = true;
        $response['message'] = 'Inga datafält att uppdatera skickades.';
        echo json_encode($response);
        exit;
    }
    
    $sql = "UPDATE huvudman SET " . implode(', ', $fields) . " WHERE Personnummer = :Personnummer_WHERE";
    $stmt = $pdo->prepare($sql);
    
    $params[':Personnummer_WHERE'] = $pnr;
    
    if ($stmt->execute($params)) {
        $response['success'] = true;
        $response['message'] = 'Huvudmannens uppgifter har uppdaterats.';
    } else {
        $errorInfo = $stmt->errorInfo();
        throw new Exception('Databasfel vid uppdatering: ' . ($errorInfo[2] ?? 'Okänt SQL-fel'));
    }

} catch (PDOException $e) {
    http_response_code(500);
    error_log("Databasfel i save_huvudman_details.php: " . $e->getMessage());
    $response = ['success' => false, 'message' => 'Databasfel: ' . $e->getMessage()];
} catch (Exception $e) {
    http_response_code(500);
    error_log("Generellt fel i save_huvudman_details.php: " . $e->getMessage());
    $response = ['success' => false, 'message' => 'Fel: ' . $e->getMessage()];
}

echo json_encode($response);
?>