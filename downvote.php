<?php

session_start();
if (!isset($_SESSION['username'])) {
	exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
	$id = file_get_contents("php://input");
	$json = json_decode(file_get_contents("feedback/$id"), true);
	$json["down"] = $json["down"] + 1;
	file_put_contents("feedback/$id", json_encode($json));
	echo json_encode($json);
}


