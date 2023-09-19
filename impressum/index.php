<?php
$env = parse_ini_file('../.env');
$imprintLocation = getenv("IMPRINT_LOCATION");

header("Location: $imprintLocation");
exit;



