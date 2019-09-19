FROM buildpack-deps:bionic

RUN apt-get update

RUN apt-get install --assume-yes openssh-server

WORKDIR /remote-dev

ENV NODE_VERSION 12.10.0

RUN wget https://nodejs.org/dist/v12.10.0/node-v12.10.0-linux-x64.tar.gz &&\
  tar -xf node-v12.10.0-linux-x64.tar.gz &&\
  mv node-v12.10.0-linux-x64 node &&\
  rm node-v12.10.0-linux-x64.tar.gz

COPY initialize initialize

WORKDIR /remote-dev/initialize

RUN /remote-dev/node/bin/node\
  /remote-dev/node/lib/node_modules/npm/bin/npm-cli.js install

WORKDIR /root

RUN mkdir /run/sshd &&\
  echo "PermitUserEnvironment yes\nAllowAgentForwarding yes" >> /etc/ssh/sshd_config

COPY scripts /scripts

CMD [ "/scripts/entrypoint.sh" ]
