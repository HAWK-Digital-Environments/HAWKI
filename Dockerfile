# =====================================================
# NODE service
# =====================================================
# NODE - ROOT
# -----------------------------------------------------
FROM node:23-bookworm AS node_root

ARG APP_ENV=prod

ENV APP_ENV=${APP_ENV}

ARG DOCKER_RUNTIME=docker

ARG DOCKER_GID=1000

ARG DOCKER_UID=1000

WORKDIR /var/www/html


# -----------------------------------------------------
# NODE - DEV
# -----------------------------------------------------
FROM node_root AS node_dev

ENV DOCKER_RUNTIME=${DOCKER_RUNTIME:-docker}

ENV APP_ENV=dev

# Add basics
RUN --mount=type=cache,id=apt-cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=apt-lib,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get upgrade -y && apt-get install -y \
    sudo

# Recreate the www-data user and group with the current users id
RUN (userdel -r $(getent passwd "${DOCKER_UID}" | cut -d: -f1) || true) && \
    (groupdel -f $(getent group "${DOCKER_GID}" | cut -d: -f1) || true) && \
    groupdel -f www-data || true && \
    userdel -r www-data || true && \
    groupadd -g ${DOCKER_GID} www-data && \
    useradd -u ${DOCKER_UID} -g www-data www-data && \
    mkdir -p /home/www-data && \
    chown -R www-data:www-data /home/www-data && \
    usermod -aG sudo www-data && \
    echo "www-data ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/www-data && \
    chmod 0440 /etc/sudoers.d/www-data


COPY docker/node/node.entrypoint.dev.sh /usr/bin/app/boot.sh

RUN chmod +x /usr/bin/app/boot.sh

ENTRYPOINT /usr/bin/app/boot.sh

USER www-data


# -----------------------------------------------------
# NODE - BUILDER
# -----------------------------------------------------
FROM node_root AS node_builder

RUN chown node:node /var/www/html

# Add the app sources
COPY --chown=node:node . .

USER node

RUN rm -rf ./.env
RUN npm install && npm run build


# =====================================================
# APP service
# =====================================================
# APP - ROOT
# -----------------------------------------------------
FROM php:8.4-fpm-bookworm AS app_root

LABEL org.opencontainers.image.authors="HAWKI Team <ki@hawk.de>"
LABEL org.opencontainers.image.description="The HAWKI application image"

ARG APP_ENV=prod

ENV APP_ENV=${APP_ENV}

ARG DOCKER_RUNTIME=docker

ARG DOCKER_GID=1000

ARG DOCKER_UID=1000

WORKDIR /var/www/html

RUN --mount=type=cache,id=apt-cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=apt-lib,target=/var/lib/apt,sharing=locked\
    apt-get update && apt-get upgrade -y && apt-get install -y \
    bash \
    curl \
    ca-certificates \
    openssl \
    openssh-client \
    git \
    libxml2-dev \
    tzdata \
    libicu-dev \
    openntpd \
    libedit-dev \
    libzip-dev \
    supervisor \
    libwebp-dev \
    # Install fcgi for healthcheck
    libfcgi-bin \
    && apt-get clean

RUN --mount=type=cache,id=apt-cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=apt-lib,target=/var/lib/apt,sharing=locked\
    --mount=type=bind,from=mlocati/php-extension-installer:1.5,source=/usr/bin/install-php-extensions,target=/usr/local/bin/install-php-extensions \
    install-php-extensions \
        apcu \
        bcmath \
        bz2 \
        exif \
        gd \
        intl \
        opcache \
        pdo_mysql \
        xmlrpc \
        zip \
        redis \
        pcntl

# Add additional port for reverb
EXPOSE 8080

COPY docker/php/config/fpm-pool.conf /usr/local/etc/php-fpm.d/www.conf
COPY docker/php/config/php.common.ini /usr/local/etc/php/conf.d/zzz.app.common.ini
COPY docker/php/config/php.prod.ini /usr/local/etc/php/conf.d/zzz.app.prod.ini
COPY docker/php/config/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

COPY --chown=1000:1000 --chmod=+x docker/php/bin /user/bin/app

ENTRYPOINT ["/user/bin/app/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

# -----------------------------------------------------
# APP - DEV
# -----------------------------------------------------
FROM app_root AS app_dev

ENV DOCKER_RUNTIME=${DOCKER_RUNTIME:-docker}

ENV APP_ENV=dev

# Install mhsendmail (Mailhog sendmail)
RUN curl --fail --silent --location --output /tmp/mhsendmail https://github.com/mailhog/mhsendmail/releases/download/v0.2.0/mhsendmail_linux_amd64 \
    && chmod +x /tmp/mhsendmail \
    && mv /tmp/mhsendmail /usr/bin/mhsendmail

# Add utilities for dev
RUN --mount=type=cache,id=apt-cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=apt-lib,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get upgrade -y && apt-get install -y \
    sudo \
    tmux

# Install xdebug
RUN --mount=type=cache,id=apt-cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=apt-lib,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get upgrade -y \
    && apt-get install -y $PHPIZE_DEPS \
    && pecl install xdebug-3.4.1 \
    && docker-php-ext-enable xdebug

# Add Composer
COPY --from=index.docker.io/library/composer:latest /usr/bin/composer /usr/bin/composer

# Because we inherit from the prod image, we don't actually want the prod settings
COPY docker/php/config/php.dev.ini /usr/local/etc/php/conf.d/zzz.app.dev.ini
RUN rm -rf /usr/local/etc/php/conf.d/zzz.app.prod.ini

# Recreate the www-data user and group with the current users id
RUN groupdel -f www-data || true && \
    userdel -r www-data || true && \
    groupadd -g ${DOCKER_GID} www-data && \
    useradd -u ${DOCKER_UID} -g www-data www-data && \
    mkdir -p /home/www-data && \
    chown -R www-data:www-data /home/www-data && \
    usermod -aG sudo www-data && \
    echo "www-data ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/www-data && \
    chmod 0440 /etc/sudoers.d/www-data

COPY --chmod=+x docker/php/php.entrypoint.dev.sh /user/bin/app/boot.local.sh
COPY --chmod=+x docker/php/dev.command.sh /usr/bin/app/dev.command.sh

USER www-data


# -----------------------------------------------------
# APP - PROD
# -----------------------------------------------------
FROM app_root AS app_prod

RUN echo "umask 000" >> /root/.bashrc

USER www-data

# Add the app sources
COPY --chown=www-data:www-data . .
COPY --from=node_builder --chown=www-data:www-data /var/www/html/public/build /var/www/html/public/build
RUN rm -rf /var/www/html/hot

# Install the composer dependencies, without running any scripts, this allows us to install the dependencies
# in a single layer and caching them even if the source files are changed
RUN --mount=type=cache,id=composer-cache,target=/var/www/html/.composer-cache \
    --mount=type=bind,from=composer:2,source=/usr/bin/composer,target=/usr/bin/composer \
    export COMPOSER_CACHE_DIR="/var/www/html/.composer-cache" \
    && composer install --no-dev --no-progress --no-interaction --verbose --no-autoloader

# Dump the autoload file and run the matching scripts, after all the project files are in the image
RUN --mount=type=bind,from=composer:2,source=/usr/bin/composer,target=/usr/bin/composer \
    composer dump-autoload --no-dev --optimize --no-interaction --verbose --no-cache

# Create the script that prepares the env variables when the container boots
COPY docker/php/prepareEnvVariables.php /var/www/prepareEnvVariables.php
COPY --chmod=+x docker/php/php.entrypoint.prod.sh /user/bin/app/boot.local.sh

USER root
