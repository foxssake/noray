FROM node:18-bullseye
# From https://github.com/pnpm/pnpm/issues/4837

EXPOSE 3000/tcp
EXPOSE 3000/udp

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
 pnpm add -g pm2 &&\
 pnpm add -g @nestjs/cli &&\
 pnpm install

COPY . .

CMD pnpm start:prod
