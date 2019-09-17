#!/bin/sh

/root/workspace/initialize.sh > /root/workspace/initialize.log 2>&1 &

/usr/sbin/sshd -D
