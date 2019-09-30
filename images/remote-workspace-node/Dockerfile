FROM makeflow/remote-workspace

RUN curl -sL https://deb.nodesource.com/setup_12.x | bash - &&\
  apt install --assume-yes nodejs

# There is an cache integrity issue with 1.19.0
# https://github.com/yarnpkg/yarn/issues/7584
RUN npm install --global yarn@1.17.3 &&\
  yarn config set prefix /root/.yarn &&\
  yarn config set cache-folder /root/.yarn-cache &&\
  echo 'export PATH="/root/.yarn/bin:${PATH}"' >> /root/.bashrc
