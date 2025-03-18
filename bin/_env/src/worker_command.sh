dockerSsh ${DEFAULT_SERVICE_NAME} "php artisan queue:work --queue=mails,message_broadcast"
