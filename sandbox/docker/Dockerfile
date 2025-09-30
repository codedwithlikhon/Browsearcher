FROM ubuntu:22.04

# Install essential packages
RUN apt-get update && apt-get install -y \
    chromium-browser \
    supervisor \
    xvfb \
    x11vnc \
    python3 \
    python3-pip \
    nodejs \
    npm

# Configure virtual display
ENV DISPLAY=:99

# Set up supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create workspace
RUN mkdir -p /workspace/{scripts,data,output}

EXPOSE 9222 5900

CMD ["/usr/bin/supervisord"]