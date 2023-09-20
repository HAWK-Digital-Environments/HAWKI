<?php
$privacyLocation = getenv("PRIVACY_LOCATION");

header("Location: $privacyLocation");
exit;
