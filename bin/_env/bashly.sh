#!/bin/bash

# Docker must be installed on the host machine
if ! command -v docker &> /dev/null; then
  echo "Docker is not installed on your system!"
  exit 1
fi

# Wrapper to run the bashly application inside a docker container @see https://github.com/DannyBen/bashly
VOLUME_PATH=$(realpath ${BASH_SOURCE%/*}/..)
cd ${BASH_SOURCE%/*}/tools
docker compose \
	run \
		--rm \
		-it \
		--user $(id -u):$(id -g) \
		--volume "$VOLUME_PATH:/app" \
		--workdir /app \
		--env BASHLY_SOURCE_DIR=_env/src \
	tools \
		bashly $@

chmod +x ${VOLUME_PATH}/env
