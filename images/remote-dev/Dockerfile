FROM buildpack-deps:bionic-scm

RUN apt-get update

RUN apt-get install --assume-yes openssh-server

RUN mkdir /run/sshd

RUN echo "PermitUserEnvironment yes" >> /etc/ssh/sshd_config
RUN echo "AllowAgentForwarding yes" >> /etc/ssh/sshd_config

COPY scripts /scripts

WORKDIR /root

CMD [ "/scripts/entrypoint.sh" ]
