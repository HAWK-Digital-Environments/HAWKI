# If force is set execute dockerDown, otherwise execute dockerStop
if ! [[ -z ${args[--force]} ]]; then
  dockerDown
else
  dockerStop
fi

# If attach is set, execute dockerUpAttach, otherwise execute dockerUp
if ! [[ -z ${args[--attach]} ]]; then
  dockerUpAttach
else
  dockerUp
fi
