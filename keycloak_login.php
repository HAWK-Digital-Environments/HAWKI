<?php

echo 'TODO: jetzt lenken wir auf keycloak um<br>';
require __DIR__ . '/vendor/autoload.php';

use Jumbojett\OpenIDConnectClient;

$env = parse_ini_file('.env');
$keycloakkey = $env["KEYCLOAK_KEY"];

$oidc = new OpenIDConnectClient(
    'https://id.dev.sonia.de/realms/dev',
    'app3',
    $keycloakkey
);

# Demo is dealing with HTTP rather than HTTPS
$oidc->setHttpUpgradeInsecureRequests(false);

# default scope is "openid"
$oidc->addScope( "email" );
$oidc->addScope( "phone" );

$oidc->authenticate();

$_SESSION['oidcClient'] = $oidc;

header("Location: /userinfo.php");
exit();

?>

