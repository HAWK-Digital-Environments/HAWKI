# HAWKI Docker Deployment Guide

This guide provides step-by-step instructions for deploying HAWKI using Docker containers. Docker allows for a consistent deployment experience across different environments and simplifies the setup process.

## Requirements

Before proceeding with the Docker deployment, ensure your server meets the following requirements:

- Docker Engine installed (version 20.10+)
- Docker Compose installed (version 2.0+)
- At least 2GB of RAM
- 10GB of free disk space

## Docker Configuration Files Overview

HAWKI's Docker configuration consists of several key files:

1. `Dockerfile` - Defines the main application container with PHP, Apache, and all required extensions
2. `docker-compose.yml` - Orchestrates the multi-container setup with MySQL and phpMyAdmin
3. `docker/apache.conf` - Apache configuration for the web server
4. `docker/php.ini` - PHP configuration optimized for HAWKI
5. `docker/supervisord.conf` - Manages multiple processes including Laravel Queue Workers and Reverb WebSocket server

## Deployment Steps

### 1. Clone the Repository

Start by cloning the HAWKI repository to your server:

```bash
git clone https://github.com/HAWK-Digital-Environments/HAWKI.git
cd HAWKI
```

### 2. Environment Configuration

Create and configure the environment file:

```bash
cp .env.example .env
```

Edit the `.env` file and update the following key sections:

#### Database Configuration
```
DB_CONNECTION=mysql
DB_HOST=db
DB_PORT=3306
DB_DATABASE=hawki
DB_USERNAME=hawki_user
DB_PASSWORD=your_secure_password
```

Note that `DB_HOST` is set to `db`, which is the service name in Docker Compose.

#### REVERB WebSocket Configuration
```
REVERB_APP_ID=my-app-id
REVERB_APP_KEY=my-app-key
REVERB_APP_SECRET=my-app-secret

REVERB_SERVER_HOST=0.0.0.0
REVERB_SERVER_PORT=8080

REVERB_HOST=your-domain.com
REVERB_PORT=80
REVERB_SCHEME=http
```

For production deployments, update REVERB_SCHEME to `https` and REVERB_PORT to `443` when using SSL.

#### Server Salts (Security)
Generate random strings for the following encryption salts:

```
USERDATA_ENCRYPTION_SALT=base64:RandomHash==
INVITATION_SALT=base64:RandomHash==
AI_CRYPTO_SALT=base64:RandomHash==
PASSKEY_SALT=base64:RandomHash==
BACKUP_SALT=base64:RandomHash==
```

You can generate secure random strings using:

```bash
openssl rand -base64 32
```

#### Authentication Method
Set your preferred authentication method:

```
AUTHENTICATION_METHOD="LDAP" # or "OIDC" or "Shibboleth"
```

### 3. Configure API Keys

Create and configure the model providers:

```bash
cp config/model_providers.php.example config/model_providers.php
```

Edit the `config/model_providers.php` file to include your API keys for OpenAI, GWDG, or Google.

### 4. Build and Start Docker Containers

Build and start the Docker containers using Docker Compose:

```bash
docker-compose up -d
```

This command builds the application image, creates the containers, and starts them in detached mode.

### 5. Initialize the Database

The first time you run HAWKI, you need to run database migrations and seed the database with initial data:

```bash
docker-compose exec app php artisan migrate --seed
```

This command creates all necessary database tables and seeds them with initial data, including the HAWKI AI agent user.

### 6. Create Storage Link

Create the symbolic link for the storage directory:

```bash
docker-compose exec app php artisan storage:link
```

This command creates a symbolic link from `public/storage` to `storage/app/public` to allow access to user-uploaded files.

### 7. Cache Configuration (Optional)

For improved performance, you can cache Laravel configuration:

```bash
docker-compose exec app php artisan config:cache
docker-compose exec app php artisan route:cache
```

## Accessing HAWKI

After completing the setup, you can access HAWKI using:

- Web Application: http://your-server-ip (or http://localhost if running locally)
- phpMyAdmin: http://your-server-ip:8081 (for database management)

## Production Deployment Considerations

For production deployments, consider the following additional steps:

### 1. SSL/TLS Configuration

To secure your HAWKI deployment, configure SSL/TLS by using a reverse proxy like Nginx or Traefik in front of the Docker containers.

### 2. Docker Volumes for Persistent Data

The Docker Compose configuration already includes volumes for:
- MySQL database data
- HAWKI storage directory

This ensures your data persists even if containers are recreated.

### 3. Regular Backups

Implement regular backups of the following:
- MySQL database
- Storage directory (user uploads)
- Configuration files

### 4. Container Resource Limits

For better resource management, consider adding resource limits to your Docker Compose file:

```yaml
services:
  app:
    # ... existing configuration
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
  
  db:
    # ... existing configuration
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

## Troubleshooting

### 1. Container Logs

View container logs to diagnose issues:

```bash
# Application container logs
docker-compose logs app

# Database container logs
docker-compose logs db

# Follow logs in real-time
docker-compose logs -f app
```

### 2. Supervisor Process Logs

Check supervisor process logs inside the container:

```bash
docker-compose exec app cat /var/log/supervisor/worker.log
docker-compose exec app cat /var/log/supervisor/reverb.log
```

### 3. Restarting Services

To restart individual services:

```bash
# Restart Reverb WebSocket server
docker-compose exec app supervisorctl restart reverb

# Restart Laravel workers
docker-compose exec app supervisorctl restart laravel-worker:*

# Restart Apache
docker-compose exec app supervisorctl restart apache
```

### 4. Common Issues

#### "Failed to fetch Server Salt"
Clear Laravel cache:
```bash
docker-compose exec app php artisan config:clear
docker-compose exec app php artisan cache:clear
```

#### WebSocket Connection Issues
Ensure the Reverb service is running:
```bash
docker-compose exec app supervisorctl status reverb
```

#### Database Connection Issues
Verify database credentials in the `.env` file match those in the `docker-compose.yml` file.

## Updating HAWKI

To update HAWKI to a newer version:

1. Pull the latest changes from the repository:
```bash
git pull
```

2. Rebuild and restart the containers:
```bash
docker-compose down
docker-compose up -d --build
```

3. Run any pending migrations:
```bash
docker-compose exec app php artisan migrate
```

4. Clear caches:
```bash
docker-compose exec app php artisan config:clear
docker-compose exec app php artisan cache:clear
docker-compose exec app php artisan view:clear
```

## Conclusion

This Docker deployment approach provides a containerized environment for running HAWKI, ensuring consistency and simplifying the setup process. The configuration includes all necessary components: the web application, database, workers, and WebSocket server.

For additional support or questions regarding Docker deployment, please refer to the project's GitHub repository or contact the development team.