<?php

if (!defined('BOOTSTRAP_PATH')) {
	define('BOOTSTRAP_PATH',  '../../bootstrap.php');
}

require_once BOOTSTRAP_PATH;

session_start();
if (!isset($_SESSION['username'])) {
	http_response_code(401);
	exit;
}

header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');

// Add this block to handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
	http_response_code(204);
	exit;
}

if (file_exists(ENV_FILE_PATH)){
    $env = parse_ini_file(ENV_FILE_PATH);
}

// Replace with your API URL and API key
//$apiUrl = isset($env) ? $env['OPENAI_API_URL'] : getenv('OPENAI_API_URL');
$apiKey = isset($env) ? $env['OPENAI_API_KEY'] : getenv('OPENAI_API_KEY');
$apiUrl = isset($env) ? $env['OPENAI_DALLE_URL'] : getenv('OPENAI_DALLE_URL');
$apiProxy = isset($env) ? $env['HTTPPROXY'] : getenv('HTTPPROXY');
// Read the request payload from the client
$requestPayload = file_get_contents('php://input');
/*$requestPayload = '{
    "model": "dall-e-3",
    "prompt": "A cute baby sea otter",
    "n": 1,
    "size": "1024x1024"
  }';*/
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl);
curl_setopt($ch, CURLOPT_POST, 1);
//curl_setopt($ch, CURLOPT_PROXY, $apiProxy);
curl_setopt($ch, CURLOPT_POSTFIELDS, $requestPayload);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
	'Authorization: Bearer ' . $apiKey,  # necessary for OpenAI
	'api-key: ' . $apiKey,               # necessary for Microsoft Azure AI
	'Content-Type: application/json'
]);

curl_setopt($ch, CURLOPT_WRITEFUNCTION, function($ch, $data) {
    // Decode the JSON response
    //$response = json_decode($data, true);
    
    // Check if the response contains the expected data
    /*if (isset($data["data"][0]["revised_prompt"]) && isset($data["data"][0]["url"])) {
        // Print the text and picture link
        echo "Verbesserter Prompt: " . $data["data"][0]["revised_prompt"] . "\n";
		echo "Bild: " . $data["data"][0]["url"] . "\n";
		ob_flush();
    } else {
        echo "Invalid response format\n";
    }*/
	echo $data;
    
    if (ob_get_level() > 0) {
        ob_flush();
    }
    flush();
    
    return strlen($data);
});
/*curl_setopt($ch, CURLOPT_WRITEFUNCTION, function($ch, $data) {
	echo $data;
	if (ob_get_level() > 0) {
		ob_flush();
	}
	flush();
	return strlen($data);
});*/

curl_exec($ch);

if (curl_errno($ch)) {
	echo 'Error:' . curl_error($ch);
}

curl_close($ch);

