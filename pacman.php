<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fetchLeaderboard(PDO $pdo): array
{
    $statement = $pdo->query(
        'SELECT username, best_score
         FROM global_scores
         ORDER BY best_score DESC, created_at ASC, username ASC
         LIMIT 10'
    );

    return $statement->fetchAll(PDO::FETCH_ASSOC);
}

function fetchBestScore(PDO $pdo, string $username): int
{
    $statement = $pdo->prepare(
        'SELECT best_score FROM global_scores WHERE username = :username'
    );
    $statement->execute(['username' => $username]);
    $score = $statement->fetchColumn();

    return $score === false ? 0 : (int) $score;
}

$isSecure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => $isSecure,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

try {
    $pdo = new PDO(
        'mysql:host=localhost;dbname=pacman_rush;charset=utf8mb4',
        'root',
        '',
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $exception) {
    error_log('Pac-Man Rush database connection failed: ' . $exception->getMessage());
    respond(503, ['success' => false, 'error' => 'No se pudo conectar a MySQL. Revisa la configuración de XAMPP.']);
}

$method = $_SERVER['REQUEST_METHOD'] ?? '';
$action = $_GET['action'] ?? '';

if ($method === 'GET' && $action === 'session') {
    $username = $_SESSION['username'] ?? null;
    if (!is_string($username)) {
        respond(200, ['success' => true, 'authenticated' => false]);
    }

    try {
        respond(200, [
            'success' => true,
            'authenticated' => true,
            'username' => $username,
            'best_score' => fetchBestScore($pdo, $username),
        ]);
    } catch (PDOException $exception) {
        error_log('Pac-Man Rush session lookup failed: ' . $exception->getMessage());
        respond(500, ['success' => false, 'error' => 'No se pudo consultar la cuenta.']);
    }
}

if ($method === 'GET') {
    try {
        respond(200, ['success' => true, 'leaderboard' => fetchLeaderboard($pdo)]);
    } catch (PDOException $exception) {
        error_log('Pac-Man Rush leaderboard query failed: ' . $exception->getMessage());
        respond(500, ['success' => false, 'error' => 'No se pudo consultar la tabla global_scores.']);
    }
}

if ($method !== 'POST') {
    header('Allow: GET, POST');
    respond(405, ['success' => false, 'error' => 'Método no permitido.']);
}

$payload = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($payload)) {
    respond(400, ['success' => false, 'error' => 'El cuerpo debe ser JSON válido.']);
}

$action = $payload['action'] ?? '';

if ($action === 'register' || $action === 'login') {
    $username = $payload['username'] ?? null;
    $password = $payload['password'] ?? null;

    if (!is_string($username) || !preg_match('/\A[A-Za-z0-9_]{10,15}\z/', $username)) {
        respond(422, ['success' => false, 'error' => 'El usuario debe tener 10–15 caracteres: letras, números o guion bajo.']);
    }
    if (!is_string($password) || strlen($password) < 8 || strlen($password) > 72) {
        respond(422, ['success' => false, 'error' => 'La contraseña debe tener al menos 8 caracteres y no superar 72 bytes.']);
    }

    try {
        if ($action === 'register') {
            $statement = $pdo->prepare(
                'INSERT INTO users (username, password_hash) VALUES (:username, :password_hash)'
            );
            try {
                $statement->execute([
                    'username' => $username,
                    'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                ]);
            } catch (PDOException $exception) {
                if ($exception->getCode() === '23000') {
                    respond(409, ['success' => false, 'error' => 'Ese nombre de usuario ya está registrado.']);
                }
                throw $exception;
            }
        } else {
            $statement = $pdo->prepare(
                'SELECT password_hash FROM users WHERE username = :username'
            );
            $statement->execute(['username' => $username]);
            $passwordHash = $statement->fetchColumn();

            if (!is_string($passwordHash) || !password_verify($password, $passwordHash)) {
                respond(401, ['success' => false, 'error' => 'Usuario o contraseña incorrectos.']);
            }
        }

        session_regenerate_id(true);
        $_SESSION['username'] = $username;
        respond(200, [
            'success' => true,
            'username' => $username,
            'best_score' => fetchBestScore($pdo, $username),
        ]);
    } catch (PDOException $exception) {
        error_log('Pac-Man Rush account request failed: ' . $exception->getMessage());
        respond(500, ['success' => false, 'error' => 'No se pudo procesar la cuenta.']);
    }
}

if ($action === 'logout') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $cookie = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $cookie['path'],
            'domain' => $cookie['domain'],
            'secure' => $cookie['secure'],
            'httponly' => $cookie['httponly'],
            'samesite' => 'Lax',
        ]);
    }
    session_destroy();
    respond(200, ['success' => true]);
}

if ($action !== 'score') {
    respond(400, ['success' => false, 'error' => 'La acción solicitada no es válida.']);
}

$username = $_SESSION['username'] ?? null;
if (!is_string($username)) {
    respond(401, ['success' => false, 'error' => 'Inicia sesión para guardar puntuaciones.']);
}

$score = $payload['score'] ?? null;
if (!is_int($score) || $score < 0 || $score > 9007199254740991) {
    respond(422, ['success' => false, 'error' => 'La puntuación debe ser un entero no negativo válido.']);
}

try {
    $statement = $pdo->prepare(
        'INSERT INTO global_scores (username, best_score)
         VALUES (:username, :score)
         ON DUPLICATE KEY UPDATE best_score = GREATEST(best_score, VALUES(best_score))'
    );
    $statement->execute(['username' => $username, 'score' => $score]);

    respond(200, [
        'success' => true,
        'best_score' => fetchBestScore($pdo, $username),
        'leaderboard' => fetchLeaderboard($pdo),
    ]);
} catch (PDOException $exception) {
    error_log('Pac-Man Rush leaderboard save failed: ' . $exception->getMessage());
    respond(500, ['success' => false, 'error' => 'No se pudo guardar el récord en MySQL.']);
}
