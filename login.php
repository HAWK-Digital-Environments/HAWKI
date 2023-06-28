<?php
  session_start();

  if (isset($_SESSION['username'])) {
	header("Location: interface.php");
	exit;
  }
  if (isset($_POST["account"]) && isset($_POST["password"])) {
	function auth(
	  $username,
	  $password
	) {

	  $env = parse_ini_file('.env');
	
	  # Hostname des LDAP-Servers
	  $host = $env["LDAP_HOST"];
	  # Base-DN des LDAP-Baums
	  $base_dn = $env["LDAP_BASE_DN"];
	  # das dazugehörige Passwort
	  $bind_pw = $env["LDAP_BIND_PW"];
	  # Search-DN des LDAP-Baums
	  $search_dn = $env["LDAP_SEARCH_DN"];
	  

	  if (empty($username) || empty($password)) {
		print "Fehler: keine Anmeldedaten<br>";
		return false;
	  }

	  if (($connection = ldap_connect($host)) == false) {
		print "Fehler: Verbindung zum LDAP-Server konnte nicht hergestellt werden.<br>";
		return false;
	  }
	  
	  ldap_set_option($connection, LDAP_OPT_PROTOCOL_VERSION, 3);

	  if (($link = ldap_bind($connection, $base_dn, $bind_pw)) == false) {
		print "Fehler: Bind fehlgeschlagen<br>";
		return false;
	  }

	  if (($result = ldap_search($connection, $search_dn, "(|(uid=$username)(mail=$username))")) == false) {
		print "Fehler: Suche im LDAP-Baum fehlgeschlagen<br>";
		return false;
	  }

	  if (($entry_id = ldap_first_entry($connection, $result)) == false) {
		print "Fehler: Eintrag des Suchergenisses konnte nicht abgeholt werden<br>";
		return false;
	  }

	  if (($user_dn = ldap_get_dn($connection, $entry_id)) == false) {
		print "Fehler: Der User-DN konnte nicht ermittelt werden<br>";
		return false;
	  }

	  /* Authentifizierung des User */
	  if (($link_id = ldap_bind($connection, $user_dn, $password)) == false) {
		print "Fehler: Authentifizierung fehlgeschlagen: $user_dn<br>";
		return false;
	  }

	  $info = ldap_get_entries($connection, $result);
	  $name = $info[0]["displayname"][0];
	  $parts = explode(", ", $name);
	  $initials = substr($parts[1], 0, 1) . substr($parts[0], 0, 1);
	  echo $initials; // Output: "JT"
	  $_SESSION['username'] = $initials;

	  ldap_unbind($link_id);
	  return true;
	}

	$env = parse_ini_file('.env');
	# Testuser account ist aktiviert 
	$testuser = $env["TESTUSER"];

	if ($testuser && $_POST["account"] == "tester" && $_POST["password"] == "superlangespasswort123") {
	  echo "login erfolgreich!";
	  $_SESSION['username'] = "T";
	  header("Location: interface.php");
	  exit;
	}

	if (auth($_POST["account"], $_POST["password"])) {
	  echo "login erfolgreich!";

	  header("Location: interface.php");
	  exit;
	} else {
	  echo "Anmelden fehlgeschlagen";
	}
  } else {
	// do get
	
  }


?>

<!DOCTYPE html>
<html lang="en" >
<head>
  <meta charset="UTF-8">
  <title>HAWKI</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="./style.css">
</head>
<body>
<!-- partial:index.partial.html -->
<div class="wrapper">
  <aside>
	<img src="/img/logo.svg" alt="">
	<h2>Willkommen zurück!</h2>
	<form action="<?php echo $_SERVER['PHP_SELF']; ?>" class="column" method="post">
	  <label for="account">Benutzername</label>
	  <input type="text" name="account" id="account">
	  <label for="password">Kennwort</label>
	  <input type="password" name="password" id="password">
	  <button>Login</button>
	</form>
	<h2 class="top-auto">Interesse?</h2>
	<p>Wenn Sie das Interface für Ihre Hochschule ausprobieren möchten, hinterlassen Sie bitte hier Ihre E-Mail-Adresse.</p>
	<form action="<?php echo $_SERVER['PHP_SELF']; ?>" class="column" method="post" id="newsletterForm">
	  <label for="newsletter">E-Mail-Adresse</label>
	  <input type="email" name="newsletter" id="newsletter">
	  <button>Senden</button>
	</form>
	<a href="/datenschutz" target="_blank">Datenschutzerklärung</a>
	<a href="https://www.hawk.de/de/hochschule/download-und-servicecenter/impressum">Impressum</a>
  </aside>
  
  <main>
	 
	
	<h1>GPT für die Hochschule</h1>
	<p><small><i>HAWKI</i> ist ein didaktisches Interface für Hochschulen, das auf der API von OpenAI basiert. Für die Nutzerinnen und Nutzer ist es nicht notwendig, einen Account anzulegen, die Hochschul-ID reicht für den Login aus - es werden keine nutzerbezogenen Daten gespeichert.</small></p>

<p>Das Angebot wurde im Interaction Design Lab der HAWK entwickelt, um allen Hochschulangehörigen die Möglichkeit zu geben, Künstliche Intelligenz in ihre Arbeitsprozesse zu integrieren und einen Begegnungsraum zu haben, damit sich eventuell neue Arbeitsweisen ergeben und eine hochschulinterne Diskussion über den Einsatz von K.I. entstehen kann. Derzeit ist die Oberfläche in drei Bereiche unterteilt:</p>

	<ul>
	  <li><strong>Konversation</strong>Ein Chatbereich wie bei ChatGPT, für einen schnellen Einstieg in jede beliebige Aufgabe.</li>
	  <li>
		<strong>Virtuelles Büro</strong>Gespräche mit fiktiven Expert*innen als mentales Modell, um sich in fachfremde Bereiche einzuarbeiten und gezieltere Anfragen an echte Hochschul-Expert*innen zu stellen.
	  </li>
	  <li><strong>Lernraum</strong>Die Lernräume sollen helfen, die verschiedenen Unterstützungsmöglichkeiten zu verstehen und zu lernen, was einen effektiven Prompt ausmacht.</li>
	</ul>
	</p>
	<br>
    
  <div class="video-button" id="openModal">
	  <svg viewBox="0 0 512 512" title="play-circle">
  <path d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm115.7 272l-176 101c-15.8 8.8-35.7-2.5-35.7-21V152c0-18.4 19.8-29.8 35.7-21l176 107c16.4 9.2 16.4 32.9 0 42z" />
</svg>
	  <video src="https://ai.hawk.de/hawkistart.mp4" playsinline preload muted loop autoplay></video>
	</div>
  


  </main>

   <div class="image_preview_container">
	<div class="image_preview"></div>
</div>
</div>

<div id="videoModal" class="modal">
		<div class="modal-content">
			<span id="closeModal" class="close">&times;</span>
			<video src="https://ai.hawk.de/hawkistart.mp4" controls>
		</div>
	</div>
<!-- partial -->
  <script  src="./script.js"></script>
  <script>
	  
  </script>
</body>
</html>
