<?php
// ================================================
// generate_pdf.php — Fyller Acrobat-formulär (AcroForm) med pdftk (SQLite)
// ================================================

ini_set('display_errors', 0);
error_reporting(E_ALL);

// -------------------------------------------------
// KONFIG
// -------------------------------------------------
$PDFTK_BIN = getenv('PDFTK_BIN') ?: '/usr/bin/pdftk'; // Windows: "C:\\\\Program Files\\\\PDFtk\\\\bin\\\\pdftk.exe"

// -------------------------------------------------
// FEL/JSON
// -------------------------------------------------
function send_generator_error($statusCode, $message, $details = null) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    $resp = ['error' => $message];
    if ($details) $resp['details'] = $details;
    error_log("generate_pdf.php: {$message} | " . print_r($details, true));
    echo json_encode($resp, JSON_UNESCAPED_UNICODE);
    exit;
}

// -------------------------------------------------
// PDFTK-HJÄLP
// -------------------------------------------------
function run_pdftk_cmd(string $cmd): array {
    exec($cmd . " 2>&1", $lines, $code);
    return [$code, implode("\n", $lines)];
}

function run_pdftk(string $templatePath, string $fdfPath, string $outPath, bool $flatten=false): array {
    global $PDFTK_BIN;
    $tpl = escapeshellarg($templatePath);
    $fdf = escapeshellarg($fdfPath);
    $out = escapeshellarg($outPath);
    $flattenFlag = $flatten ? " flatten" : "";
    $cmd = escapeshellarg($PDFTK_BIN) . " $tpl fill_form $fdf output $out$flattenFlag";
    return run_pdftk_cmd($cmd);
}

function dump_pdf_fields(string $templatePath): array {
    global $PDFTK_BIN;
    $tpl = escapeshellarg($templatePath);
    $cmd = escapeshellarg($PDFTK_BIN) . " $tpl dump_data_fields_utf8";
    return run_pdftk_cmd($cmd);
}

/** Bygg FDF för pdftk fill_form */
function build_fdf(array $fields): string {
    $esc = function($s) {
        $s = (string)$s;
        $s = str_replace("\\", "\\\\", $s);
        $s = str_replace("(", "\\(", $s);
        $s = str_replace(")", "\\)", $s);
        $s = str_replace("\r", "", $s);
        $s = str_replace("\n", "\\n", $s);
        return $s;
    };
    $out  = "%FDF-1.2\n";
    $out .= "1 0 obj\n<< /FDF << /Fields [\n";
    foreach ($fields as $name => $value) {
        $out .= "<< /T ({$esc($name)}) /V ({$esc($value)}) >>\n";
    }
    $out .= "] >> >>\nendobj\n";
    $out .= "trailer\n<< /Root 1 0 R >>\n%%EOF\n";
    return $out;
}

function write_tmp(string $prefix, string $content): string {
    $dir = sys_get_temp_dir();
    $path = tempnam($dir, $prefix);
    file_put_contents($path, $content);
    return $path;
}

// -------------------------------------------------
// DEFAULT-MAPPNING (PDF-fält -> HM-fält)
// -------------------------------------------------
function uv_default_field_map(): array {
    return [
        // Personuppgifter – sökande
        'Sokande_Namn'                    => ['FORNAMN', 'EFTERNAMN'],
        'Sokande_Personnummer'            => 'PERSONNUMMER',
        'Sokande_Medborgarskap'           => 'MEDBORGARSKAP',
        'heltNamn'                        => ['FORNAMN', 'EFTERNAMN'],
        'heltNamn#0'                      => ['FORNAMN', 'EFTERNAMN'],
        'personnummer'                    => 'PERSONNUMMER',

        // Personuppgifter – medsökande
        'Medsokande_Namn'                 => ['MEDSOKANDE_FORNAMN', 'MEDSOKANDE_EFTERNAMN'],
        'Medsokande_Personnummer'         => 'MEDSOKANDE_PERSONNUMMER',
        'Medsokande_Medborgarskap'        => 'MEDSOKANDE_MEDBORGARSKAP',
        'medsokandePersonnummer'          => 'MEDSOKANDE_PERSONNUMMER',

        // Kontaktuppgifter
        'Adress'                          => 'ADRESS',
        'adress'                          => 'ADRESS',
        'Postnummer'                      => 'POSTNUMMER',
        'postnummer'                      => 'POSTNUMMER',
        'Ort'                             => 'ORT',
        'ort'                             => 'ORT',
        'Telefon'                         => 'TELEFON',
        'telefon'                         => 'TELEFON',
        'Epost'                           => 'EPOST',
        'epost'                           => 'EPOST',

        // Boende
        'Boende_Namn'                     => 'BOENDE_NAMN',
        'Boende_Typ'                      => 'BOSTAD_TYP',
        'Boende_AntalRum'                 => 'BOSTAD_ANTAL_RUM',
        'Boende_AntalBoende'              => 'BOSTAD_ANTAL_BOENDE',
        'Boende_Kontraktstid'             => 'BOSTAD_KONTRAKTSTID',
        'boendeNamn'                      => 'BOENDE_NAMN',
        'bostadAntalrum'                  => 'BOSTAD_ANTAL_RUM',
        'bostadAntalBoende'               => 'BOSTAD_ANTAL_BOENDE',
        'Bostad_Adress'                   => 'ADRESS',
        'Bostad_Postnummer'               => 'POSTNUMMER',
        'Bostad_Ort'                      => 'ORT',
        'Bostad_Typ_AnnanText'            => 'BOSTAD_TYP',
        'Bostad_Hyresvard'                => 'BOSTAD_HYRESVARD',
        'Bostad_TelefonSokande'           => 'TELEFON',

        // Sysselsättning / Inkomsttyp
        'Sysselsattning'                  => 'SYSSELSATTNING',
        'sysselsattning'                  => 'SYSSELSATTNING',
        'Sysselsattning_Sokande'          => 'SYSSELSATTNING',
        'Sysselsattning_Medsokande'       => 'MEDSOKANDE_SYSSELSATTNING',
        'Inkomsttyp'                      => 'INKOMSTTYP',

    // Handläggare & god man
    'Handlaggare'                     => ['HANDLAGGARE', 'ANSOKAN_HANDLAGGARE', 'FS_KOMMUNHANDLAGGARE', 'FS_KommunHandlaggare'],
    'Ansokan_Handlaggare'             => ['ANSOKAN_HANDLAGGARE', 'HANDLAGGARE', 'FS_KOMMUNHANDLAGGARE', 'FS_KommunHandlaggare'],
    'kommunHandlaggare'               => ['FS_KOMMUNHANDLAGGARE', 'FS_KommunHandlaggare', 'HANDLAGGARE', 'ANSOKAN_HANDLAGGARE'],
    'God_man_Namn'                    => 'GODMAN_NAMN',
    'gm.heltNamn'                     => 'GODMAN_NAMN',
    'Godman_HeltNamn'                 => 'GODMAN_NAMN',

    // Datum & period
    'Datum'                           => '__TODAY__',
    'datum'                           => '__TODAY__',
    'Ansokan_Datum'                   => '__TODAY__',
    'Ort_Datum'                       => '__TODAY__',
    'Ansokan_AvserManad'              => ['ANSOKAN_AVSER_MANAD', 'FS_AnsokanAvserManad_Sparad', 'FS_ANSOKAN_AVSER_MANAD_SPARAD'],
    'Ansokan_AvserAr'                 => ['ANSOKAN_AVSER_AR', 'FS_AnsokanAvserAr_Sparad', 'FS_ANSOKAN_AVSER_AR_SPARAD'],
    'manad'                           => ['ANSOKAN_AVSER_MANAD', 'FS_AnsokanAvserManad_Sparad', 'FS_ANSOKAN_AVSER_MANAD_SPARAD'],

        // Kostnader
        'hyra'                            => 'HYRA',
        'Kostnad_Hyra'                    => 'HYRA',
        'Ansokan_Kostnad_Hyra'            => 'HYRA',
        'elKostnad'                       => 'EL_KOSTNAD',
        'Kostnad_ElKostnad'               => 'EL_KOSTNAD',
    'Ansokan_Kostnad_Hushallsel'      => ['HUSHALLSEL', 'EL_KOSTNAD'],
        'Kostnad_Hushallsel'              => 'HUSHALLSEL',
        'hemforsakring'                   => 'HEMFORSAKRING',
        'Kostnad_Hemforsakring'           => 'HEMFORSAKRING',
        'Ansokan_Kostnad_Hemforsakring'   => 'HEMFORSAKRING',
        'fackAvgiftAkassa'                => 'FACK_AVGIFT_AKASSA',
        'Kostnad_FackAvgift'              => 'FACK_AVGIFT_AKASSA',
    'Ansokan_Kostnad_Fackavgift'      => ['FACKAVGIFT', 'FACK_AVGIFT_AKASSA'],
        'reskostnader'                    => 'RESKOSTNADER',
        'Kostnad_Reskostnader'            => 'RESKOSTNADER',
    'Ansokan_Kostnad_Arbetsresor'     => ['ARBETSKOSTNADER_RESOR', 'RESKOSTNADER'],
        'medicinkostnad'                  => 'MEDICIN_KOSTNAD',
        'Kostnad_Medicin'                 => 'MEDICIN_KOSTNAD',
    'Ansokan_Kostnad_MedicinRecept'   => ['MEDICIN_RECEPT', 'MEDICIN_KOSTNAD'],
        'lakarvardskostnad'               => 'LAKARVARDSKOSTNAD',
        'Kostnad_Lakarvard'               => 'LAKARVARDSKOSTNAD',
    'Ansokan_Kostnad_Lakarvard'       => ['LAKARVARD', 'LAKARVARDSKOSTNAD'],
        'barnomsorgAvgift'                => 'BARNOMSORG_AVGIFT',
        'Kostnad_Barnomsorg'              => 'BARNOMSORG_AVGIFT',
    'Ansokan_Kostnad_Barnomsorg'      => ['BARNOMSORG', 'BARNOMSORG_AVGIFT'],
        'fardtjanstAvgift'                => 'FARDTJANST_AVGIFT',
        'Kostnad_Fardtjanst'              => 'FARDTJANST_AVGIFT',
    'Ansokan_Kostnad_Fardtjanst'      => ['FARDTJANST', 'FARDTJANST_AVGIFT'],
        'akutTandvardskostnad'            => 'AKUT_TANDVARDSKOSTNAD',
        'Kostnad_Tandvard'                => 'AKUT_TANDVARDSKOSTNAD',
    'Ansokan_Kostnad_Tandvard'        => ['AKUT_TANDVARDSKOSTNAD', 'TANDVARD'],
        'bredband'                        => 'BREDBAND',
        'Kostnad_Bredband'                => 'BREDBAND',
    'Ansokan_Kostnad_Bredband'        => ['INTERNET_BREDBAND', 'BREDBAND'],
        'ovrigKostnadBeskrivning'         => 'OVRIG_KOSTNAD_BESKRIVNING',
        'Ansokan_Kostnad_AnnatText'       => 'OVRIG_KOSTNAD_BESKRIVNING',
        'Kostnad_AnnatBeskrivning'        => 'OVRIG_KOSTNAD_BESKRIVNING',
        'ovrigKostnadBelopp'              => 'OVRIG_KOSTNAD_BELOPP',
        'Kostnad_Ovrig'                   => 'OVRIG_KOSTNAD_BELOPP',
        'Ansokan_Kostnad_AnnatBelopp'     => 'OVRIG_KOSTNAD_BELOPP',

        // Inkomster – sökande
        'Inkomst_Lon'                     => 'LON',
        'Inkomst_Arbetslon_Sokande'       => 'LON',
        'Inkomst_PrivPensionUnderhall_Sokande' => 'PENSION_LIVRANTA_SJUK_AKTIVITET',
        'Inkomst_Pension'                 => 'PENSION_LIVRANTA_SJUK_AKTIVITET',
        'Inkomst_Sjukpenning'             => 'SJUKPENNING_FORALDRAPENNING',
        'Inkomst_Arbetsloshetsersattning' => 'ARBETSLOSHETSERSTATTNING',
        'Inkomst_Bostadsbidrag'           => 'BOSTADSBIDRAG',
        'Inkomst_Barnbidrag'              => 'BARNBIDRAG_STUDIEBIDRAG',
        'Inkomst_Barn_Sokande'            => 'BARNBIDRAG_STUDIEBIDRAG',
        'Inkomst_Underhallsstod'          => 'UNDERHALLSSTOD_EFTERLEVANDEPENSION',
        'Inkomst_Etablering'              => 'ETABLERINGSERSATTNING',
        'Inkomst_AktieIntakt'             => 'HYRESINTAKT_INNEBOENDE',
        'Inkomst_HyraInneboende_Sokande'  => 'HYRESINTAKT_INNEBOENDE',
        'Inkomst_BarnsInkomst'            => 'BARNS_INKOMST',
        'Inkomst_Skatteaterbaring'        => 'SKATTEATERBARING',
        'Inkomst_Studiemedel'             => 'STUDIEMEDEL',
        'Inkomst_Ovrig'                   => 'OVRIG_INKOMST_BELOPP',
        'Inkomst_OvrigBelopp_Sokande'     => 'OVRIG_INKOMST_BELOPP',
        'Inkomst_OvrigVad_Sokande'        => 'OVRIG_INKOMST_BESKRIVNING',
        'Inkomst_OvrigDatum_Sokande'      => 'OVRIG_INKOMST_DATUM',
        'Inkomst_VantadVad_Sokande'       => 'VANTAD_INKOMST_BESKRIVNING',
        'Inkomst_VantadDatum_Sokande'     => 'VANTAD_INKOMST_DATUM',
        'Inkomst_SaknarHelt_Sokande'      => 'SAKNAR_INKOMST',
        'Inkomst_Utlandet_Sokande'        => 'INKOMST_UTLANDET',
        'Inkomst_Utlandet_Datum_Sokande'  => 'INKOMST_UTLANDET_DATUM',
        'Inkomst_SpelLotteri_Sokande'     => 'INKOMST_SPEL_LOTTERI',
    'Inkomst_SpelLotteri_Datum_Sokande' => 'SPEL_LOTTERI_DATUM',

        // Inkomster – medsökande
        'Inkomst_Arbetslon_Medsokande'    => 'MEDSOKANDE_LON',
        'Inkomst_Barn_Medsokande'         => 'MEDSOKANDE_BARNBIDRAG',
        'Inkomst_HyraInneboende_Medsokande' => 'MEDSOKANDE_HYRESINTAKT',
        'Inkomst_PrivPensionUnderhall_Medsokande' => 'MEDSOKANDE_PENSION',
        'Inkomst_OvrigBelopp_Medsokande'  => 'MEDSOKANDE_OVRIG_INKOMST_BELOPP',
        'Inkomst_OvrigDatum_Medsokande'   => 'MEDSOKANDE_OVRIG_INKOMST_DATUM',
        'Inkomst_VantadVad_Medsokande'    => 'MEDSOKANDE_VANTAD_INKOMST_BESKRIVNING',
        'Inkomst_VantadDatum_Medsokande'  => 'MEDSOKANDE_VANTAD_INKOMST_DATUM',
        'Inkomst_Utlandet_Medsokande'     => 'MEDSOKANDE_INKOMST_UTLANDET',
        'Inkomst_Utlandet_Datum_Medsokande' => 'MEDSOKANDE_INKOMST_UTLANDET_DATUM',
        'Inkomst_SpelLotteri_Medsokande'  => 'MEDSOKANDE_SPEL_LOTTERI',
        'Inkomst_SpelLotteri_Datum_Medsokande' => 'MEDSOKANDE_SPEL_LOTTERI_DATUM',

        // Övrigt
        'ovrigaUpplysningar'              => 'ARSR_OVRIGA_UPPLYSNINGAR',
        'Ansokan_OvrigInfoHandlaggare'    => 'ARSR_OVRIGA_UPPLYSNINGAR',

        // Bankuppgifter
        'Bank_Sökande'                    => 'Bank_Sökande',
        'Clearingnummer_Sökande'          => 'Clearingnummer_Sökande',
        'Kontonummer_Sökande'             => 'Kontonummer_Sökande',
    ];
}

// Case-insensitive HM-getter (hanterar “huvudman.ADRESS”, camel/underscore)
function hm_get_ci(array $hm, string $key) {
    $ci = [];
    foreach ($hm as $k => $v) $ci[strtolower($k)] = $v;
    $key = trim($key);
    $parts = explode('.', $key);
    $last  = end($parts);

    $cands = [];
    $cands[] = $last;
    $cands[] = strtolower($last);
    $cands[] = strtoupper($last);
    $cands[] = ucfirst(strtolower($last));
    $cands[] = str_replace('_','', strtolower(preg_replace('/([a-z])([A-Z])/', '$1_$2', $last)));

    foreach (array_unique($cands) as $cand) {
        $l = strtolower($cand);
        if (array_key_exists($l, $ci)) return $ci[$l];
    }
    return null;
}

// Bygg PDF-värden från HM
function build_pdf_values_uv_default(array $hm): array {
    $map = uv_default_field_map();

    $numericPdfFields = [
        'hyra','Kostnad_Hyra','Ansokan_Kostnad_Hyra',
        'elKostnad','Kostnad_ElKostnad','Kostnad_Hushallsel','Ansokan_Kostnad_Hushallsel',
        'hemforsakring','Kostnad_Hemforsakring','Ansokan_Kostnad_Hemforsakring',
        'fackAvgiftAkassa','Kostnad_FackAvgift','Ansokan_Kostnad_Fackavgift',
        'reskostnader','Kostnad_Reskostnader','Ansokan_Kostnad_Arbetsresor',
        'medicinkostnad','Kostnad_Medicin','Ansokan_Kostnad_MedicinRecept',
        'lakarvardskostnad','Kostnad_Lakarvard','Ansokan_Kostnad_Lakarvard',
        'barnomsorgAvgift','Kostnad_Barnomsorg','Ansokan_Kostnad_Barnomsorg',
        'fardtjanstAvgift','Kostnad_Fardtjanst','Ansokan_Kostnad_Fardtjanst',
        'akutTandvardskostnad','Kostnad_Tandvard','Ansokan_Kostnad_Tandvard',
        'bredband','Kostnad_Bredband','Ansokan_Kostnad_Bredband',
        'ovrigKostnadBelopp','Kostnad_Ovrig','Ansokan_Kostnad_AnnatBelopp',
        'Inkomst_Lon','Inkomst_Pension','Inkomst_Sjukpenning','Inkomst_Arbetsloshetsersattning',
        'Inkomst_Bostadsbidrag','Inkomst_Barnbidrag','Inkomst_Underhallsstod','Inkomst_Etablering',
        'Inkomst_AktieIntakt','Inkomst_BarnsInkomst','Inkomst_Skatteaterbaring','Inkomst_Studiemedel',
        'Inkomst_Ovrig','Inkomst_OvrigBelopp_Sokande','Inkomst_OvrigBelopp_Medsokande',
        'Inkomst_Arbetslon_Sokande','Inkomst_Arbetslon_Medsokande',
        'Inkomst_HyraInneboende_Sokande','Inkomst_HyraInneboende_Medsokande',
        'Inkomst_PrivPensionUnderhall_Sokande','Inkomst_PrivPensionUnderhall_Medsokande'
    ];

    $vals = [];
    foreach ($map as $pdfField => $hmKey) {
        $val = '';

        if ($hmKey === '__TODAY__') {
            $val = date('Y-m-d');
        } elseif (is_array($hmKey)) {
            $upperKeys = array_map('strtoupper', $hmKey);
            $hasFirstName = false;
            $hasLastName = false;
            foreach ($upperKeys as $uk) {
                if (strpos($uk, 'FORNAM') !== false) $hasFirstName = true;
                if (strpos($uk, 'EFTERNAM') !== false) $hasLastName = true;
            }

            if (count($hmKey) === 2 && $hasFirstName && $hasLastName) {
                $first = hm_get_ci($hm, $hmKey[0]);
                $second = hm_get_ci($hm, $hmKey[1]);
                $val = trim(trim((string)($first ?? '')) . ' ' . trim((string)($second ?? '')));
            } else {
                foreach ($hmKey as $candidateKey) {
                    $candidateValue = hm_get_ci($hm, $candidateKey);
                    if ($candidateValue !== null && $candidateValue !== '') {
                        $val = $candidateValue;
                        break;
                    }
                }
            }
        } else {
            $val = hm_get_ci($hm, is_string($hmKey) ? $hmKey : (string)$hmKey);
        }

        if ($val !== null && $val !== '' && in_array($pdfField, $numericPdfFields, true)) {
            $s = str_replace(',', '.', (string)$val);
            if (is_numeric($s)) $val = $s;
        }

        $vals[$pdfField] = $val ?? '';
    }

    // Case-räddning (om PDF:en råkar använda stor bokstav)
    if (isset($vals['adress']) && $vals['adress'] !== '' && !isset($vals['Adress'])) {
        $vals['Adress'] = $vals['adress'];
    }
    if (isset($vals['postnummer']) && $vals['postnummer'] !== '' && !isset($vals['Postnummer'])) {
        $vals['Postnummer'] = $vals['postnummer'];
    }
    if (isset($vals['ort']) && $vals['ort'] !== '' && !isset($vals['Ort'])) {
        $vals['Ort'] = $vals['ort'];
    }

    return $vals;
}

// -------------------------------------------------
// PARAMETRAR
// -------------------------------------------------
$pnr        = $_GET['pnr']        ?? null;
$templateId = isset($_GET['templateId']) ? (int)$_GET['templateId'] : 0;
$debug      = isset($_GET['debug']) && $_GET['debug'] == '1';
$test       = $_GET['test'] ?? null;

if (!$pnr || $templateId <= 0) {
    send_generator_error(400, 'Personnummer och mall-ID krävs.');
}

// -------------------------------------------------
// DB
// -------------------------------------------------
require_once __DIR__ . '/db_connect.php';
try {
    $pdo = get_db_connection(); // ska ge en PDO kopplad till din SQLite-fil
} catch (Exception $e) {
    send_generator_error(500, 'Kunde inte ansluta till databasen.', $e->getMessage());
}

// -------------------------------------------------
// HÄMTA UNDERLAG
// -------------------------------------------------
try {
    // Huvudman (tabell: huvudman, kolumn: Personnummer i din SQLite)
    $stmt = $pdo->prepare("SELECT * FROM huvudman WHERE LOWER(Personnummer) = LOWER(?)");
    $stmt->execute([$pnr]);
    $hm = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$hm) send_generator_error(404, 'Huvudman hittades inte i databasen.');

    // God man (frivilligt, används för gm.heltNamn)
    try {
        $gmStmt = $pdo->query("SELECT * FROM GodManProfiler WHERE IsCurrentUser = 1 LIMIT 1");
        $gm = $gmStmt ? ($gmStmt->fetch(PDO::FETCH_ASSOC) ?: []) : [];
        if (!isset($hm['GODMAN_NAMN']) && isset($gm['FullName'])) {
            $hm['GODMAN_NAMN'] = $gm['FullName'];
        }
    } catch (\Throwable $e) {
        // Ignorera om tabellen saknas
    }

    // Mallfil (tabell: PdfTemplates, kolumner: ID, StoredFilename)
    $tStmt = $pdo->prepare("SELECT StoredFilename FROM PdfTemplates WHERE ID = ?");
    $tStmt->execute([$templateId]);
    $tpl = $tStmt->fetch(PDO::FETCH_ASSOC);
    if (!$tpl) send_generator_error(404, 'PDF-mall hittades inte.');

    $templatePath = __DIR__ . '/pdf_templates/' . $tpl['StoredFilename'];
    if (!is_file($templatePath)) {
        send_generator_error(404, 'Mallfil saknas på servern.', $templatePath);
    }

} catch (Exception $e) {
    send_generator_error(500, 'Fel vid hämtning av underlag.', $e->getMessage());
}

// -------------------------------------------------
// TEST-LÄGEN
// -------------------------------------------------
if ($test === 'pdftk') {
    [$code,$out] = run_pdftk_cmd(escapeshellarg($PDFTK_BIN) . " --version");
    header('Content-Type: text/plain; charset=utf-8');
    echo "pdftk exit=$code\n$out";
    exit;
}
if ($test === 'fields') {
    [$code,$out] = dump_pdf_fields($templatePath);
    header('Content-Type: text/plain; charset=utf-8');
    echo "dump_data_fields_utf8 exit=$code\n\n$out";
    exit;
}

// -------------------------------------------------
// BYGG FÄLTVÄRDEN
// -------------------------------------------------
$pdfValues = build_pdf_values_uv_default($hm);

// Debug: visa vilka värden vi fyller
if ($debug) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'template'  => basename($templatePath),
        'pdfValues' => $pdfValues,
    ], JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT);
    exit;
}

// -------------------------------------------------
// FYLL & SKICKA PDF
// -------------------------------------------------
try {
    $fdf     = build_fdf($pdfValues);
    $fdfPath = write_tmp("uv_", $fdf);
    $outPath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'Ansokan_' . preg_replace('/\D+/', '', $pnr) . '_' . uniqid() . '.pdf';

    [$code, $stderr] = run_pdftk($templatePath, $fdfPath, $outPath, /*flatten*/ false);
    if ($code !== 0 || !is_file($outPath)) {
        throw new Exception("pdftk misslyckades (kod $code): $stderr");
    }

    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="Ansokan_'.$pnr.'.pdf"');
    header('Content-Length: ' . filesize($outPath));
    readfile($outPath);

    @unlink($fdfPath);
    @unlink($outPath);
    exit;

} catch (Exception $e) {
    send_generator_error(500, 'Fel vid generering/fyllning av PDF (pdftk).', $e->getMessage());
}
