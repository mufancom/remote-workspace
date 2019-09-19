#!/bin/sh

/remote-dev/node/bin/node /remote-dev/initialize

# /root/workspace/initialize.sh > /root/workspace/initialize.log 2>&1 &

/usr/sbin/sshd -D
