FROM oven/bun:1

# UDP host for remote address registration
EXPOSE 8809/udp
# TCP host for commands
EXPOSE 8890/tcp
# HTTP host for Prometheus metrics
EXPOSE 8891/tcp

WORKDIR /foxssake/noray
COPY bin bin
COPY src src
COPY package.json bun.lock ./

RUN bun install --frozen-lockfile --production

CMD ["bun", "start:prod"]
