<?php 

session_start();
if (!isset($_SESSION['username'])) {
	http_response_code(401);
	exit;
}

$dir = '../feedback/';
$files = preg_grep('/^([^.])/', scandir($dir ));
rsort($files);
foreach ($files as $file) {
	if ($file != '.' && $file != '..') {
		$message = json_decode(file_get_contents($dir . $file), true);
		
		$role = $message['role'];
		$content = $message['content'];
		$up = $message['up'] ?? 0;
		$down = $message['down'] ?? 0;
		
		echo "<div class='message'>
			 <div class='feedback-content'>
			   <div class='message-icon'>$role</div>
			   <div class='message-text'>$content</div>
			   <div class='vote' onclick='upvote(this)' data-id='$file'><svg xmlns='http://www.w3.org/2000/svg' height='48' viewBox='0 96 960 960' width='48'><path d='M716 936H272V424l278-288 39 31q6 5 9 14t3 22v10l-45 211h299q24 0 42 18t18 42v81.839q0 7.161 1.5 14.661T915 595L789 885q-8.878 21.25-29.595 36.125Q738.689 936 716 936Zm-384-60h397l126-299v-93H482l53-249-203 214v427Zm0-427v427-427Zm-60-25v60H139v392h133v60H79V424h193Z'/></svg><span>$up</span></div>
			   <div class='vote' onclick='downvote(this)' data-id='$file'><svg xmlns='http://www.w3.org/2000/svg' height='48' viewBox='0 96 960 960' width='48'><path d='M242 216h444v512l-278 288-39-31q-6-5-9-14t-3-22v-10l45-211H103q-24 0-42-18t-18-42v-81.839Q43 579 41.5 571.5T43 557l126-290q8.878-21.25 29.595-36.125Q219.311 216 242 216Zm384 60H229L103 575v93h373l-53 249 203-214V276Zm0 427V276v427Zm60 25v-60h133V276H686v-60h193v512H686Z'/></svg><span>$down</span></div>
			 </div>
		   </div>";
	}
}

?>

<script>
	let messages = document.querySelectorAll(".message");
	
	messages.forEach((message)=>{
		let voteButtons = message.querySelectorAll(".vote")
		
		voteButtons.forEach((voteButton)=>{
			if(localStorage.getItem(voteButton.dataset.id)){
				return
			}else{
				voteButton.classList.add("vote-hover");
			}
		})
		
	})
</script>

<style>
	.input-container{
		display: none;
	}
	
	.userpost-container{
		display: block;
	}
	
	.message:nth-child(odd){
		background: transparent;
	}
</style>