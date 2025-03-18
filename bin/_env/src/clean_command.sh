if [[ ${args[--yes]} ]] || confirmDefaultYes 'Should really remove the image build for this project from your disk?';
then
  runSubCommand stop
  if [[ ${DOCKER_RUNTIME_TYPE} == 'docker' ]]; then
    ${DOCKER_COMPOSE_EXECUTABLE} down --rmi all --volumes
	  ${DOCKER_COMPOSE_EXECUTABLE} rm --force --stop --volumes
  else
   ${DOCKER_COMPOSE_EXECUTABLE} down
  fi
fi
