<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db_connect.php';
$ok = $pdo->query("SELECT 1")->fetchColumn();
$cnt = $pdo->query("SELECT COUNT(*) FROM huvudman")->fetchColumn();
echo json_encode(['ok'=>$ok ? true:false, 'huvudman_rows'=>(int)$cnt]);
