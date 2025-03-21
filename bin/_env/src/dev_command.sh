trap 'exit 0' INT TERM

if confirmDefaultYes "This will open everything to run a dev environment. You can exit it by pressing Ctrl+B and then D. Do you want to continue?";
then
    dockerSsh ${DEFAULT_SERVICE_NAME} "/usr/bin/app/dev.command.sh"
fi
