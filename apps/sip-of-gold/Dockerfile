FROM nginx:alpine
# Copy static files directly to Nginx web root
COPY apps/sip-of-gold/index.html /usr/share/nginx/html/
COPY apps/sip-of-gold/src/ /usr/share/nginx/html/src/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
