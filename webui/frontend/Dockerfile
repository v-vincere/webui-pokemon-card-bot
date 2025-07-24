# Dockerfile for frontend (static content)

# Use a lightweight web server to serve static files
FROM nginx:alpine

# Copy the static files from the frontend directory into the Nginx public folder
COPY . /usr/share/nginx/html

# Copy the nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf


# Expose port 80
EXPOSE 80