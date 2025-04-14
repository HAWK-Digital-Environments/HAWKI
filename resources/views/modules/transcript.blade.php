@extends('layouts.home')
@section('content')
<div class="main-panel-grid">
	<div class="dy-sidebar expanded" id="chat-sidebar">
		<div class="dy-sidebar-wrapper">
			<!-- <div class="welcome-panel">
				<h1>{{ Auth::user()->name }}</h1>
			</div> -->
			<div class="header">
				<button class="btn-md-stroke" onclick="startNewChat()">
					<div class="icon">
						<x-icon name="plus"/>
					</div>
					<div class="label"><strong>Neue Transcription</strong></div>
				</button>
				<h3 class="title">{{ $translation["History"] }}</h3>

			</div>
			<div class="dy-sidebar-content-panel">
				<div class="dy-sidebar-scroll-panel">
					<div class="selection-list" id="chats-list">
				
						
					</div>
				</div>
			</div>
		
			<div class="dy-sidebar-expand-btn" onclick="togglePanelClass('chat-sidebar', 'expanded')">
				<x-icon name="chevron-right"/>
			</div>

		</div>
	</div>



	<div class="dy-main-panel">

		<div class="dy-main-content" id="chat">

			<div class="chat-info">
				
			</div>


			<div class="chatlog">
			
				<h1 id="start-title">Meeting aufzeichnen</h1>

				

			</div>
			<p class="warning">{{ $translation["MistakeWarning"] }}</p>

		</div>
	</div>
</div>


<script>


/*window.addEventListener('DOMContentLoaded', async function (){

	initializeAiChatModule(@json($userData['convs']))

	const slug = @json($slug);

	if (slug){
		await loadConv(null, slug);
	}
	else{
        switchDyMainContent('chat');
	}
});*/


</script>


@endsection