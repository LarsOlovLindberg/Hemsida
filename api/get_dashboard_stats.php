<?php
header('Content-Type: application/json; charset=utf-8');
$DEBUG = isset($_GET['debug']) && $_GET['debug']=='1';

try {
    require_once('auth_check.php');
    require_once('db_connect.php');

    $pdo = get_db_connection();
    if (!$pdo) throw new Exception("Ingen DB-anslutning.");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $ofId = isset($_GET['of_id']) && $_GET['of_id'] !== '' ? (int)$_GET['of_id'] : null;
    $includeInactive = (isset($_GET['include_inactive']) && $_GET['include_inactive'] == '1');

    // kontrollera att tabell finns
    $pdo->query("SELECT 1 FROM huvudman LIMIT 1");

    // kolla om AKTIV-kolumn finns
    $hasAktiv = false;
    try {
        $chk = $pdo->query("PRAGMA table_info('huvudman')");
        foreach ($chk->fetchAll(PDO::FETCH_ASSOC) as $c) {
            if (strcasecmp($c['name'],'AKTIV')===0) { $hasAktiv = true; break; }
        }
    } catch (Throwable $e) { /* ignore, fallback */ }

    $where = [];
    $params = [];

    if (!$includeInactive && $hasAktiv) {
        $where[] = "COALESCE(AKTIV,1)=1";
    }
    if (!is_null($ofId)) {
        $where[] = "OVERFORMYNDARE_ID = :ofid";
        $params[':ofid'] = $ofId;
    }
    $whereSql = $where ? ('WHERE '.implode(' AND ',$where)) : '';

    $stmt = $pdo->prepare("SELECT COUNT(*) AS total_huvudman FROM huvudman $whereSql");
    $stmt->execute($params);
    $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['total_huvudman'=>0];

    echo json_encode(['ok'=>true,'stats'=>['total_huvudman'=>(int)$row['total_huvudman']]], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(
        $DEBUG ? ['ok'=>false,'error'=>$e->getMessage(),'file'=>$e->getFile(),'line'=>$e->getLine()]
               : ['ok'=>false,'error'=>'Kunde inte hämta statistik.'],
        JSON_UNESCAPED_UNICODE
    );
}
