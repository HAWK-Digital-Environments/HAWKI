<?php

session_start();
if (!isset($_SESSION['username'])) {
	http_response_code(401);
	exit;
}


if ($_SERVER['REQUEST_METHOD'] === 'POST') {
	$id = file_get_contents("php://input");
	
	$sanitizedId = htmlspecialchars($id, ENT_QUOTES, 'UTF-8');

	$file = "feedback/" . $sanitizedId;

	if (!file_exists($file)) {
		echo('File does not exist');
		http_response_code(404);
		exit;
	}

	$json = json_decode(file_get_contents("feedback/$sanitizedId"), true);
	$json["up"] = $json["up"] + 1;

	file_put_contents("feedback/$sanitizedId", json_encode($json));

	echo json_encode($json);
}


