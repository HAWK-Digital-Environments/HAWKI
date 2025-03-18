# Executes a jq json lookup. See: https://jqlang.github.io/jq/
# Use like this: cat "./your.json" | jq "-r '.services.db.environment.MYSQL_ROOT_PASSWORD'"
_jq() {
	$(getToolsContainerExecutable -i) jq "$@"
}

# Returns a pipe viewer for the provided input path
# Use like this: pv "./your.file" | someCommandToUseYourFile
_pv() {
	INPUT_PATH=${1}
	cat "${INPUT_PATH}" | $(getToolsContainerExecutable -i) pv -s $(stat -L "${INPUT_PATH}" -c "%s") -f
}

# Executes a sed action on the provided input
# Use like normal sed, BUT pass the file path as the first argument!
_sed() {
  local FILE_PATH=${1}
  local VOLUME_PATH=$(dirname "${FILE_PATH}")
  local FILE_NAME=$(basename "${FILE_PATH}")
  shift
  $(getToolsContainerExecutable -i -v "${VOLUME_PATH}":/opt/work) sed "$@" /opt/work/"${FILE_NAME}"
}

# Encodes the given string to base64
_base64Encode() {
  echo -n "${1}" | $(getToolsContainerExecutable -i) base64 -w 0
}
