<?php
session_start();
session_destroy();
header("Location: https://sso.hm.edu/idp/profile/Logout");
exit;
?>