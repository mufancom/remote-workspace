#!/bin/sh

echo "Initializing workspace..."

rm --force /root/workspace/.ready

/remote-dev/node/bin/node /remote-dev/initialize

touch /root/workspace/.ready

echo "Workspace ready."

/usr/sbin/sshd -D
