<?php
/**
 * api/portfolios.php - server-side storage for CS100 Power Up!
 *
 * GET  -> returns all portfolios (JSON array)
 * POST -> receives a JSON array of portfolios, validates EVERYTHING again,
 *         merges it into the stored data (by portfolio id and item id), saves.
 *
 * The data file is kept OUTSIDE the web folder (/var/www/data) so nobody can
 * download it with a URL. Only this script reads and writes it.
 */

declare(strict_types=1);

ini_set('display_errors', '0');

const DATA_DIR       = '/var/www/data';
const DATA_FILE      = DATA_DIR . '/portfolios.json';
const LOCK_FILE      = DATA_DIR . '/portfolios.lock';
const MAX_BODY_BYTES = 1048576;   // 1 MB
const MAX_PORTFOLIOS = 500;
const MAX_ITEMS      = 200;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

/* ---------- responses ---------- */
function respond(int $status, $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(int $status, string $message, array $details = []): void
{
    respond($status, ['error' => $message, 'details' => array_slice($details, 0, 20)]);
}

/* ---------- small validators ---------- */
function is_list_array($v): bool
{
    return is_array($v) && ($v === [] || array_keys($v) === range(0, count($v) - 1));
}

function char_len(string $s): int
{
    $n = preg_match_all('/./us', $s);   // false when the text is not valid UTF-8
    return $n === false ? PHP_INT_MAX : $n;
}

function text_ok($v, int $min, int $max): bool
{
    if (!is_string($v)) return false;
    if (preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $v)) return false;
    if (char_len($v) > $max) return false;
    return char_len(trim($v)) >= $min;
}

function id_ok($v): bool
{
    return is_string($v) && preg_match('/^[A-Za-z0-9._-]{1,100}$/', $v) === 1;
}

function date_ok($v): bool
{
    if (!is_string($v) || preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) !== 1) return false;
    [$y, $m, $d] = array_map('intval', explode('-', $v));
    return checkdate($m, $d, $y) && $y >= 1900 && $y <= 2100;
}

function url_ok($v): bool
{
    if (!is_string($v) || strlen($v) > 500) return false;
    if (preg_match('/\s|[\x00-\x1F\x7F]/', $v)) return false;
    $p = parse_url($v);
    if ($p === false) return false;
    $scheme = strtolower($p['scheme'] ?? '');
    return ($scheme === 'http' || $scheme === 'https') && !empty($p['host']);
}

/* ---------- validate + rebuild (only known fields are kept) ---------- */
function clean_item($it, string $path, array &$err): ?array
{
    if (!is_array($it)) {
        $err[] = "$path must be an object";
        return null;
    }
    $before = count($err);

    if (!id_ok($it['id'] ?? null))                       $err[] = "$path.id is invalid";
    if (!text_ok($it['title'] ?? null, 1, 150))          $err[] = "$path.title is required (max 150 characters)";
    if (!text_ok($it['type'] ?? null, 1, 80))            $err[] = "$path.type is required";
    if (!date_ok($it['date'] ?? null))                   $err[] = "$path.date must be a real date as YYYY-MM-DD";
    if (!text_ok($it['role'] ?? null, 1, 100))           $err[] = "$path.role is required";
    if (!text_ok($it['description'] ?? null, 1, 2000))   $err[] = "$path.description is required (max 2000 characters)";

    $skills = $it['skills'] ?? null;
    if (!is_list_array($skills) || count($skills) > 30) {
        $err[] = "$path.skills must be a list of up to 30 texts";
    } else {
        foreach ($skills as $i => $s) {
            if (!text_ok($s, 1, 50)) $err[] = "$path.skills[$i] must be text (1-50 characters)";
        }
    }

    $refl = $it['reflection'] ?? null;
    $reflKeys = ['whatIDid', 'whatILearned', 'challenge', 'nextStep'];
    if (!is_array($refl)) {
        $err[] = "$path.reflection must be an object";
    } else {
        foreach ($reflKeys as $k) {
            if (!text_ok($refl[$k] ?? null, 0, 2000)) $err[] = "$path.reflection.$k must be text (max 2000 characters)";
        }
    }

    $ev = $it['evidence'] ?? null;
    if (!is_list_array($ev) || count($ev) > 20) {
        $err[] = "$path.evidence must be a list of up to 20 links";
    } else {
        foreach ($ev as $i => $u) {
            if (!url_ok($u)) $err[] = "$path.evidence[$i] must be a valid http(s) link";
        }
    }

    if (count($err) > $before) return null;

    return [
        'id'          => $it['id'],
        'title'       => $it['title'],
        'type'        => $it['type'],
        'date'        => $it['date'],
        'role'        => $it['role'],
        'description' => $it['description'],
        'skills'      => array_values($skills),
        'reflection'  => [
            'whatIDid'     => $refl['whatIDid'],
            'whatILearned' => $refl['whatILearned'],
            'challenge'    => $refl['challenge'],
            'nextStep'     => $refl['nextStep'],
        ],
        'evidence'    => array_values($ev),
    ];
}

function clean_portfolio($p, string $path, array &$err): ?array
{
    if (!is_array($p)) {
        $err[] = "$path must be an object";
        return null;
    }
    $before = count($err);

    if (!id_ok($p['id'] ?? null))                   $err[] = "$path.id is invalid";
    if (!text_ok($p['displayName'] ?? null, 1, 80)) $err[] = "$path.displayName is required (max 80 characters)";
    if (!text_ok($p['enjoy'] ?? null, 0, 2000))     $err[] = "$path.enjoy must be text (max 2000 characters)";
    if (!text_ok($p['tried'] ?? null, 0, 2000))     $err[] = "$path.tried must be text (max 2000 characters)";
    if (!text_ok($p['curious'] ?? null, 0, 2000))   $err[] = "$path.curious must be text (max 2000 characters)";

    $items = [];
    $rawItems = $p['items'] ?? null;
    if (!is_list_array($rawItems) || count($rawItems) > MAX_ITEMS) {
        $err[] = "$path.items must be a list of up to " . MAX_ITEMS . " items";
    } else {
        $seen = [];
        foreach ($rawItems as $i => $it) {
            $clean = clean_item($it, "$path.items[$i]", $err);
            if ($clean === null) continue;
            if (isset($seen[$clean['id']])) {
                $err[] = "$path.items[$i].id is duplicated";
                continue;
            }
            $seen[$clean['id']] = true;
            $items[] = $clean;
        }
    }

    if (count($err) > $before) return null;

    return [
        'id'          => $p['id'],
        'displayName' => $p['displayName'],
        'enjoy'       => $p['enjoy'],
        'tried'       => $p['tried'],
        'curious'     => $p['curious'],
        'items'       => $items,
    ];
}

function clean_all(array $list, array &$err): array
{
    if (count($list) > MAX_PORTFOLIOS) {
        $err[] = 'too many portfolios';
        return [];
    }
    $out = [];
    $seen = [];
    foreach ($list as $i => $p) {
        $clean = clean_portfolio($p, "portfolios[$i]", $err);
        if ($clean === null) continue;
        if (isset($seen[$clean['id']])) {
            $err[] = "portfolios[$i].id is duplicated";
            continue;
        }
        $seen[$clean['id']] = true;
        $out[] = $clean;
    }
    return $out;
}

/* ---------- storage ---------- */
function read_stored(): array
{
    if (!is_file(DATA_FILE)) return [];
    $raw = file_get_contents(DATA_FILE);
    if ($raw === false) fail(500, 'Could not read stored data');
    if (trim($raw) === '') return [];
    $data = json_decode($raw, true);
    if (!is_array($data)) fail(500, 'Stored data is corrupted');

    $ok = [];
    foreach ($data as $p) {
        if (is_array($p) && isset($p['id']) && is_string($p['id']) && isset($p['items']) && is_list_array($p['items'])) {
            $ok[] = $p;
        }
    }
    return $ok;
}

/* Merge by id so two people saving at the same time do not erase each other. */
function merge_portfolios(array $stored, array $incoming): array
{
    $byId = [];
    foreach ($stored as $p) {
        $byId['p:' . $p['id']] = $p;
    }
    foreach ($incoming as $p) {
        $key = 'p:' . $p['id'];
        if (!isset($byId[$key])) {
            $byId[$key] = $p;
            continue;
        }
        $cur = $byId[$key];
        foreach (['displayName', 'enjoy', 'tried', 'curious'] as $f) {
            $cur[$f] = $p[$f];
        }
        $items = [];
        foreach ($cur['items'] as $it) {
            if (is_array($it) && isset($it['id'])) $items['i:' . $it['id']] = $it;
        }
        foreach ($p['items'] as $it) {
            $items['i:' . $it['id']] = $it;     // same id = edited item, new id = new item
        }
        $cur['items'] = array_values($items);
        $byId[$key] = $cur;
    }
    return array_values($byId);
}

/* ---------- main ---------- */
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'GET' && $method !== 'POST') {
    header('Allow: GET, POST');
    fail(405, 'Method not allowed');
}

if (!is_dir(DATA_DIR) || !is_writable(DATA_DIR)) {
    fail(500, 'Server storage is not available');
}

$lock = fopen(LOCK_FILE, 'c');
if ($lock === false) fail(500, 'Could not open lock file');

if ($method === 'GET') {
    flock($lock, LOCK_SH);
    $data = read_stored();
    flock($lock, LOCK_UN);
    respond(200, $data);
}

/* POST */
$ctype = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
if (strpos($ctype, 'application/json') !== 0) {
    fail(415, 'Content-Type must be application/json');
}

$raw = file_get_contents('php://input', false, null, 0, MAX_BODY_BYTES + 1);
if ($raw === false || $raw === '') fail(400, 'Empty request body');
if (strlen($raw) > MAX_BODY_BYTES) fail(413, 'Request body is too large');

$incoming = json_decode($raw, true, 32);
if (json_last_error() !== JSON_ERROR_NONE || !is_list_array($incoming)) {
    fail(400, 'Body must be a JSON array of portfolios');
}

$errors = [];
$clean = clean_all($incoming, $errors);
if (count($errors) > 0) {
    fail(422, 'Validation failed', $errors);
}

flock($lock, LOCK_EX);
$stored = read_stored();
$merged = merge_portfolios($stored, $clean);

if (count($merged) > MAX_PORTFOLIOS) {
    fail(422, 'Too many portfolios');
}

$json = json_encode($merged, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
if ($json === false) fail(500, 'Could not encode data');

$tmp = DATA_DIR . '/portfolios.' . bin2hex(random_bytes(6)) . '.tmp';
if (file_put_contents($tmp, $json) === false) fail(500, 'Could not write data');
chmod($tmp, 0640);
if (!rename($tmp, DATA_FILE)) {
    @unlink($tmp);
    fail(500, 'Could not save data');
}
flock($lock, LOCK_UN);

respond(200, ['ok' => true, 'portfolios' => count($merged)]);
