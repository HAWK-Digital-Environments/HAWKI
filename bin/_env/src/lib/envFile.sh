# Loads the script environment file or dies if it does not exist
loadEnvFile(){
  ENV_FILE=${ENV_FILE:-"${PROJECT_ROOT_DIR}/.env"}

  if [ ! -f ${ENV_FILE} ]; then
    if [ -f "${ENV_FILE}.example" ] && confirmDefaultYes "Looks like you're missing the ${ENV_FILE} file. Would you like to create it using the .env.example file?"; then
      cp "${ENV_FILE}.example" "${ENV_FILE}"
    else
      echo "Missing ${ENV_FILE} file! Please copy .env.example, rename it to .env and add the required values before continuing!";
      exit 1;
    fi
  fi

  ini_load "${ENV_FILE}"

  if ! [[ ${ini[PROJECT_NAME]} ]]; then
    echo "PROJECT_NAME=hawki-2-local" >> ${ENV_FILE}
  fi

  if ! [[ "${ini[DB_HOST]}" ]]; then
    if ! confirmDefaultYes "It looks like your .env file is not configured correctly. I can automatically fix this for you by setting default values, should I proceed?"; then
      echo "Please adjust the .env file before continuing..." > /dev/tty;
      exit 1;
    else
        setupEnvFile
    fi
  fi

  ini_load "${ENV_FILE}"
  for key in "${!ini[@]}"; do
      # Ignore empty or commented lines
        if [[ ! ${key} =~ ^#.*$ ]] && [[ ${ini[$key]} ]]; then
            # Export the key value pair
            export "${key}=${ini[$key]}"
        fi
  done
}

askForProjectName() {
  local NAME
  while true; do
    read -p 'project name: ' NAME
    if [[ ! ${NAME} =~ ^[a-zA-Z0-9-]+$ ]]; then
      echo "The project name can only contain alphanumeric characters and dashes!" > /dev/tty;
    else
      break
    fi
  done
  echo ${NAME}
}

setupEnvFile() {
    echo "Setting up default values in the .env file..." > /dev/tty
    unset defaultIni
    declare -A defaultIni

    ini_load "${ENV_FILE}.example"
    for key in "${!ini[@]}"; do
      defaultIni[$key]="${ini[$key]}"
    done

    ini_load "${ENV_FILE}"

    # APP
    if [[ "${ini[APP_KEY]}" = "${defaultIni[APP_KEY]}" ]]; then
      echo "Generating APP_KEY..." > /dev/tty
      replaceLineStartingWith "APP_KEY" "APP_KEY=$(makeRandomStringWithLength 32)"
    fi
    if [[ "${ini[AUTHENTICATION_METHOD]}" = "${defaultIni[AUTHENTICATION_METHOD]}" ]]; then
      echo "Enabling test authentication provider..." > /dev/tty
      replaceLineStartingWith "AUTHENTICATION_METHOD" "AUTHENTICATION_METHOD=TestAuth"
      enableFirstCommentedLine "TEST_USER_LOGIN"
      replaceLineStartingWith "TEST_USER_LOGIN" "TEST_USER_LOGIN=true"
    fi
    if [[ "${ini[APP_URL]}" = "${defaultIni[APP_URL]}" ]]; then
        echo "Setting APP_URL to 'http://localhost'..." > /dev/tty
        enableFirstCommentedLine "APP_URL"
        replaceLineStartingWith "APP_URL" "APP_URL=http://localhost"
    fi

    # DATABASE
    if ! [[ ${ini[DB_HOST]} ]]; then
      echo "Setting DB_HOST to 'mysql'..." > /dev/tty
      enableFirstCommentedLine "DB_HOST"
      replaceLineStartingWith "DB_HOST" "DB_HOST=mysql"
    fi
    if ! [[ ${ini[DB_PORT]} ]]; then
        echo "Setting DB_PORT to '3306'..." > /dev/tty
        enableFirstCommentedLine "DB_PORT"
    fi
    if ! [[ ${ini[DB_DATABASE]} ]]; then
      echo "Setting DB_DATABASE to 'db'..." > /dev/tty
      enableFirstCommentedLine "DB_DATABASE"
      replaceLineStartingWith "DB_DATABASE" "DB_DATABASE=db"
    fi
    if ! [[ ${ini[DB_USERNAME]} ]]; then
      echo "Setting DB_USERNAME to 'user'..." > /dev/tty
      enableFirstCommentedLine "DB_USERNAME"
      replaceLineStartingWith "DB_USERNAME" "DB_USERNAME=user"
    fi
    if ! [[ ${ini[DB_PASSWORD]} ]]; then
      echo "Setting DB_PASSWORD to 'root'..." > /dev/tty
      enableFirstCommentedLine "DB_PASSWORD"
      replaceLineStartingWith "DB_PASSWORD" "DB_PASSWORD=password"
    fi

    # REVERB
    if [[ "${ini[REVERB_APP_SECRET]}" = "${defaultIni[REVERB_APP_SECRET]}" ]]; then
        echo "Generating REVERB_APP_SECRET..." > /dev/tty
        replaceLineStartingWith "REVERB_APP_SECRET" "REVERB_APP_SECRET=$(makeRandomStringWithLength 32)"
    fi
    if [[ "${ini[REVERB_APP_ID]}" = "${defaultIni[REVERB_APP_ID]}" ]]; then
        echo "Generating REVERB_APP_ID..." > /dev/tty
        replaceLineStartingWith "REVERB_APP_ID" "REVERB_APP_ID=$(makeRandomStringWithLength 32)"
    fi
    if [[ "${ini[REVERB_APP_KEY]}" = "${defaultIni[REVERB_APP_KEY]}" ]]; then
        echo "Setting REVERB_APP_KEY..." > /dev/tty
        replaceLineStartingWith "REVERB_APP_KEY" "REVERB_APP_KEY=hawki"
    fi

    # REDIS
    if [[ "${ini[CACHE_STORE]}" = "${defaultIni[CACHE_STORE]}" ]]; then
        echo "Setting CACHE_STORE to 'redis'..." > /dev/tty
        enableFirstCommentedLine "CACHE_STORE"
        replaceLineStartingWith "CACHE_STORE" "CACHE_STORE=redis"
    fi
    if ! [[ ${ini[REDIS_HOST]} ]]; then
        echo "Setting REDIS_HOST to 'redis'..." > /dev/tty
        enableFirstCommentedLine "REDIS_HOST"
        replaceLineStartingWith "REDIS_HOST" "REDIS_HOST=redis"
    fi
    if ! [[ ${ini[REDIS_PORT]} ]]; then
        echo "Setting REDIS_PORT to '6379'..." > /dev/tty
        enableFirstCommentedLine "REDIS_PORT"
    fi
    if ! [[ ${ini[REDIS_USERNAME]} ]]; then
        echo "Setting REDIS_USERNAME to 'user'..." > /dev/tty
        enableFirstCommentedLine "REDIS_USERNAME"
        replaceLineStartingWith "REDIS_USERNAME" "REDIS_USERNAME=default"
    fi
    if ! [[ ${ini[REDIS_PASSWORD]} ]]; then
        echo "Setting REDIS_PASSWORD to 'password'..." > /dev/tty
        enableFirstCommentedLine "REDIS_PASSWORD"
        replaceLineStartingWith "REDIS_PASSWORD" "REDIS_PASSWORD=password"
    fi

    # SALT AND PEPPER
    if [[ "${ini[USERDATA_ENCRYPTION_SALT]}" = "${defaultIni[USERDATA_ENCRYPTION_SALT]}" ]]; then
        echo "Generating USERDATA_ENCRYPTION_SALT..." > /dev/tty
        replaceLineStartingWith "USERDATA_ENCRYPTION_SALT" "USERDATA_ENCRYPTION_SALT=$(_base64Encode "$(makeRandomStringWithLength 128)")"
    fi
    if [[ "${ini[INVITATION_SALT]}" = "${defaultIni[INVITATION_SALT]}" ]]; then
        echo "Generating INVITATION_SALT..." > /dev/tty
        replaceLineStartingWith "INVITATION_SALT" "INVITATION_SALT=$(_base64Encode "$(makeRandomStringWithLength 128)")"
    fi
    if [[ "${ini[AI_CRYPTO_SALT]}" = "${defaultIni[AI_CRYPTO_SALT]}" ]]; then
        echo "Generating AI_CRYPTO_SALT..." > /dev/tty
        replaceLineStartingWith "AI_CRYPTO_SALT" "AI_CRYPTO_SALT=$(_base64Encode "$(makeRandomStringWithLength 128)")"
    fi
    if [[ "${ini[PASSKEY_SALT]}" = "${defaultIni[PASSKEY_SALT]}" ]]; then
        echo "Generating PASSKEY_SALT..." > /dev/tty
        replaceLineStartingWith "PASSKEY_SALT" "PASSKEY_SALT=$(_base64Encode "$(makeRandomStringWithLength 128)")"
    fi
    if [[ "${ini[BACKUP_SALT]}" = "${defaultIni[BACKUP_SALT]}" ]]; then
        echo "Generating BACKUP_SALT..." > /dev/tty
        replaceLineStartingWith "BACKUP_SALT" "BACKUP_SALT=$(_base64Encode "$(makeRandomStringWithLength 128)")"
    fi
}

replaceLineStartingWith() {
    local search="$1"
    local replace="$2"
    local pattern="^[[:space:]]*${search}[[:space:]]*=.*"

    # Create a temporary file
    local tempfile=$(mktemp)

    # Process the file line by line
    while IFS= read -r line; do
        if [[ "$line" =~ $pattern ]]; then
            echo "$replace" >> "$tempfile"
        else
            echo "$line" >> "$tempfile"
        fi
    done < "${ENV_FILE}"

    # Replace the original file with the modified content
    mv "$tempfile" "${ENV_FILE}"
}

enableFirstCommentedLine() {
    local search=$1

    # First check if uncommented definition already exists
    if grep -q "^[[:space:]]*${search}[[:space:]]*=" "${ENV_FILE}"; then
        return 0
    fi

    # Find the first commented line that defines the variable
    local line_number=$(grep -n "^[[:space:]]*#[[:space:]]*${search}[[:space:]]*=" "${ENV_FILE}" | head -n 1 | cut -d':' -f1)

    if [ -z "$line_number" ]; then
        echo "No commented definition found for variable $search. No changes made."
        return 1
    fi

    # Uncomment the line
    sed -i "${line_number}s/^[[:space:]]*#[[:space:]]*//" "${ENV_FILE}"

    return 0
}

makeRandomStringWithLength() {
    local length=$1
    local charset="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!?%&_."
    local result=""

    if [[ ! $length =~ ^[0-9]+$ ]]; then
        echo "Error: Length must be a positive integer" >&2
        return 1
    fi

    for i in $(seq 1 $length); do
        local random_index=$((RANDOM % ${#charset}))
        result="${result}${charset:$random_index:1}"
    done

    echo "$result"
}
