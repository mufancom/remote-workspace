#!/bin/sh

echo "Initializing workspace..."

rm --force /root/workspace/.ready

/remote-workspace/node/bin/node /remote-workspace/initialize

touch /root/workspace/.ready

echo "Workspace ready."

/usr/sbin/sshd -D
