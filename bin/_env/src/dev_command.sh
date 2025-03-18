(trap 'kill 0' SIGINT; \
dockerSsh ${DEFAULT_SERVICE_NAME} "php artisan queue:work --queue=mails,message_broadcast" & \
dockerSsh ${DEFAULT_SERVICE_NAME} "php artisan reverb:start" \
)
