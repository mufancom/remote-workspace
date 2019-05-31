FROM ubuntu:18.04

RUN yes | unminimize

RUN apt-get update

RUN apt-get install --assume-yes openssh-server
RUN apt-get install --assume-yes git

RUN mkdir /run/sshd

RUN echo "PermitUserEnvironment yes" >> /etc/ssh/sshd_config

WORKDIR /root

COPY .bash_profile .bash_profile

CMD [ "/usr/sbin/sshd", "-D" ]
