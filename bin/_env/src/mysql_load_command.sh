mysqlAddonConfig

TYPE=${args[type]}
if [[ ${TYPE} == '@select' ]]; then
  TYPE=$(getMysqlSourceFromSelectList)
fi

STORAGE_PATH=$(getMysqlStorageLocation ${TYPE})

echo $STORAGE_PATH

if [[ ! -d ${STORAGE_PATH} ]]; then
    echo "There are no local dump available at \"${STORAGE_PATH}\", please create a dump using 'bin\env mysql dump ${TYPE}' first!";
    exit 1;
fi

# Make sure the user knows that this is potentially destructive.
if confirmDefaultYes "I will now use the dump at: \"${STORAGE_PATH}\" and replace the data of your local \"${MYSQL_DB_NAME}\" table with it! Are you sure you want to continue?";
then
  echo "Okay, lets do this...";
else
  echo "Okay, skipping the load!";
  exit
fi


echo "Removing current database..."
find ${STORAGE_PATH} -name "*.sql" -delete
execDatabaseCommand ${MYSQL_HOST} root ${MYSQL_ROOT_PASSWORD} "DROP DATABASE IF EXISTS ${MYSQL_DB_NAME};"

echo "Recreating table..."
SOURCE_DB_NAME=$(getMysqlNamespacedVarValue 'MYSQL_DB_NAME' ${TYPE})
SCHEMA_CREATE_FILE=${STORAGE_PATH}/${SOURCE_DB_NAME}-schema-create.sql
gzip -dk ${SCHEMA_CREATE_FILE}.gz
# If SOURCE_DB_NAME does not match MYSQL_DB_NAME replace it
if [[ ${SOURCE_DB_NAME} != ${MYSQL_DB_NAME} ]]; then
  sed -i'' "s/${SOURCE_DB_NAME}/${MYSQL_DB_NAME}/" "${SCHEMA_CREATE_FILE}"
fi
execDatabaseCommand ${MYSQL_HOST} root ${MYSQL_ROOT_PASSWORD} "$(cat ${SCHEMA_CREATE_FILE})"

echo "Starting import..."
${DOCKER_EXECUTABLE} run --rm \
  --add-host=host.docker.internal:host-gateway \
  --user ${DEFAULT_UID}:${DEFAULT_GID} \
  --network host \
  -v ${STORAGE_PATH}:/work ${MYSQL_MYDUMPER_DOCKER_IMAGE} \
    myloader \
      --host ${DOCKER_PROJECT_IP} \
      --user root \
      --password ${MYSQL_ROOT_PASSWORD} \
      --source-db ${SOURCE_DB_NAME} \
      --database ${MYSQL_DB_NAME} \
      --port ${MYSQL_PORT} \
      --disable-redo-log \
      --serialized-table-creation \
      --skip-definer \
      --threads 50 \
      --verbose 3 \
      --directory /work

# Don't delete the dump automatically, it is nice to have it on a rainy day...
if confirmDefaultNo "Import complete! Should I remove: \"${STORAGE_PATH}\" now?";
then
  echo "Okay, out with the trash!";
  rm -rf ${STORAGE_PATH}
else
  echo "Okay, lets keep it for a while";
fi

echo "All done. Happy coding!"
