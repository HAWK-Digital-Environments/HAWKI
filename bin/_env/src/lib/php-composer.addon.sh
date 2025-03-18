areComposerDependenciesInstalled(){
  if [ -f ${PROJECT_ROOT_DIR}/app/vendor/autoload.php ]; then
    return
  fi

  false
}
