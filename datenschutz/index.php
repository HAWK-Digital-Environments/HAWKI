<?php
$env = parse_ini_file('../.env');
$privacyLocation = getenv("PRIVACY_LOCATION");

header("Location: $privacyLocation");
exit;
