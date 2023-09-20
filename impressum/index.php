<?php
$imprintLocation = getenv("IMPRINT_LOCATION");

header("Location: $imprintLocation");
exit;



