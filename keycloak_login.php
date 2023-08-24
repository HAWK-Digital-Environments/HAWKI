<?php

// use library for dealing with OpenID connect
$env = parse_ini_file('.env');
$composerpath = $env["COMPOSER_PATH"];

require($composerpath . '/vendor/autoload.php');

use Jumbojett\OpenIDConnectClient;

// Create OpenID connect client
$env = parse_ini_file('.env');
$keycloakkey = $env["KEYCLOAK_KEY"];

$oidc = new OpenIDConnectClient(
    'https://id.dev.sonia.de/realms/dev',
    'app3',
    $keycloakkey
);

# Demo is dealing with HTTP rather than HTTPS
$testuser = $env["TESTUSER"];
if ($testuser) {
    $oidc->setHttpUpgradeInsecureRequests(false);
}

# default scope is "openid"
$oidc->addScope( "email" );
$oidc->addScope( "phone" );

$oidc->authenticate();

$_SESSION['oidcClient'] = $oidc;

// Store session variable username
$_SESSION['username'] = $oidc->requestUserInfo('given_name');

// echo "ich bin bei Keycloak angemeldet als {$_SESSION['username']} <br>";
// echo $_SERVER['PHP_SELF'];

header("Location: /interface.php");
exit();

?>

