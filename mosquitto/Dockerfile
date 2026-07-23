# Local docker-compose.yml uses the stock eclipse-mosquitto image with a
# volume-mounted config instead of this file. This Dockerfile exists for
# platforms that deploy from a Dockerfile rather than mounting local
# volumes (e.g. Render's private services) - it bakes mosquitto.conf into
# the image so no separate volume/secret-file step is needed.

FROM eclipse-mosquitto:2

COPY config/mosquitto.conf /mosquitto/config/mosquitto.conf
