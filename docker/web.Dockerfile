FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY docker/nginx-main.conf /etc/nginx/nginx.conf
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# Official nginx starts as root and chowns cache dirs to uid 101. That needs
# CAP_CHOWN, which CNH drops. Run as the nginx user; pid/temp live in /tmp.
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
