<?php
require __DIR__ . '/vendor/autoload.php';

use Jumbojett\OpenIDConnectClient;

session_start();
$oidc = $_SESSION['oidc'];
unset($_SESSION['oidc']);
$oidc -> signOut($oidc->getIdToken(), "https://ai.lab.hm.edu/logout.php");



session_destroy();
header("Location: login.php");
exit;
?>