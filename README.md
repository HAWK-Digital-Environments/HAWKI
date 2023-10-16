# HAWKI

## About

HAWKI is a didactic interface for universities based on the OpenAI API. It is not necessary for users to create an account, the university ID is sufficient for login - no user-related data is stored.

The service was developed by Jonas Trippler, Vincent Timm and Stefan Woelwer at the Interaction Design Lab at the HAWK University of Applied Sciences and Arts in order to give all members of the university the opportunity to integrate artificial intelligence into their work processes and to have a meeting place where new ways of working may emerge and an internal university discussion about the use of AI can take place. The interface is currently divided into three areas:

Conversation: A chat area similar to ChatGPT, for a quick start to any task.

Virtual office: Conversations with fictional experts as a mental model to familiarise yourself with non-technical areas and to make more targeted enquiries to real university experts.

Learning Space: The learning spaces are designed to help you understand the different support options and learn what makes an effective prompt.

We welcome constructive feedback to further develop this project based on your needs and insights.

![HAWKI Login](/img/hawki-screenshot-login.png)
_HAWKI Login Screen_

![HAWKI Dashboard](/img/hawki-screenshot-dashboard.png)
_HAWKI Dashboard_

## Getting started

## Prequisites

### LDAP

HAWKI uses LDAP under the hood in order to authenticate users. Make sure you have LDAP setup first and that it is accessible from your HAWKI instance. Provide your LDAP config according to chapter [Configuration](#configuration). You can find more information on how to use LDAP on the official website https://ldap.com

_**Testing without LDAP:**_ You can try out HAWKI without an LDAP server. To do so, set `TESTUSER` to `true` in the configuration file (see [Configuration](#configuration)) and sign in with username `tester` and `superlangespasswort123`

### OpenID Connect

As an alternative to LDAP, OpenID connect can also be used to 
authenticate users. It requires the jumbojett/openid-connect-php
library (https://github.com/jumbojett/OpenID-Connect-PHP)
to be installed with composer.

### Open AI Access

To generate answers HAWKI uses the Open AI api. Follow the instructions on https://platform.openai.com/docs/introduction to generate an API key and paste it in the configuration file like instructed in chapter [Configuration](#configuration).

## Configuration

To get started you need to add a configuration file to the project first. Copy the file ".env.example" from the root directory and rename it to ".env". Replace the example values in it with your own configuration. A detailed description of all values is listed below.

| Value            | Type    | Example                                | Description                                                                                                                                        |
| ---------------- | ------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication   | string  | 'LDAP' or 'OIDC'                        | Authentication method: LDAP or OpenID Connect                                                                                                      |
| LDAP_HOST        | string  | "ldaps://...de"                        | The URL of your LDAP server.                                                                                                                       |
| LDAP_BIND_PW     | string  | secretpassword                         | Password of the user that is trying to bind to the LDAP Server.                                                                                    |
| LDAP_BASE_DN     | string  | "cn=...,ou=...,dc=..."                 | Distinguised name that is used to initially bind to your LDAP server.                                                                              |
| LDAP_SEARCH_DN   | string  | "ou=...,dc=..."                        | Distinguished name that is used for authenticating users.                                                                                          |
| OIDC_IDP          | string  | "https://...."                         | URL of the Identity provider supporting OpenID Connect.                                                                                            |
| OIDC_CLIENT_ID    | string  | "..."                                  | Client Id for this application in Identity provider.                                                                                               |
| OIDC_CLIENT_SECRET | string  | "..."                                 | Secret key for OpenID Connect. 
| OIDC_LOGOUT_URI | string  | "https://...."                                 | URL to logout from Identity provider                                                                                                                  |
| OPENAI_API_KEY   | string  | sk-...                                 | Open AI Api key                                                                                                                                    |
| IMPRINT_LOCATION | string  | https://your-university/imprint        | A link to your imprint. Alternatively you can replace the file index.php under /impressum with your own html/ php of your imprint.                 |
| PRIVACY_LOCATION | string  | https://your-university/privacy-policy | A link to your privacy policy. Alternatively you can replace the file index.php under /datenschutz with your own html/ php of your privacy policy. |
| TESTUSER         | boolean | `false`                                | Can be set to `true` for testing purposes. You can then sign in using username `tester` and password `superlangespasswort123`                      |
| FAVICON_URI  | string  | "https://...."                                 | Link to favicon 

## Web Server Configuration

There are a few things to keep in mind when publishing your HAWKI instance on a webserver.

First and foremost your webserver needs PHP support.

Also, make sure that you disable `output_buffering` in your webserver configuration otherwise you might run into issues when receiving the repsonse stream from Open AI.

**_IMPORTANT:_** _Keep the `.env` configuration file secret. Make sure your webserver does not allow directory listing and it blocks access to this configuration file. Double check that it can not be queried with a simple GET request via http://your-hawki-domain/.env_

## Branding

To swap out the HAWK logo for your own, replace the logo.svg file inside the `img` folder. Make sure to either keep the format as svg or replace all references to logo.svg with your respective filetype.

Of course, you can modify stylesheets and html files and adjust them to your liking.

## Contact & License

This project is licensed under the terms of the MIT license. If you have any questions, feel free to get in touch via [Email](mailto:vincent.timm2@hawk.de)
