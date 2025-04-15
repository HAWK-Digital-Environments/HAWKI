@extends('layouts.standalone')
@section('content')

	<div class="wrapper">
		<div class="container">
			<div class="slide" style="display: flex; opacity: 1;">
				<h3 class="red-text">Delete RAY user records</h3>
				<div class="center-text" style="font-size: 11px; padding-bottom: 20px;">
					This will delete ALL your RAY data: chat history, personal settings etc - NO RECOVERY possible.<br>
					Do this ONLY if you lost both <i>Passkey</i> and <i>Backup code</i>.<br>
					After the deletion please log in again and follow the instructions to set up new Passkey and Backup code.
				</div>
				<form method="post" class="center-text" action="{{url('user/delete')}}">
					@csrf
					<div>type your username to confirm</div>
					<input name="username" id="username" type="text">
					@error('username')<div style="color: red">{{ $message }}</div>@enderror
					<button class="btn-lg-fill align-end top-gap-1" type="submit" name="submit">Delete user records</button >
					
				</form>
			</div>
		</div>
	</div>

@endsection