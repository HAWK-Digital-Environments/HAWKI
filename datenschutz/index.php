<?php
$env = parse_ini_file('../.env');
$privacyLocation = $env["PRIVACY_LOCATION"];

header("Location: $privacyLocation");
exit;
