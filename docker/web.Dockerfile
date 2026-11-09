FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# nginxinc/nginx-unprivileged is uid 101 and already listens on 8080.
# Overlay pid/temp in /tmp (same as the Helm ConfigMap) so dropped capabilities
# never need CAP_CHOWN. Official nginx:alpine starts as root and chowns cache.
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --chown=nginx:nginx docker/nginx-main.conf /etc/nginx/nginx.conf
COPY --chown=nginx:nginx docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
