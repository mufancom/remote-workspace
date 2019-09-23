FROM buildpack-deps:bionic

RUN apt-get update

RUN apt-get install --assume-yes openssh-server

WORKDIR /remote-workspace

ENV NODE_VERSION 12.10.0

RUN wget https://nodejs.org/dist/v12.10.0/node-v12.10.0-linux-x64.tar.xz &&\
  tar -xf node-v12.10.0-linux-x64.tar.xz &&\
  mv node-v12.10.0-linux-x64 node &&\
  rm node-v12.10.0-linux-x64.tar.xz

COPY initialize initialize

WORKDIR /remote-workspace/initialize

RUN /remote-workspace/node/bin/node\
  /remote-workspace/node/lib/node_modules/npm/bin/npm-cli.js install

WORKDIR /root

RUN git config --global user.name "placeholder" &&\
  git config --global user.email "placeholder@remote.workspace"

RUN mkdir /run/sshd &&\
  echo "PermitUserEnvironment yes\nAllowAgentForwarding yes" >> /etc/ssh/sshd_config

COPY scripts /scripts

CMD [ "/scripts/entrypoint.sh" ]
