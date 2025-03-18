findOpenLocalPort(){
  read LOWERPORT UPPERPORT < /proc/sys/net/ipv4/ip_local_port_range
  while :
  do
    LOCAL_PORT="`shuf -i $LOWERPORT-$UPPERPORT -n 1`"
    ss -lpn | grep -q ":${LOCAL_PORT} " || break
  done
  echo $LOCAL_PORT
}

function sshagent_findsockets {
    find /tmp -uid $(id -u) -type s -name agent.\* 2>/dev/null
}

function sshagent_testsocket {
    if [ ! -x "$(which ssh-add)" ] ; then
        echo "ssh-add is not available; agent testing aborted"
        return 1
    fi

    if [ X"${1}" != X ] ; then
        export SSH_AUTH_SOCK=$1
    fi

    if [ X"${SSH_AUTH_SOCK}" = X ] ; then
        return 2
    fi

    if [ -S ${SSH_AUTH_SOCK} ] ; then
        ssh-add -l > /dev/null
        if [ $? = 2 ] ; then
            echo "Socket ${SSH_AUTH_SOCK} is dead!  Deleting!"
            rm -f ${SSH_AUTH_SOCK}
            return 4
        else
            echo "Found ssh-agent ${SSH_AUTH_SOCK}"
            return 0
        fi
    else
        echo "${SSH_AUTH_SOCK} is not a socket!"
        return 3
    fi
}

# Starts or reuses an existing ssh agent for the current process
startSshAgent(){
  IDENTITY_FILE=$(realpath ${1:-'~/.ssh/id_rsa'})

  # ssh agent sockets can be attached to a ssh daemon process or an
  # ssh-agent process.

  AGENTFOUND=0

  # Attempt to find and use the ssh-agent in the current environment
  if sshagent_testsocket ; then AGENTFOUND=1 ; fi

  # If there is no agent in the environment, search /tmp for
  # possible agents to reuse before starting a fresh ssh-agent
  # process.
  if [ ${AGENTFOUND} = 0 ] ; then
      for agentsocket in $(sshagent_findsockets) ; do
          if [ ${AGENTFOUND} != 0 ] ; then break ; fi
          if sshagent_testsocket ${agentsocket} ; then AGENTFOUND=1 ; fi
      done
  fi

  # If at this point we still haven't located an agent, it's time to
  # start a new one
  if [ ${AGENTFOUND} = 0 ] ; then
      eval `ssh-agent`
      ssh-add "${IDENTITY_FILE}"
  else
	# If the agent is already running, check if our keyfile exists in there, or add it
	if [[ ! $(ssh-add -l) == *${IDENTITY_FILE}* ]]; then
      ssh-add "${IDENTITY_FILE}"
	fi
  fi

  # Clean up
  unset AGENTFOUND
  unset agentsocket

  # Finally, show what keys are currently in the agent
  ssh-add -l
}

# Binds a foreign server's port to a local port through an SSH tunnel
# The generated tunnel will be closed 10 seconds after being opened if not picked up by another process
# - $HOST the SSH server to connect to
# - $TARGET_HOST the server we want to connect to through the tunnel (e.g. the database server)
# - $USER_NAME the SSH user name to connect with
# - $IDENTITY_FILE the private key file to use when connecting to the SSH server
# - $FOREIGN_PORT the port on $TARGET_HOST that should be mapped to $LOCAL_PORT
# - $LOCAL_PORT the port on the local machine that should be mapped to $FOREIGN_PORT
openSelfClosingSshTunnelOnLocalPort(){
  HOST=$1
  TARGET_HOST=$2
  USER_NAME=$3
  IDENTITY_FILE=$4
  FOREIGN_PORT=$5
  LOCAL_PORT=${6:-"8888"}

  startSshAgent ${IDENTITY_FILE}

  ssh -i "${IDENTITY_FILE}" \
      -f \
      -L ${LOCAL_PORT}:${TARGET_HOST}:${FOREIGN_PORT} \
      ${USER_NAME}@${HOST} \
      sleep 10
}
