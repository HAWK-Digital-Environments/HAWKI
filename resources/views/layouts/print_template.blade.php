<!DOCTYPE html>
<html class="lightMode">
<head>
	
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no" />
	<meta name="csrf-token" content="{{ csrf_token() }}">

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no">
    
	<title>{{ env('APP_NAME') }}</title>
    <link rel="icon" href="{{ asset('favicon.ico') }}">

    <link rel="stylesheet" href="{{ asset('css_v2.0.1/print_styles.css') }}">
    <!-- <link rel="stylesheet" href="{{ asset('css_v2.0.1/hljs_custom.css') }}"> -->

    @vite('resources/js/app.js')
	
	<script src="{{ asset('js_v2.0.1/message_functions.js') }}"></script>
	<script src="{{ asset('js_v2.0.1/stream_functions.js') }}"></script>
	<script src="{{ asset('js_v2.0.1/syntax_modifier.js') }}"></script>
    <script src="{{ asset('js_v2.0.1/encryption.js') }}"></script>
    <script src="{{ asset('js_v2.0.1/export.js') }}"></script>
    

</head>
<body>
    <div class="wrapper">
        <div class="chatlog-container">

            <div class="scroll-container">
                <div class="scroll-panel">

                </div>
            </div>

            </div>
    </div>



<template id="thread-template">
	<div class="thread" id="0">

	</div>
</template>

<template id="message-template">
	<div class="message" id="">
		<div class="message-wrapper">
			<div class="message-header">
				<div class="message-author"></div>
			</div>

			<div class="message-content">
				<span class="assistant-mention"></span>
				<span class="message-text"></span>
			</div>

		</div>
	</div>
</template>

</body>
</html>


<script>

    const userInfo = @json($userProfile);
	const userAvatarUrl = @json($userData['avatar_url']);
	const hawkiAvatarUrl = @json($userData['hawki_avatar_url']);
	const activeModule = @json($activeModule);
    const data = @json($messages);
	const modelsList = @json($models).models;
    const activeLocale = {!! json_encode(Session::get('language')) !!};
	const translation = @json($translation);
	window.addEventListener('DOMContentLoaded', async (event) => {
        preparePrintPage();
    });

</script>
