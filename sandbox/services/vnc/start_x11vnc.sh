#!/bin/sh
# This script starts the x11vnc server.
# It is managed by supervisord.
# The VNC password is read from the VNC_PASSWORD environment variable.
x11vnc -display :99 -forever -shared -passenv VNC_PASSWORD