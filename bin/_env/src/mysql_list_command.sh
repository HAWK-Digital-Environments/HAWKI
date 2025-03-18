echo "The following mysql types/sources are available:"

TYPES=$(getListOfAllowedMysqlSources)

IFS=',' read -r -a TYPES_ARRAY <<< "${TYPES}"

for i in "${!TYPES_ARRAY[@]}"; do
  echo " $((i+1))) ${TYPES_ARRAY[i]}"
done
