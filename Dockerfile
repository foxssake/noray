FROM ghcr.io/pnpm/pnpm:11

# UDP host for remote address registration
EXPOSE 8809/udp
# TCP host for commands
EXPOSE 8890/tcp
# HTTP host for Prometheus metrics
EXPOSE 8891/tcp

COPY . /foxssake/noray
WORKDIR /foxssake/noray
RUN pnpm install --frozen-lockfile

CMD ["pnpm", "start:prod"]
