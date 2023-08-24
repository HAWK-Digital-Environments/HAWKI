<?php

// use library for dealing with OpenID connect
$env = parse_ini_file('.env');
$composerpath = $env["COMPOSER_PATH"];

require($composerpath . '/vendor/autoload.php');

use Jumbojett\OpenIDConnectClient;

// Create OpenID connect client
$env = parse_ini_file('.env');

$oidc = new OpenIDConnectClient(
    $env["OIC_IDP"],
    $env["OIC_CLIENT_ID"],
    $env["KEYCLOAK_KEY"]
);

# Demo is dealing with HTTP rather than HTTPS
$testuser = $env["TESTUSER"];
if ($testuser) {
    $oidc->setHttpUpgradeInsecureRequests(false);
}

# default scope is "openid"
# $oidc->addScope( "email" );
# $oidc->addScope( "phone" );

$oidc->authenticate();

$_SESSION['oidcClient'] = $oidc;

// Set session variable username as further source code depends on it
$_SESSION['username'] = $oidc->requestUserInfo('given_name');

// echo "ich bin bei Keycloak angemeldet als {$_SESSION['username']} <br>";
// echo $_SERVER['PHP_SELF'];

header("Location: /interface.php");
exit();

?>

