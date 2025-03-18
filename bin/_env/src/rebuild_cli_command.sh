if confirmDefaultYes "This will regenerate the bin/env script, based on the sources under bin/_env! Are you sure you want to continue?";
then
  echo "Okay, lets do this...";
else
  echo "Okay, aborting!";
  exit
fi

"${BIN_DIR}/_env/bashly.sh" generate
