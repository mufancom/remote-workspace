FROM makeflow/remote-workspace

RUN curl -sL https://deb.nodesource.com/setup_12.x | bash - &&\
  apt install --assume-yes nodejs

RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - &&\
  echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list &&\
  apt update &&\
  apt install --assume-yes yarn &&\
  yarn config set prefix /root/.yarn &&\
  yarn config set cache-folder /root/.yarn-cache &&\
  echo 'export PATH="/root/.yarn/bin:${PATH}"' >> /root/.bashrc
