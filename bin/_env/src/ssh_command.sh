SERVICE=${args[service]:-$DEFAULT_SERVICE_NAME}
CMD=${args[--cmd]}

dockerSsh ${SERVICE} "${CMD}"
