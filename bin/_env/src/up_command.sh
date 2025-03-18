ARGS=${other_args[*]}

# If attach is set, execute dockerUpAttach, otherwise execute dockerUp
if ! [[ -z ${args[--attach]} ]]; then
  dockerUpAttach ${ARGS}
else
  dockerUp ${ARGS}
fi
