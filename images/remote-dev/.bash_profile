REMOTE_USER_FILE='.remote-user'

if [ -f "$REMOTE_USER_FILE" ]
then
  LAST_REMOTE_USER=$(cat "$REMOTE_USER_FILE")
fi

if [ ! "$REMOTE_USER" = "$LAST_REMOTE_USER" ]
then
  echo "$REMOTE_USER" > "$REMOTE_USER_FILE"

  git config --global user.name "$REMOTE_USER"
  git config --global user.email "$REMOTE_USER_EMAIL"

  # Kill VS Code remote extension host agent
  pkill -f remoteExtensionHostAgent.js
fi
