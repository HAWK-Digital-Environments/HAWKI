validate_mysql_addon_isAllowedType(){
  TYPE=${1}
  TYPES=$(getListOfAllowedMysqlSources)

  # If TYPE is not part of TYPES which is a comma separated list of allowed types -> fail
  if [[ ! ",${TYPES}," == *",${TYPE},"* ]] || [[ ${TYPE} == '@select' ]]; then
    echo "The type '${TYPE}' is not allowed! Allowed types are: ${TYPES}"
    false
    return
  fi
}

getListOfAllowedMysqlSources() {
  if [[ -z ${MYSQL_ALLOWED_SOURCES} ]]; then
    echo "You need to define a list of allowed types in the MYSQL_ALLOWED_SOURCES environment variable!"
    exit 1
  fi

  echo ${MYSQL_ALLOWED_SOURCES}
}

getMysqlSourceFromSelectList() {
  TYPES=$(getListOfAllowedMysqlSources)

  IFS=',' read -r -a TYPES_ARRAY <<< "${TYPES}"

  echo 'Please select the source from which to dump the database:' > /dev/tty
  select TYPE in "${TYPES_ARRAY[@]}"; do
    if ! validate_mysql_addon_isAllowedType ${TYPE}; then
      echo "Invalid option '${TYPE}'! Please select a valid option!"  > /dev/tty
      continue
    fi

    break
  done

  echo ${TYPE}
}

getMysqlStorageLocation() {
  TYPE=${1}

  echo ${PROJECT_ROOT_DIR}/${MYSQL_DUMP_STORAGE_LOCATION:-.mysql-dumps}/${TYPE,,}
}

getMysqlNamespacedVarValue() {
  KEY=${1}
  TYPE=${2}

  if [[ $TYPE == 'local' ]]; then
    echo ${!KEY}
    return
  fi

  KEY=${KEY}_${TYPE^^}
  echo ${!KEY}
}

execDatabaseCommand() {
	SERVICE=${1}
	USER=${2}
	PASSWORD=${3}
	SQL=${4}

	${DOCKER_COMPOSE_EXECUTABLE} --env-file $(compileEnvFile) exec -ti ${SERVICE} "mysql" \
    	-u ${USER} \
    	--password=${PASSWORD} \
    	-e "$SQL"

	checkLastExitCodeOrDie $?
}
