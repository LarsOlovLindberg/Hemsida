<?php
// api/get_all_huvudman.php
// Returnerar en lista över huvudmän: [{PERSONNUMMER, HELT_NAMN, OVERFORMYNDARE_ID}, …]

// ---- Tvinga JSON och fånga alla fel som JSON ----
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

// Starta output buffering för att fånga all oavsiktlig output
ob_start();

// NY, FÖRBÄTTRAD FELHANTERARE: Konverterar alla PHP-fel till undantag
set_error_handler(function ($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) {
        // This error code is not included in error_reporting
        return;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

// ---- Auth & DB ----
require_once __DIR__ . '/auth_check.php';
require_once __DIR__ . '/db_connect.php';

// ---- Hjälpare ----
function table_exists(PDO $pdo, string $name): bool {
    try {
        $stmt = $pdo->prepare("SELECT name FROM sqlite_master WHERE type='table' AND lower(name)=lower(?) LIMIT 1");
        $stmt->execute([$name]);
        return (bool)$stmt->fetchColumn();
    } catch (PDOException $e) {
        // Om frågan misslyckas, existerar tabellen troligtvis inte eller så är DB-fel.
        return false;
    }
}

function col_exists(PDO $pdo, string $table, string $col): bool {
    try {
        $stmt = $pdo->prepare("PRAGMA table_info(" . $pdo->quote($table) . ")");
        $stmt->execute();
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            if (strcasecmp($r['name'] ?? '', $col) === 0) return true;
        }
        return false;
    } catch (PDOException $e) {
        return false;
    }
}

// Omfattande try-catch som täcker hela skriptet
try {
    $pdo = get_db_connection();

    // ---- Parametrar ----
    $ofnId = $_GET['overformyndareId'] ?? $_GET['ofn_id'] ?? null;
    $q = isset($_GET['q']) ? trim($_GET['q']) : '';
    $includeInactive = isset($_GET['includeInactive']) ? (int)$_GET['includeInactive'] : 0;

    // ---- Verifiera tabell/kolumner ----
    $table = 'huvudman';
    if (!table_exists($pdo, $table)) {
        throw new Exception("Tabellen '$table' finns inte i databasen.");
    }
    $hasPNR   = col_exists($pdo, $table, 'PERSONNUMMER');
    $hasFN    = col_exists($pdo, $table, 'FORNAMN');
    $hasEN    = col_exists($pdo, $table, 'EFTERNAMN');
    $hasHN    = col_exists($pdo, $table, 'HELT_NAMN');
    $hasOFNID = col_exists($pdo, $table, 'OVERFORMYNDARE_ID'); // Korrigerat från OVERFORMYNDAR_ID
    if (!$hasPNR) {
        throw new Exception("Kolumnen PERSONNUMMER saknas i '$table'.");
    }
    
    // ---- Bygg SELECT-lista ----
    $selects = ["PERSONNUMMER"];
    if ($hasHN) {
        $selects[] = "HELT_NAMN";
    } else {
        $nameParts = [];
        if ($hasFN) $nameParts[] = "COALESCE(FORNAMN, '')";
        if ($hasEN) $nameParts[] = "COALESCE(EFTERNAMN, '')";
        if (!empty($nameParts)) {
            $selects[] = "(trim(" . implode(" || ' ' || ", $nameParts) . ")) AS HELT_NAMN";
        }
    }
    if ($hasFN) $selects[] = "FORNAMN";
    if ($hasEN) $selects[] = "EFTERNAMN";
    if ($hasOFNID) $selects[] = "OVERFORMYNDARE_ID"; // Korrigerat
    $selectSql = implode(", ", $selects);
    
    // ---- Bas-SQL + filter ----
    $sql = "SELECT $selectSql FROM $table WHERE 1=1";
    $params = [];
    
    if (!$includeInactive && col_exists($pdo, $table, 'INAKTIV')) {
        $sql .= " AND (INAKTIV IS NULL OR INAKTIV = 0)";
    }
    if ($hasOFNID && $ofnId !== null && $ofnId !== '') {
        $sql .= " AND OVERFORMYNDARE_ID = ?"; // Korrigerat
        $params[] = $ofnId;
    }
    if ($q !== '') {
        $likes = [];
        if ($hasHN || ($hasFN && $hasEN)) $likes[] = "HELT_NAMN LIKE ?";
        if ($hasFN) $likes[] = "FORNAMN LIKE ?";
        if ($hasEN) $likes[] = "EFTERNAMN LIKE ?";
        if ($hasPNR) $likes[] = "PERSONNUMMER LIKE ?";
        if (!empty($likes)) {
            $sql .= " AND (" . implode(" OR ", $likes) . ")";
            $like = "%$q%";
            for ($i = 0; $i < count($likes); $i++) $params[] = $like;
        }
    }
    
    // ---- Sortering ----
	$orderby = [];
	// Prioritera sortering på HELT_NAMN om det finns, annars på delarna.
	if ($hasHN) {
		$orderby[] = "HELT_NAMN COLLATE NOCASE";
	} elseif ($hasFN) {
		$orderby[] = "FORNAMN COLLATE NOCASE";
	} elseif ($hasEN) {
		$orderby[] = "EFTERNAMN COLLATE NOCASE";
	}

	if (!empty($orderby)) {
		$sql .= " ORDER BY " . implode(", ", $orderby);
	} elseif ($hasPNR) {
		// Fallback till att sortera på personnummer om inga namnkolumner alls finns
		$sql .= " ORDER BY PERSONNUMMER";
	}
    // ---- Kör ----
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $out = [];
    foreach ($rows as $r) {
        $namn = $r['HELT_NAMN'] ?? '';
        if ($namn === '' && ($hasFN || $hasEN)) {
            $fn = $r['FORNAMN']  ?? '';
            $en = $r['EFTERNAMN'] ?? '';
            $namn = trim("$fn $en");
        }
        $out[] = [
            'PERSONNUMMER'     => $r['PERSONNUMMER'] ?? null,
            'HELT_NAMN'        => $namn,
            'OVERFORMYNDARE_ID' => $hasOFNID ? ($r['OVERFORMYNDARE_ID'] ?? null) : null, // Korrigerat
        ];
    }
    
    // Töm bufferten och skicka det rena JSON-svaret
    ob_end_clean();
    echo json_encode($out, JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    // Om något fel inträffar, fånga det och skicka ett JSON-felmeddelande
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['error' => "PHP-fel: " . $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()], JSON_UNESCAPED_UNICODE);
}