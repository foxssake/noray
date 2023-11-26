FROM node:18-bullseye
# From https://github.com/pnpm/pnpm/issues/4837

EXPOSE 8890/tcp
EXPOSE 8891/udp

COPY ./package.json .

RUN npm i -g npm@latest; \
 # Install pnpm
 npm install -g pnpm; \
 pnpm --version; \
 pnpm setup; \
 mkdir -p /usr/local/share/pnpm &&\
 export PNPM_HOME="/usr/local/share/pnpm" &&\
 export PATH="$PNPM_HOME:$PATH"; \
 pnpm bin -g &&\
 # Install dependencies
 pnpm install

COPY . .

CMD pnpm start:prod
