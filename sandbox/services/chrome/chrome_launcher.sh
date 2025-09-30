#!/bin/sh
# This script can be used to manually launch Chrome with remote debugging.
# The primary launch mechanism is managed by supervisord.
/usr/bin/chromium-browser --remote-debugging-port=9222 --no-sandbox --user-data-dir=/workspace/chrome-data