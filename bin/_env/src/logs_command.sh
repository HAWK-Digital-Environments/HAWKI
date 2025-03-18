ARGS=${other_args[*]}

$DOCKER_COMPOSE_EXECUTABLE logs ${args[service]:-$DEFAULT_SERVICE_NAME} $ARGS
