FROM kartoza/geoserver

# Definir palavra-passe do admin
ENV GEOSERVER_ADMIN_PASSWORD=geoserver

# Expor a porta padrão do GeoServer
EXPOSE 8080
