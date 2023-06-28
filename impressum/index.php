<?php
$env = parse_ini_file('../.env');
$imprintLocation = $env["IMPRINT_LOCATION"];

header("Location: $imprintLocation");
exit;



