FROM makeflow/remote-workspace

RUN curl -sL https://deb.nodesource.com/setup_16.x | bash - &&\
  apt install --assume-yes nodejs

RUN npm install --global yarn &&\
  yarn config set prefix /root/.yarn &&\
  yarn config set cache-folder /root/.yarn-cache &&\
  echo 'export PATH="/root/.yarn/bin:${PATH}"' >> /root/.bashrc
