mysqlAddonConfig

TYPE=${args[type]}
if [[ ${TYPE} == @select ]]; then
  TYPE=$(getMysqlSourceFromSelectList)
fi

STORAGE_PATH=$(getMysqlStorageLocation ${TYPE})

MYSQL_HOST=$(getMysqlNamespacedVarValue 'MYSQL_HOST' ${TYPE})
MYSQL_DB_NAME=$(getMysqlNamespacedVarValue 'MYSQL_DB_NAME' ${TYPE})
MYSQL_USER=$(getMysqlNamespacedVarValue 'MYSQL_USER' ${TYPE})
MYSQL_PASSWORD=$(getMysqlNamespacedVarValue 'MYSQL_PASSWORD' ${TYPE})
MYSQL_PORT=$(getMysqlNamespacedVarValue 'MYSQL_PORT' ${TYPE})

if [[ ${TYPE} == 'local' ]]; then
  MYSQL_HOST=${APP_IP}
fi

if [[ ! -z ${MYSQL_SSH_HOST} || ! -z ${MYSQL_SSH_USER} || ! -z ${MYSQL_SSH_IDENTITY_FILE} ]]; then
  if [[ -z ${MYSQL_SSH_HOST} || -z ${MYSQL_SSH_USER} || -z ${MYSQL_SSH_IDENTITY_FILE} ]]; then
    echo "If you want to use SSH to connect to the database, you need to set all of the following variables: MYSQL_SSH_HOST, MYSQL_SSH_USER, MYSQL_SSH_IDENTITY_FILE"
    exit 1
  fi
fi

if confirmDefaultYes "I will now dump the ${TYPE} database: \"${MYSQL_DB_NAME}\" to \"${STORAGE_PATH}\"! Are you sure you want to continue?";
then
  echo "Okay, lets do this...";
else
  echo "Okay, skipping the download!";
  exit
fi

### SSH Tunnel
MYSQL_SSH_HOST=$(getMysqlNamespacedVarValue 'MYSQL_SSH_HOST' ${TYPE})
MYSQL_SSH_USER=$(getMysqlNamespacedVarValue 'MYSQL_SSH_USER' ${TYPE})
MYSQL_SSH_IDENTITY_FILE=$(getMysqlNamespacedVarValue 'MYSQL_SSH_IDENTITY_FILE' ${TYPE})
if [[ ! -z ${MYSQL_SSH_HOST} ]]; then
  echo "Connection to database via SSH..."
  PORT=$(findOpenLocalPort)
  openSelfClosingSshTunnelOnLocalPort ${MYSQL_SSH_HOST} ${MYSQL_HOST} ${MYSQL_SSH_USER} ${MYSQL_SSH_IDENTITY_FILE} 3306 $PORT
  MYSQL_HOST="host.docker.internal"
  MYSQL_PORT=$PORT
fi

### Dump Configuration
SKIP_TABLES=$(getMysqlNamespacedVarValue 'MYSQL_SKIP_TABLES' ${TYPE})
SCHEMA_ONLY_TABLES=$(getMysqlNamespacedVarValue 'MYSQL_SCHEMA_ONLY_TABLES' ${TYPE})

echo "Removing old dump (if exists)"
rm -rf ${STORAGE_PATH}
mkdir -p ${STORAGE_PATH}

if [[ ! -z ${SCHEMA_ONLY_TABLES} ]]; then
  echo "Downloading dump of SCHEMA-ONLY tables... (this may take few minutes)"
  ${DOCKER_EXECUTABLE} run --rm \
    --add-host=host.docker.internal:host-gateway \
    --user ${DEFAULT_UID}:${DEFAULT_GID} \
    -v ${STORAGE_PATH}:/work ${MYSQL_MYDUMPER_DOCKER_IMAGE} \
      mydumper \
        --host ${MYSQL_HOST} \
        --user ${MYSQL_USER} \
        --password ${MYSQL_PASSWORD} \
        --database ${MYSQL_DB_NAME} \
        --port ${MYSQL_PORT} \
        --no-locks \
        --compress \
        --threads 10 \
        --verbose 3 \
        --outputdir /work \
        --no-data \
        --regex "^(${SCHEMA_ONLY_TABLES})"
  checkLastExitCodeOrDie $?
fi

EXCLUDE_REGEX=""
if [[ ! -z ${SKIP_TABLES} ]]; then
  EXCLUDE_REGEX="${SKIP_TABLES}"
  if [[ ! -z ${SCHEMA_ONLY_TABLES} ]]; then
    EXCLUDE_REGEX="${EXCLUDE_REGEX}|${SCHEMA_ONLY_TABLES}"
  fi
else
  if [[ ! -z ${SCHEMA_ONLY_TABLES} ]]; then
    EXCLUDE_REGEX="${SCHEMA_ONLY_TABLES}"
  fi
fi

REGEX_OPTION=""
if [[ ! -z ${EXCLUDE_REGEX} ]]; then
  REGEX_OPTION="--regex \"^(?!(${EXCLUDE_REGEX}))\""
fi

echo "Downloading dump... (this may take few minutes)"
${DOCKER_EXECUTABLE} run --rm \
  --add-host=host.docker.internal:host-gateway \
  --user ${DEFAULT_UID}:${DEFAULT_GID} \
  -v ${STORAGE_PATH}:/work ${MYSQL_MYDUMPER_DOCKER_IMAGE} \
    mydumper \
    --host ${MYSQL_HOST} \
    --user ${MYSQL_USER} \
    --password ${MYSQL_PASSWORD} \
    --database ${MYSQL_DB_NAME} \
    --port ${MYSQL_PORT} \
    --no-locks \
    --compress \
    --threads 10 \
    --verbose 3 \
    --outputdir /work \
    ${REGEX_OPTION}

checkLastExitCodeOrDie $?

echo "Downloading dump finished!"
cat ${STORAGE_PATH}/metadata

AMOUNT_OF_TABLES=$(ls ${STORAGE_PATH}/*.sql.gz | wc -l)
echo "Successfully dumped ${AMOUNT_OF_TABLES} tables to: ${STORAGE_PATH}"
echo "Use \"bin\\env mysql load\" or a MySQL Client to reimport it into your local database."
