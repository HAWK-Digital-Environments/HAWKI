<?php

// use library for dealing with OpenID connect
require __DIR__ . '/vendor/autoload.php';

use Jumbojett\OpenIDConnectClient;

// Create OpenID connect client

$oidc = new OpenIDConnectClient(
    getenv("OIC_IDP"),
    getenv("OIC_CLIENT_ID"),
    getenv("OIC_CLIENT_SECRET")
);

# Demo is dealing with HTTP rather than HTTPS
$testuser = getenv("TESTUSER");
if ($testuser) {
    $oidc->setHttpUpgradeInsecureRequests(false);
}

$oidc->addScope('profile','email');
$oidc->authenticate();

$_SESSION['oidcClient'] = $oidc;

// Set session variable username
$firstname = $oidc->requestUserInfo('given_name');
$surname = $oidc->requestUserInfo('family_name');
$initials = substr($firstname, 0, 1) . substr($surname, 0, 1);
#
$_SESSION['initials'] = $initials;

$_SESSION['username'] = $oidc->requestUserInfo('email');


header("Location: interface.php");
exit();

?>