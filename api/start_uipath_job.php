<?php
/*********************************************************************
 * start_uipath_job.php  ·  20 jun 2025  (v1.3 – slutlig helfil)
 * -------------------------------------------------------------------
 * • Hämtar access-token via client_credentials
 * • Startar processen “Betala Fakturor2” i modern folder 6845431
 * • Loggar varje HTTP-anrop till serverns error_log
 *********************************************************************/

/* ===== 1. BAS-KONFIGURERING ===================================== */
$clientId           = '61e7e04a-7cd5-4366-8d63-bc725e98ea7a';
$clientSecret       = '2SV#ju2I$)wQmZZU';
$accountLogicalName = 'larslindberggodman';
$tenantName         = 'DefaultTenant';

$organizationUnitId = '6845431';                          // modern folder-ID
$releaseKey         = 'd3a46b56-c0fd-48bf-9bdf-e4f26a2cfa75'; // ReleaseKey GUID

/* ===== 2. PHP-FELLOGGNING & HTTP-HEADERS ======================== */
ini_set('display_errors', 0);            // byt till 1 vid felsökning
error_reporting(E_ALL);

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

/* ===== 3. GENERELL cURL-FUNKTION ================================ */
function api_request(
    string  $url,
    string  $method   = 'GET',
    array   $headers  = [],
             $body    = null,
    bool    $asJson   = false
): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_SSL_VERIFYPEER => false,   // sätt true + CA-fil i produktion
        CURLOPT_SSL_VERIFYHOST => false,
    ]);

    if ($body !== null) {
        $payload = $asJson
            ? json_encode($body, JSON_UNESCAPED_UNICODE)
            : http_build_query($body);
        $headers[] = $asJson
            ? 'Content-Type: application/json'
            : 'Content-Type: application/x-www-form-urlencoded';

        /* “Expect:” hindrar cURL från att skicka 100-continue → slipper HTTP 411 */
        $headers[] = 'Expect:';
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    }

    if ($headers) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }

    $raw    = curl_exec($ch);
    $http   = curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: 0;
    $err    = curl_error($ch);
    curl_close($ch);

    error_log("[UIPATH] {$method} {$url} → {$http}  {$raw}");
    return ['http' => $http, 'body' => $raw, 'err' => $err];
}

/* ===== 4. HÄMTA ACCESS-TOKEN =================================== */
$tokenUrl = 'https://cloud.uipath.com/identity_/connect/token';   // global endpoint

$tokenResp = api_request(
    $tokenUrl,
    'POST',
    [],
    [
        'grant_type'    => 'client_credentials',
        'client_id'     => $clientId,
        'client_secret' => $clientSecret,
        'scope'         => 'OR.Jobs.Write OR.Folders.Read OR.Execution.Read'
    ]
);

if ($tokenResp['http'] !== 200) {
    http_response_code(500);
    echo json_encode(['success' => false, 'step' => 'auth', 'detail' => $tokenResp]);
    exit;
}

$accessToken = json_decode($tokenResp['body'], true)['access_token'] ?? '';
if (!$accessToken) {
    http_response_code(500);
    echo json_encode(['success' => false, 'msg' => 'access_token saknas']);
    exit;
}

/* ===== 5. DATA FRÅN FRONTEND =================================== */
$req        = json_decode(file_get_contents('php://input'), true) ?: [];
$bank       = $req['bank'] ?? 'Okänd Bank';
$fakturaDir = "C:\\Users\\lars-\\OneDrive\\Skrivbord\\FakturaTest\\Nya";

/* ===== 6. STARTA JOBBET ======================================= */
$jobsUrl = "https://cloud.uipath.com/{$accountLogicalName}/{$tenantName}/orchestrator_/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs";

$jobBody = [
    'startInfo' => [
        'ReleaseKey'     => $releaseKey,
        'Strategy'       => 'ModernJobsCount',
        'JobsCount'      => 1,
        'InputArguments' => json_encode([
            'in_Bank'        => $bank,
            'in_FakturaMapp' => $fakturaDir
        ], JSON_UNESCAPED_UNICODE)
    ]
];

$jobResp = api_request(
    $jobsUrl,
    'POST',
    [
        "Authorization: Bearer {$accessToken}",
        "X-UIPATH-OrganizationUnitId: {$organizationUnitId}"
    ],
    $jobBody,
    true
);

/* ===== 7. SVARA TILL WEBBKLienten ============================== */
if ($jobResp['http'] === 201) {
    echo json_encode(['success' => true, 'msg' => 'Jobb startat – kontrollera Orchestrator › Jobs']);
} else {
    http_response_code($jobResp['http'] ?: 500);
    echo json_encode([
        'success' => false,
        'step'    => 'start',
        'detail'  => $jobResp
    ]);
}
?>
