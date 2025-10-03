<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

// VIKTIGT: Vi kommenterar ut header() tillfälligt för att kunna se felsökningsutskriften tydligt i webbläsaren.
// header('Content-Type: application/json'); 
require_once __DIR__ . '/db_connect.php';

function send_db_columns_error($statusCode, $message, $details = null) {
    http_response_code($statusCode);
    $response = ['error' => $message];
    if ($details) {
        $response['details'] = $details;
    }
    error_log("API Error in get_db_columns.php: " . $message . " | Details: " . print_r($details, true));
    echo json_encode($response);
    exit;
}

try {
    $pdo = get_db_connection();

    $tables_to_check = ['huvudman', 'GodManProfiler', 'Overformyndare'];
    
    $categorized_columns = [
        'Automatiska & Manuella Fält' => [
            'auto.dagens_datum',
            'auto.innevarande_manad',
            'auto.innevarande_ar',
            'manual_text_kort',
            'manual_text_lang',
            'manual_datum',
            'manual_siffra',
            'manual_kryssruta_ja'
        ],
        'Huvudman' => [],
        'God Man' => [],
        'Överförmyndare' => []
    ];

    foreach ($tables_to_check as $table) {
        $stmt = $pdo->query("PRAGMA table_info(" . $pdo->quote($table) . ")");
        $columns_raw = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        

        $current_table_columns = [];
        foreach ($columns_raw as $column) {
            $col_name = $column['name'];
            // Exkludera interna ID-kolumner och statusflaggor
            if (!in_array(strtoupper($col_name), ['ID', 'GODMANID', 'OVERFORMYNDAREID', 'ISCURRENTUSER'])) {
                $current_table_columns[] = $table . '.' . $col_name;
            }
        }

        // Lägg till sammansatta fält för relevanta tabeller
        if ($table === 'huvudman') {
            $current_table_columns[] = 'huvudman.HeltNamn';
            $current_table_columns[] = 'huvudman.FullAdress';
            $current_table_columns[] = 'huvudman.PostnummerOrt';
            $current_table_columns[] = 'huvudman.KontoFullstandigt';
            $categorized_columns['Huvudman'] = $current_table_columns;
        } elseif ($table === 'GodManProfiler') {
            $current_table_columns[] = 'GodManProfiler.HeltNamn';
            $current_table_columns[] = 'GodManProfiler.FullAdress';
            $current_table_columns[] = 'GodManProfiler.PostnummerOrt';
            $current_table_columns[] = 'GodManProfiler.OrtDatum';
            $categorized_columns['God Man'] = $current_table_columns;
        } elseif ($table === 'Overformyndare') {
            $current_table_columns[] = 'Overformyndare.PostnummerOrt';
            $categorized_columns['Överförmyndare'] = $current_table_columns;
        }
    }

    // Sortera kolumnerna inom varje kategori
    foreach ($categorized_columns as $category => &$columns) {
        sort($columns);
    }

    // Sätt tillbaka JSON-headern innan den slutgiltiga utskriften
    header('Content-Type: application/json');
    echo json_encode($categorized_columns);

} catch (Exception $e) {
    send_db_columns_error(500, 'Kunde inte hämta databaskolumner.', $e->getMessage());
}
?>