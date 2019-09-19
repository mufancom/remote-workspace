#!/bin/sh

/remote-dev/node/bin/node /remote-dev/initialize

touch /root/workspace/.ready

/usr/sbin/sshd -D
