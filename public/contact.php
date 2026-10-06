<?php
// Formulaire de contact du portfolio (src/ui/ContactForm.tsx, envoi dans src/lib/form.ts).
// Copié tel quel de public/ vers dist/ au build, exécuté par Apache/PHP chez alwaysdata (PHP >= 8.1).
// Réponse JSON { ok: true } ou { ok: false, error } avec le code HTTP adapté. Sans JS (POST natif du
// navigateur, Accept: text/html), une page minimale remplace le JSON.
// Rien n'est stocké, sauf une empreinte de l'IP pendant RATE_WINDOW secondes (limitation du débit).
declare(strict_types=1);

ini_set('display_errors', '0');
date_default_timezone_set('Europe/Paris');

// À confirmer : contact@mathisboulais.com à créer chez alwaysdata. En attendant, identity.email
// (src/content/services.ts).
const RECIPIENT = 'mathis.bls@pm.me';
const SENDER = 'noreply@mathisboulais.com';
// Sujet fixe : aucune donnée du visiteur dans les en-têtes, sauf le Reply-To validé
const SUBJECT = '[mathisboulais.com] Nouveau message du formulaire de contact';

const ALLOWED_ORIGINS = ['https://mathisboulais.com', 'https://www.mathisboulais.com'];
// Origines locales acceptées seulement si le serveur est lui-même local (php -S localhost:8000 -t dist)
const DEV_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

// Longueurs maximales en caractères : identiques à CONTACT_MAX (src/lib/form.ts)
const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_MESSAGE = 5000;
const MAX_BODY_BYTES = 32768;
// Champ piège : identique à HONEYPOT_FIELD (src/lib/form.ts)
const HONEYPOT = 'bot-field';

// Limitation du débit : RATE_MAX requêtes par IP sur une fenêtre glissante de RATE_WINDOW secondes
const RATE_MAX = 5;
const RATE_WINDOW = 600;

function wants_html(): bool
{
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    return is_string($accept)
        && str_contains($accept, 'text/html')
        && !str_contains($accept, 'application/json');
}

function html_page(bool $sent): string
{
    $title = $sent ? 'Message sent' : 'Sending failed';
    $text = $sent
        ? '<p>Message sent. I’ll get back to you shortly.</p>'
        : '<p>Sending failed. You can email me directly at <a href="mailto:' . RECIPIENT . '">'
            . RECIPIENT . '</a>.</p>';
    return '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<meta name="robots" content="noindex"><title>' . $title . ' · Mathis Boulais</title>'
        . '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;'
        . 'background:#0a0a0c;color:#ededf0;font:1.125rem/1.5 system-ui,sans-serif}a{color:inherit}</style>'
        . '</head><body><main>' . $text . '<p><a href="/#contact">Back to the site</a></p></main></body></html>';
}

/** Envoie la réponse et termine le script. $error null : succès. */
function respond(int $status, ?string $error, array $extraHeaders = []): void
{
    http_response_code($status);
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    foreach ($extraHeaders as $name => $value) {
        header($name . ': ' . $value);
    }
    if (wants_html()) {
        header('Content-Type: text/html; charset=utf-8');
        echo html_page($error === null);
    } else {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($error === null ? ['ok' => true] : ['ok' => false, 'error' => $error]);
    }
    exit;
}

function origin_of(string $url): ?string
{
    $parts = parse_url($url);
    if (!is_array($parts) || !isset($parts['scheme'], $parts['host'])) {
        return null;
    }
    $origin = strtolower($parts['scheme'] . '://' . $parts['host']);
    return isset($parts['port']) ? $origin . ':' . $parts['port'] : $origin;
}

function is_dev_host(mixed $host): bool
{
    return is_string($host) && in_array(strtolower($host), DEV_HOSTS, true);
}

/** Origin, ou à défaut Referer, doit être le domaine (ou localhost quand le serveur est local). */
function origin_allowed(): bool
{
    $header = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (!is_string($header) || $header === '') {
        $header = $_SERVER['HTTP_REFERER'] ?? '';
    }
    $origin = is_string($header) && $header !== '' ? origin_of($header) : null;
    if ($origin === null) {
        return false;
    }
    if (in_array($origin, ALLOWED_ORIGINS, true)) {
        return true;
    }
    $serverHost = parse_url('http://' . (string) ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST);
    return is_dev_host($serverHost) && is_dev_host(parse_url($origin, PHP_URL_HOST));
}

function field(string $name): string
{
    $value = $_POST[$name] ?? '';
    return is_string($value) ? trim($value) : '';
}

function char_length(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

/** Dossier du compteur, hors webroot : parent de la racine du site (ex. /home/<compte>/), sinon /tmp. */
function rate_dir(): ?string
{
    $candidates = [dirname(__DIR__) . '/.contact-rate', sys_get_temp_dir() . '/mathisboulais-contact-rate'];
    foreach ($candidates as $dir) {
        if ((@is_dir($dir) || @mkdir($dir, 0700, true)) && @is_writable($dir)) {
            return $dir;
        }
    }
    return null;
}

function prune_rate_dir(string $dir, int $now): void
{
    foreach (glob($dir . '/*.json') ?: [] as $file) {
        $modified = @filemtime($file);
        if ($modified !== false && $modified < $now - RATE_WINDOW) {
            @unlink($file);
        }
    }
}

/** Secondes à attendre avant une nouvelle requête (0 : requête autorisée, et comptée). */
function rate_wait(string $ip): int
{
    $dir = rate_dir();
    if ($dir === null) {
        // Sans dossier inscriptible, on laisse passer plutôt que de perdre un message
        error_log('contact.php: aucun dossier inscriptible pour la limitation du débit');
        return 0;
    }
    $now = time();
    $handle = @fopen($dir . '/' . hash('sha256', $ip) . '.json', 'c+');
    if ($handle === false) {
        return 0;
    }
    flock($handle, LOCK_EX);
    $stored = json_decode((string) stream_get_contents($handle), true);
    $hits = [];
    if (is_array($stored)) {
        foreach ($stored as $time) {
            if (is_int($time) && $time > $now - RATE_WINDOW) {
                $hits[] = $time;
            }
        }
    }
    $wait = 0;
    if (count($hits) >= RATE_MAX) {
        $wait = max(1, min($hits) + RATE_WINDOW - $now);
    } else {
        $hits[] = $now;
    }
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, (string) json_encode($hits));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    // Les empreintes expirées sont effacées à chaque requête (dossier minuscule, trafic faible)
    prune_rate_dir($dir, $now);
    return $wait;
}

function send_mail(string $name, string $email, string $message): bool
{
    $body = "Nom : {$name}\nEmail : {$email}\nReçu le " . date('d/m/Y à H:i') . "\n\n{$message}\n";
    $headers = [
        'From' => SENDER,
        'Reply-To' => $email,
        'MIME-Version' => '1.0',
        'Content-Type' => 'text/plain; charset=UTF-8',
        'Content-Transfer-Encoding' => 'quoted-printable',
    ];
    return mail(
        RECIPIENT,
        SUBJECT,
        quoted_printable_encode(str_replace("\n", "\r\n", $body)),
        $headers,
        '-f' . SENDER,
    );
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, 'method_not_allowed', ['Allow' => 'POST']);
}
if (!origin_allowed()) {
    respond(403, 'forbidden_origin');
}
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > MAX_BODY_BYTES) {
    respond(413, 'payload_too_large');
}

$wait = rate_wait((string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
if ($wait > 0) {
    respond(429, 'rate_limited', ['Retry-After' => (string) $wait]);
}

// Champ piège rempli : un robot. Même réponse qu'un succès, rien n'est envoyé.
if (field(HONEYPOT) !== '') {
    respond(200, null);
}

$name = field('name');
$email = field('email');
$message = field('message');

foreach ([$name, $email, $message] as $value) {
    if (preg_match('//u', $value) !== 1) {
        respond(400, 'invalid_encoding');
    }
}
if ($name === '' || $email === '' || $message === '') {
    respond(422, 'missing_fields');
}
if (char_length($name) > MAX_NAME || char_length($email) > MAX_EMAIL || char_length($message) > MAX_MESSAGE) {
    respond(422, 'too_long');
}
if (filter_var($email, FILTER_VALIDATE_EMAIL) === false || preg_match('/[\r\n]/', $email) === 1) {
    respond(422, 'invalid_email');
}

// Nettoyage : le nom tient sur une ligne, le message garde ses retours à la ligne et tabulations
$name = trim((string) preg_replace('/[\x00-\x1F\x7F]+/', ' ', $name));
$message = str_replace(["\r\n", "\r"], "\n", $message);
$message = (string) preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $message);

if (!send_mail($name, $email, $message)) {
    error_log('contact.php: mail() a échoué');
    respond(500, 'send_failed');
}
respond(200, null);
