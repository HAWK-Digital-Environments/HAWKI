<?php

session_start();
if (!isset($_SESSION['username'])) {
	exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
	$json = file_get_contents("php://input");
	$uniqid = time() . uniqid();
	file_put_contents("feedback/$uniqid.json", $json);
	echo $json;
}


