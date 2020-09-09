FROM buildpack-deps:bionic

ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update
RUN apt-get install --assume-yes software-properties-common

RUN add-apt-repository ppa:git-core/ppa

RUN apt-get update
RUN apt-get install --assume-yes ubuntu-server openssh-server git

WORKDIR /remote-workspace

ENV NODE_VERSION 12.11.1

RUN wget https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.xz &&\
  tar -xf node-v$NODE_VERSION-linux-x64.tar.xz &&\
  mv node-v$NODE_VERSION-linux-x64 node &&\
  rm node-v$NODE_VERSION-linux-x64.tar.xz

COPY initialize initialize

WORKDIR /remote-workspace/initialize

RUN /remote-workspace/node/bin/node\
  /remote-workspace/node/lib/node_modules/npm/bin/npm-cli.js install

WORKDIR /root

RUN git config --global user.name "placeholder" &&\
  git config --global user.email "placeholder@remote.workspace" &&\
  git config --global gc.pruneExpire never &&\
  git config --global gc.reflogExpire never

RUN mkdir /run/sshd &&\
  echo "PermitUserEnvironment yes\nAllowAgentForwarding yes" >> /etc/ssh/sshd_config

COPY scripts /scripts

CMD [ "/scripts/entrypoint.sh" ]
