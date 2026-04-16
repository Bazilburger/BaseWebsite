<?php
function redirect_with_status(string $status, string $code, int $http_code = 303): never
{
    header('Location: contact.html?status=' . rawurlencode($status) . '&code=' . rawurlencode($code), true, $http_code);
    exit;
}

function get_client_ip(): string
{
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

function get_text_length(string $value): int
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($value, 'UTF-8');
    }

    if (function_exists('iconv_strlen')) {
        $length = iconv_strlen($value, 'UTF-8');
        if ($length !== false) {
            return $length;
        }
    }

    return strlen($value);
}

function is_rate_limited(string $client_ip): bool
{
    $storage_dir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'bazilburger_contact_rate_limit';
    $current_time = time();
    $window_seconds = 3600;
    $max_requests_per_window = 5;
    $minimum_interval_seconds = 30;

    if (!is_dir($storage_dir) && !mkdir($storage_dir, 0700, true) && !is_dir($storage_dir)) {
        return false;
    }

    $rate_limit_file = $storage_dir . DIRECTORY_SEPARATOR . hash('sha256', $client_ip) . '.json';
    $timestamps = [];

    if (is_file($rate_limit_file)) {
        $stored_data = json_decode((string) file_get_contents($rate_limit_file), true);
        if (is_array($stored_data)) {
            $timestamps = array_values(array_filter(
                $stored_data,
                static fn($timestamp): bool => is_int($timestamp) && ($current_time - $timestamp) < $window_seconds
            ));
        }
    }

    if (!empty($timestamps)) {
        $last_request = max($timestamps);
        if (($current_time - $last_request) < $minimum_interval_seconds) {
            return true;
        }
    }

    if (count($timestamps) >= $max_requests_per_window) {
        return true;
    }

    $timestamps[] = $current_time;
    file_put_contents($rate_limit_file, json_encode($timestamps), LOCK_EX);

    return false;
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    // Retrieve form data and validate
    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $heard_about = trim($_POST['heard_about'] ?? '');
    $service_level = trim($_POST['service_level'] ?? '');
    $message = $_POST['message'] ?? '';
    $sub = trim($_POST['subject'] ?? '');
    $honeypot = trim($_POST['website'] ?? '');
    $recipient_email = 'info@bazilburger.co.za';

    if ($honeypot !== '') {
        redirect_with_status('success', 'submit', 303);
    }

    if (is_rate_limited(get_client_ip())) {
        redirect_with_status('error', 'rate_limited', 303);
    }

    if (empty($name) || empty($email) || empty($service_level) || empty($message)) {
        redirect_with_status('error', 'invalid_fields', 303);
    }

    $message = str_replace("\0", '', $message);
    $message = preg_replace("/\r\n?/", "\n", $message);

    if (get_text_length($message) > 5000) {
        redirect_with_status('error', 'message_too_long', 303);
    }

    if (preg_match('/[\r\n]/', $name . $email . $sub . $heard_about . $service_level)) {
        redirect_with_status('error', 'invalid_header', 303);
    }

    $name = preg_replace('/\s+/', ' ', $name);
    $sub = preg_replace('/\s+/', ' ', $sub);
    $heard_about = preg_replace('/\s+/', ' ', $heard_about);
    $service_level = preg_replace('/\s+/', ' ', $service_level);

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        redirect_with_status('error', 'invalid_email', 303);
    }

    if (!preg_match("/^[\p{L}\p{N} .,'-]{1,100}$/u", $name)) {
        redirect_with_status('error', 'invalid_name', 303);
    }

    if (!preg_match("/^[\p{L}\p{N} .,'!?:()&-]{1,120}$/u", $sub)) {
        redirect_with_status('error', 'invalid_subject', 303);
    }

    $allowed_heard_about_values = [
        '',
        'Google search',
        'Word of mouth',
        'Referral',
        'Social media',
        'Previous work',
        'Other',
    ];

    $allowed_service_levels = [
        'Basic website or landing page',
        'Advanced website',
        'Bespoke small-scale development',
        'Not sure yet',
    ];

    if (!in_array($heard_about, $allowed_heard_about_values, true)) {
        redirect_with_status('error', 'invalid_fields', 303);
    }

    if (!in_array($service_level, $allowed_service_levels, true)) {
        redirect_with_status('error', 'invalid_fields', 303);
    }

    // Create email headers
    $headers = "From: admin@bazilburger.co.za\r\n";
    $headers .= "Reply-To: $email\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/plain; charset=\"utf-8\"\r\n";

    // Compose the email message
    $subject = "$sub $name";
    $body = "Name: $name\r\n";
    $body .= "Email: $email\r\n";
    $body .= "Heard About Us: " . ($heard_about !== '' ? $heard_about : 'Not provided') . "\r\n";
    $body .= "Service Level: $service_level\r\n";
    $body .= "Message: $message\r\n";
    $email_message = "$body\r\n";

    if (mail($recipient_email, $subject, $email_message, $headers)) {
        redirect_with_status('success', 'submit', 303);
    } else {
        redirect_with_status('error', 'send_failed', 303);
    }
} else {
    http_response_code(405);
    echo "Invalid request method.";
}
?>
