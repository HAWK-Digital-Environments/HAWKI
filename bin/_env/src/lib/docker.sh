determineDockerExecutable(){
  local PODMAN_EXECUTABLE
  PODMAN_EXECUTABLE=$(command -v podman)
  if [[ "${PODMAN_EXECUTABLE}" ]] && (systemctl is-active --quiet podman); then
    echo "${PODMAN_EXECUTABLE}"
    return
  fi

  local DOCKER_EXECUTABLE
  DOCKER_EXECUTABLE=$(command -v docker)
  if [[ "${DOCKER_EXECUTABLE}" ]]; then
    echo "${DOCKER_EXECUTABLE}"
    return
  fi

  echo "Sorry, but I did not find docker or podman on your system" >&2
  exit 1
}

determineDockerComposeExecutable() {
  # Special switch for pod-man
  local PODMAN_PATH
  PODMAN_PATH=$(command -v podman-compose)
	if [[ ${PODMAN_PATH} ]] && (systemctl is-active --quiet podman); then
		echo "${PODMAN_PATH}"
		return
	fi

  local PODMAN_PATH
  PODMAN_PATH=$(command -v podman)
	if [[ ${PODMAN_PATH} ]] && (systemctl is-active --quiet podman); then
		echo "${PODMAN_PATH} compose"
		return
	fi

	local COMPOSE_PATH
	COMPOSE_PATH=$(command -v docker-compose)

	# Check if some WSL weirdness is going on
	if [[ ${COMPOSE_PATH} ]] && [[ ${COMPOSE_PATH} != /mnt/* ]]; then
		# No wsl weirdness is going on -> return the path as is...
		echo "${COMPOSE_PATH}"
		return
	fi

	local COMPOSE_VERSION
	COMPOSE_VERSION=$(docker compose version)

	if [[ ${COMPOSE_VERSION} == *v2* ]]; then
		echo "docker compose"
		return
	fi

  echo "Sorry, but I did not find docker-compose or 'docker compose' on your system" >&2
  exit 1
}

determineDockerRuntimeType(){
  local COMPOSE_EXECUTABLE
  COMPOSE_EXECUTABLE=$(determineDockerComposeExecutable)
  if [[ "${COMPOSE_EXECUTABLE}" == *podman* ]]; then
    echo "podman"
    return
  fi
  echo "docker"
}

provideDockerEnvironmentVariablesBasedOnRuntimeType(){
  echo "export BUILDKIT_PROGRESS=plain"
  echo "export COMPOSE_DOCKER_CLI_BUILD=1"
  echo "export DOCKER_BUILDKIT=1"

  if [[ ${DOCKER_RUNTIME_TYPE} == "podman" ]]; then
    echo "export DOCKER_RUNTIME=podman"
    echo "export DOCKER_USER=root"
  else
    echo "export DOCKER_RUNTIME=docker"
    echo "export DOCKER_USER=${DEFAULT_UID}:${DEFAULT_GID}"
    echo "export DOCKER_UID=${DEFAULT_UID}"
    echo "export DOCKER_GID=${DEFAULT_GID}"
  fi
}

isDockerComposeServiceRunning() {
  [[ $(getContainerIdFromServiceName "${1:-${DEFAULT_SERVICE_NAME}}") ]]
}

isDockerContainerWithNameRunning() {
  [[ $($DOCKER_EXECUTABLE ps -q -f name="${1}") ]]
}

getContainerIdFromServiceName(){
	$DOCKER_COMPOSE_EXECUTABLE ps -q "${1:-${DEFAULT_SERVICE_NAME}}"
}

getToolsContainerName() {
  echo "${PROJECT_NAME:-project-without-name}-tools"
}

dockerUp() {
  $DOCKER_COMPOSE_EXECUTABLE up -d "$@"
}

dockerUpAttach() {
    $DOCKER_COMPOSE_EXECUTABLE up "$@"
}

dockerStop() {
  stopToolsContainer
  $DOCKER_COMPOSE_EXECUTABLE stop "$@"
}

dockerDown() {
  stopToolsContainer
  $DOCKER_COMPOSE_EXECUTABLE down "$@"
}

dockerSsh() {
  SERVICE=${1:-${DEFAULT_SERVICE_NAME}}
  CMD=${2}
  if ! isDockerComposeServiceRunning ${SERVICE}; then
    dockerUp
  fi

  CONTAINER_ID=$(getContainerIdFromServiceName "$SERVICE")
  BASH_SHELL=$($DOCKER_EXECUTABLE exec "${CONTAINER_ID}" which bash || echo "")
  if [[ -n "${BASH_SHELL}" ]]; then
    CONFIGURED_SHELL=${BASH_SHELL}
  else
    SH_SHELL=$($DOCKER_EXECUTABLE exec "${CONTAINER_ID}" which sh || echo "")
    if [[ -n "${SH_SHELL}" ]]; then
      CONFIGURED_SHELL=${SH_SHELL}
    else
      CONFIGURED_SHELL=$($DOCKER_EXECUTABLE exec "${CONTAINER_ID}" getent passwd root | cut -d: -f7)
    fi
  fi

  if [[ -z "${CONFIGURED_SHELL}" ]]; then
    echo "Could not determine the shell of the container" >&2
    exit 1
  fi

  COMMAND_PARAM=""
  if [[ -n "${CMD}" ]]; then
    $DOCKER_EXECUTABLE exec -ti "${CONTAINER_ID}" "${CONFIGURED_SHELL}" -c "${CMD}"
    return
  fi

  $DOCKER_EXECUTABLE exec -ti "${CONTAINER_ID}" "${CONFIGURED_SHELL}"
}

startToolsContainerIfNotRunning() {
  local CURRENT_DIR
  CURRENT_DIR=$(pwd)

  cd "${TOOLS_DIR}" || echo "Could not change to tools directory" >&2 && exit 1
  local CONTAINER_NAME
  CONTAINER_NAME=$(getToolsContainerName)
  if ! isDockerContainerWithNameRunning ${CONTAINER_NAME}; then
		$DOCKER_COMPOSE_EXECUTABLE run \
			--detach \
			--name ${CONTAINER_NAME} \
			--rm \
			--entrypoint "" \
			tools \
			bash -c "while true; do sleep 86400; done"
  fi
  cd "${CURRENT_DIR}" || echo "Could not change back to original directory" >&2 && exit 1
}

stopToolsContainer(){
  local CONTAINER_NAME
  CONTAINER_NAME=$(getToolsContainerName)
  if isDockerContainerWithNameRunning "${CONTAINER_NAME}"; then
    echo "Stopping tools container..." > /dev/tty
    $DOCKER_EXECUTABLE stop "${CONTAINER_NAME}"
  fi
}

getToolsContainerExecutable() {
  local ADDITIONAL_ARGS=${@}
  local TOOLS_COMPOSE_FILE="${TOOLS_DIR}/docker-compose.yml"
  echo "$DOCKER_COMPOSE_EXECUTABLE --file ${TOOLS_COMPOSE_FILE} run --rm --entrypoint \"\" ${ADDITIONAL_ARGS} tools"
}
