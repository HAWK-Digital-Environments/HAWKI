<?php

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['newsletter'])) {
	$email = $_POST['newsletter'];
	$file = 'emails.txt';

	// Append the email to the file
	file_put_contents($file, $email . "\n", FILE_APPEND);

	// Redirect back to the form
	header('Location: ' . $_SERVER['PHP_SELF']);
	exit;
}
