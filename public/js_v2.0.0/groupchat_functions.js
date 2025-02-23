

let inputField;
let roomMsgTemp;
let roomItemTemplate;
let rooms;
let typingStatusDiv;
let activeRoom = null;

function initializeGroupChatModule(roomsObject){

    roomMsgTemp = document.getElementById('message-template');
    roomItemTemplate = document.getElementById('selection-item-template');
    inputField = document.querySelector(".input-field");
    typingStatusDiv = document.querySelector('.isTypingStatus');


    rooms = roomsObject.original;

    if(rooms){
        rooms.forEach(roomItem => {
            createRoomItem(roomItem.room);
            if(roomItem.hasUnreadMessages){
              flagRoomUnreadMessages(roomItem.room.slug, true);
            }
            connectWebSocket(roomItem.room.slug);
            connectWhisperSocket(roomItem.room.slug)
        });
    }
    document.querySelector('.chatlog').querySelector('.scroll-container').addEventListener('scroll', function() {
        isScrolling = true;
    });
    document.querySelector('.chatlog').querySelector('.scroll-container').addEventListener('scroll', function() {
        setTimeout(function() {
            isScrolling = false;
        }, 800); 
    });
    initializeChatlogFunctions();
}

//#region INPUT EVENTS
function onHandleKeydownRoom(event){
    if(event.key == "Enter" && !event.shiftKey){
        event.preventDefault();
        selectActiveThread(event.target);
        onSendMessageToRoom(event.target);
    }
}

function onSendClickRoom(btn){
    selectActiveThread(btn);

    //get inputfield relative to the button for multiple inputfields
    const inputWrapper = btn.closest('.input');
    const inputField = inputWrapper.querySelector('.input-field');
    onSendMessageToRoom(inputField);
}


//#endregion



//#region MESSAGE CONTROLLS

async function onSendMessageToRoom(inputField) {

    if(inputField.value.trim() == "") {
        return;
    }

    inputText = escapeHTML(inputField.value.trim());
    inputField.value = "";
    resizeInputField(inputField);

    
    const roomKey = await keychainGet(activeRoom.slug);
    const contData = await encryptWithSymKey(roomKey, inputText, false);
    const messageObj = {
        content : contData.ciphertext,
        iv : contData.iv,
        tag : contData.tag,
        threadID : activeThreadIndex,
    };

    const submittedObj = await submitMessageToServer(messageObj, `/req/room/sendMessage/${activeRoom.slug}`)
    submittedObj.content = inputText;

    // console.log('submittedObj')
    // console.log(submittedObj)
    submittedObj.filteredContent = detectMentioning(inputText),

    addMessageToChatlog(submittedObj);

    // console.log(messageObj);
    // if HAWKI is targeted send copy to stream controller
    if(submittedObj.filteredContent.aiMention && submittedObj.filteredContent.aiMention.toLowerCase().includes('@hawki')){

        const aiCryptoSalt = await fetchServerSalt('AI_CRYPTO_SALT');
        const aiKey = await deriveKey(roomKey, activeRoom.slug, aiCryptoSalt);
        const aiKeyRaw = await exportSymmetricKey(aiKey);
        const aiKeyBase64 = arrayBufferToBase64(aiKeyRaw);

        const msgAttributes = {
            'threadIndex': activeThreadIndex,
            'broadcasting': true,
            'slug': activeRoom.slug,
            'key': aiKeyBase64,
            'stream': false,
        }
        // console.log('buildRequestObject');
        buildRequestObject(msgAttributes,  async (updatedText, done) => {
            // console.log('waiting');
        });
    }

}


const connectWebSocket = (roomSlug) => {
    const webSocketChannel = `Rooms.${roomSlug}`;
    // console.log('connected to > ' + roomSlug);
    window.Echo.private(webSocketChannel)
        .listen('RoomMessageEvent', async (e) => {
            const data = e.data;

            // console.log(`Message received in room ${roomSlug}:`, data); // Debugging

            if(data.type === 'message'){

                if(activeRoom && activeRoom.slug === roomSlug){
                    if(data.messageData.message_role !== 'assistant'){
                        handleUserMessages(data.messageData, roomSlug)
                    }else{
                        handleAIMessage(data.messageData, roomSlug)
                    }
                    if(data.messageData.author.username != userInfo.username){
                        playSound('in');
                    }
                }
                else{
                    if(data.messageData.author.username != userInfo.username){
                        playSound('out');
                    }
                    flagRoomUnreadMessages(roomSlug, true);
                }
            }

            if(data.type === "messageUpdate"){
                handleUpdateMessage(data.messageData, roomSlug)
            }

            if(data.type === "aiGenerationStatus"){
                // console.log('aiGenerationStatus', data.messageData.isGenerating);
                if (data.messageData.isGenerating) {
                    // Display the typing indicator for the user
                    addUserToTypingList(data.messageData.model);
                } else {
                    // Hide the typing indicator for the user
                    removeUserFromTypingList(data.messageData.model);
                }
            }
        });
};

async function handleUserMessages(messageData, slug){

    const roomKey = await keychainGet(slug);
    messageData.content = await decryptWithSymKey(roomKey, messageData.content, messageData.iv, messageData.tag);

    let element = document.getElementById(messageData.message_id);
    if (!element) {
        // console.log('USER MESSAGE RECEIED >>> ',messageData);
        element = addMessageToChatlog(messageData, true);
        activateMessageControls(element);
    }
    else{
        updateMessageElement(element, messageData);
    }

    // Observe unread messages
    if(element.dataset.read_stat === 'false'){
        observer.observe(element);
    }
    if(!element.querySelector('.branch')){
        const thread = element.parentElement;
        checkThreadUnreadMessages(thread);
    }
}


let rawMsg = "";
async function handleAIMessage(messageData, slug){

    const roomKey = await keychainGet(slug);
    const aiCryptoSalt = await fetchServerSalt('AI_CRYPTO_SALT');
    const aiKey = await deriveKey(roomKey, slug, aiCryptoSalt);

    messageData.content = await decryptWithSymKey(aiKey, messageData.content, messageData.iv, messageData.tag);

    // console.log(messageData);

    // CREATE AND UPDATE MESSAGE
    let element = document.getElementById(messageData.message_id);
    if (!element) {
        // console.log('AI Message', messageData);
        element = addMessageToChatlog(messageData, true);
        activateMessageControls(element);
    }else{
        updateMessageElement(element, messageData);
    }

    // Observe unread messages
    if(element.dataset.read_stat === 'false'){
        // console.log(element);
        observer.observe(element);
    }
    if(!element.querySelector('.branch')){
        const thread = element.parentElement;
        checkThreadUnreadMessages(thread);
    }
};

async function handleUpdateMessage(messageData, slug){
    let key;
    const roomKey = await keychainGet(slug);

    if(messageData.message_role === 'assistant'){
        const aiCryptoSalt = await fetchServerSalt('AI_CRYPTO_SALT');
        key = await deriveKey(roomKey, slug, aiCryptoSalt);
    }else{
        key = roomKey;
    }

    messageData.content = await decryptWithSymKey(key, messageData.content, messageData.iv, messageData.tag);
    let element = document.getElementById(messageData.message_id);

    regenerateBtn = element.querySelector('#regenerate-btn');
    if(regenerateBtn && regenerateBtn.disabled){
        regenerateBtn.disabled = false;
        regenerateBtn.style.opacity = '1';
    }

    updateMessageElement(element, messageData, true);


    // Observe unread messages
    if(element.dataset.read_stat === 'false'){
        observer.observe(element);
    }
    if(!element.querySelector('.branch')){
        const thread = element.parentElement;
        checkThreadUnreadMessages(thread);
    }
}


//#endregion




//#region STATUS UPDATES

let typingTimer;
const typingInterval = 1000; // 1 second
let isTyping = false;
let typingUsers = {}; // Object to track users who are typing
const typingTimeout = 5000; // 5 seconds timeout


function onGroupchatType() {
    // Start or reset the timer on keydown
    clearTimeout(typingTimer);

    if (!isTyping) {
        isTyping = true;
        startTyping();
    }

    // Set the timer to stop typing after the interval
    typingTimer = setTimeout(stopTyping, typingInterval);
}

function startTyping() {
    const webSocketChannel = `Rooms.${activeRoom.slug}`;
    // console.log('Started typing', webSocketChannel);

    Echo.private(webSocketChannel)
        .whisper('typing', {
            user: userInfo.username,
            typing: true
        });
}

function stopTyping() {
    // console.log('Stopped typing');
    isTyping = false;
    const webSocketChannel = `Rooms.${activeRoom.slug}`;

    Echo.private(webSocketChannel)
        .whisper('typing', {
            user: userInfo.username,
            typing: false
        });
}

function connectWhisperSocket(roomSlug){

    const webSocketChannel = `Rooms.${roomSlug}`;
    // console.log('whisper listening to ', webSocketChannel);
    Echo.private(webSocketChannel)
    .listenForWhisper('typing', (e) => {

        // console.log('whisper received ', e.user);
        if (activeRoom.slug !== roomSlug) return;

        if (e.typing) {
            // Display the typing indicator for the user
            addUserToTypingList(e.user);
        } else {
            // Hide the typing indicator for the user
            removeUserFromTypingList(e.user);
        }
        updateTypingStatus();
    });
}


function addUserToTypingList(user) {
    if (typingUsers[user]) {
        clearTimeout(typingUsers[user]);
    }

    // Add/update the user with a timeout to remove them after the typingTimeout
    typingUsers[user] = setTimeout(() => {
        removeUserFromTypingList(user);
        updateTypingStatus();
    }, typingTimeout);
    updateTypingStatus();
}

function removeUserFromTypingList(user) {
    if (typingUsers[user]) {
        clearTimeout(typingUsers[user]);
        delete typingUsers[user];
    }
    updateTypingStatus();
}

function updateTypingStatus() {
    const users = Object.keys(typingUsers);
    
    if (users.length === 0) {
        typingStatusDiv.textContent = '';
        typingStatusDiv.style.display = 'none'; // Hide if no one is typing
    } else if (users.length === 1) {
        typingStatusDiv.textContent = `${users[0]} is typing...`;
        typingStatusDiv.style.display = 'block';
    } else if (users.length === 2) {
        typingStatusDiv.textContent = `${users[0]} & ${users[1]} are typing...`;
        typingStatusDiv.style.display = 'block';
    } else {
        typingStatusDiv.textContent = `${users[0]} & others are typing...`;
        typingStatusDiv.style.display = 'block';
    }
}

//#endregion



//#region ROOM CONTROLLS

function openRoomCreatorPanel(){
    activeRoom = null;
    history.replaceState(null, '', `/groupchat`);
    switchDyMainContent('room-creation');

    const lastActive = document.getElementById('rooms-list').querySelector('.selection-item.active');
    if(lastActive){
        lastActive.classList.remove('active')
    }

    const roomCreationPanel = document.getElementById('room-creation');
    // const defaultPromt = "You're a helpful assistant at the HAWK usniversity of applied sciences and arts.";
    
    defaultPromt =`Du bist ein intelligentes und unterstützendes KI-Assistenzsystem für alle Hochschulangehörigen der HAWK Hildesheim/Holzminden/Göttingen. Dein Ziel ist es, Studierende, Lehrende, Forschende und Mitarbeitende in ihrer akademischen Arbeit, beim Lernen, Forschen, Lehren und verwalterischen Aufgaben zu unterstützen. Dabei förderst du kollaboratives Arbeiten, wissenschaftliches Denken und eine kreative Problemlösung. Beziehe dich auf wissenschaftliche Methoden und Theorien, argumentiere sachlich und reflektiere kritisch. Sei objektiv und verzichte auf unbegründete Meinungen. Fördere akademische Integrität und unterstütze keine Plagiate. Sei inklusiv, wertschätzend und respektiere Vielfalt.`
    
    roomCreationPanel.querySelector('#system-prompt-input').value = defaultPromt;
    resizeInputField(roomCreationPanel.querySelector('#system-prompt-input'));
}

function finishRoomCreation(){
    const textareas = document.querySelector('.inputs-list').querySelectorAll('textarea');
    textareas.forEach(txt => {
        txt.value = "";
    });
    const addedMembers = document.querySelector('.added-members-list');
    while (addedMembers.firstChild) {
        addedMembers.removeChild(addedMembers.lastChild);
    }

    if(activeRoom){
        switchDyMainContent('chat');
        history.replaceState(null, '', `/groupchat/${activeRoom.slug}`);
    }
    else{
        switchDyMainContent('group-welcome-panel');
        history.replaceState(null, '', `/groupchat`);
    }
}


async function createNewRoom(){

    const inputs = document.querySelector('.inputs-list');
    const name = inputs.querySelector('#chat-name-input').value;
    const description = inputs.querySelector('#room-description-input').value;

    if (!name || !description) {
        document.getElementById('room-creation').querySelector('#alert-message').innerText = 'Please Fill all the required inputs.';
        return;
    }

    requestObj = {
        'room_name': name,
    }

    try {
        fetch('/req/room/createRoom', {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify(requestObj)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                onSuccessfullRoomCreation(data);
            } else {
                // Handle unexpected response
                console.error('Unexpected response:', data);
                alert('Failed to create room. Please try again.');
            }  
        })
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
    }
}


async function onSuccessfullRoomCreation(data){

    const inputs = document.querySelector('.inputs-list');
    const description = inputs.querySelector('#room-description-input').value;
    const systemPrompt = inputs.querySelector('#system-prompt-input').value;
    const avatar_url = inputs.querySelector('#room-creation-avatar').getAttribute('src');

    const roomData = data.roomData;

    //generate encryption key
    const roomKey = await generateKey();

    //save key in keychain (don't need to wait for it)
    await keychainSet(roomData.slug, roomKey, true);

    //encrypt room description and system prompt
    const cryptDescription = await encryptWithSymKey(roomKey, description, false);
    const descriptionStr = JSON.stringify({
        'ciphertext':cryptDescription.ciphertext,
        'iv':cryptDescription.iv,
        'tag':cryptDescription.tag,
    });
    const cryptSystemPrompt = await encryptWithSymKey(roomKey, systemPrompt, false);
    const systemPromptStr = JSON.stringify({
        'ciphertext':cryptSystemPrompt.ciphertext,
        'iv':cryptSystemPrompt.iv,
        'tag':cryptSystemPrompt.tag,
    });

    attributes ={
        'systemPrompt':systemPromptStr,
        'description':descriptionStr,
        'img':avatar_url     
    }

    updateRoomInfo(roomData.slug, attributes)
    rooms.push(roomData);

    //create invitation
    // Loop through the invitees to handle the encryption
    const membersBtnList = document.querySelector('.inputs-list').querySelector('.added-members-list').querySelectorAll('.added-member');

    let usersList = [];

    membersBtnList.forEach(element => {
        const user = JSON.parse(element.dataset.obj);
        usersList.push(user);
    });

    await createAndSendInvitations(usersList, roomData.slug);
    
    //close UI
    finishRoomCreation();
    //create sidebar button
    createRoomItem(roomData);
    //load room
    loadRoom(null, roomData.slug);
    //connect to broadcasting
    connectWebSocket(roomData.slug);
}

//#endregion

//#region INVITATION MANAGEMENT


async function sendInvitation(btn){
    const invModal = btn.closest('.modal-content');

    const addedList = invModal.querySelector('.added-members-list');
    listOfInvitees = [];
    addedList.childNodes.forEach(child => {
        if (child.dataset && child.dataset.obj) {
            const userObj = JSON.parse(child.dataset.obj);
            listOfInvitees.push(userObj);
        }
    });
    await createAndSendInvitations(listOfInvitees, activeRoom.slug);
    closeModal(btn);
}

async function createAndSendInvitations(usersList, roomSlug){

    const roomKey = await keychainGet(roomSlug);
    const invitations = [];
    for (const invitee of usersList) {
        let invitation;
        if (invitee.publicKey) {

            const encryptedRoomKey = await encryptWithPublicKey(roomKey, base64ToArrayBuffer(invitee.publicKey));
            
            invitation = {
                username: invitee.username,
                encryptedRoomKey: encryptedRoomKey.ciphertext, // This should be just the encrypted data for public key
                iv: '0',
                tag: '0',
                role: invitee.role
            };

        } else {

            // Generate a temporary hash for this invitee
            const tempHash = generateTempHash(); // Generate a temporary hash
            const encryptedRoomKey = await encryptWithTempHash(roomKey, tempHash);

            invitation = {
                username: invitee.username,
                encryptedRoomKey: encryptedRoomKey.ciphertext,
                iv: encryptedRoomKey.iv,
                tag: encryptedRoomKey.tag,
                role: invitee.role
            };

            const mailContent = {
                username: invitee.username,
                hash: tempHash,
                slug: roomSlug
            }
            await sendInvitationEmail(mailContent);
        }
        invitations.push(invitation);
    }
    //store invitations on database
    requestStoreInvitationsOnServer(invitations, roomSlug);
}



async function requestStoreInvitationsOnServer(invitations, slug){
    // Send the invitations to the server to store
    await fetch(`/req/inv/store-invitations/${slug}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content') 
        },
        body: JSON.stringify({invitations})
    });
}

async function sendInvitationEmail(mailContent){
    // Send the invitations to the server to store
    await fetch(`/req/inv/sendExternInvitation`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content') 
        },
        body: JSON.stringify(mailContent)
    });

}


async function handleUserInvitations() {
    try{
        const response = await fetch('/req/inv/requestUserInvitations', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
        });

        if(!response.ok){
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if(data.formattedInvitations){

            const invitations = data.formattedInvitations;
            const privateKeyBase64 = await keychainGet('privateKey');
            // Retrieve and convert private key
            const privateKey = base64ToArrayBuffer(privateKeyBase64);

            for (const inv of invitations) {
                try {

                    // Convert the encryptedRoomKey from Base64 to ArrayBuffer
                    const encryptedRoomKeyBuffer = base64ToArrayBuffer(inv.invitation);
                    // Decrypt the roomKey using the user's private key
                    const roomKey = await decryptWithPrivateKey(encryptedRoomKeyBuffer, privateKey);
                    if (roomKey) {
                        await finishInvitationHandling(inv.invitation_id, roomKey)
                    }
                } catch (error) {
                    console.error(`Failed to decrypt invitation: ${inv.invitation_id}`, error);
                }
            }
        }
        return 'Error fetching public keys';
    }
    catch (error){
        console.error('Error fetching public keys data:', error);
        throw error;
    }
}

async function handleTempLinkInvitation(tempLink){
    const parsedLink = JSON.parse(tempLink);
    tempHash = parsedLink.tempHash;
    slug = parsedLink.slug;
    
    // GET INVITATION OBJECT
    try{
        const response = await fetch(`/req/inv/requestInvitation/${slug}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
        });

        if(!response.ok){
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        roomKey = await decryptWithTempHash(data.invitation, tempHash, data.iv, data.tag);
        if(roomKey){
            await finishInvitationHandling(data.invitation_id, roomKey);
        }
    }
    catch (err){
        console.error('Error fetching data:', err);
        throw err;
    }
}

async function finishInvitationHandling(invitation_id, roomKey){
    // Send invitation_id to server to confirm successful decryption
    const response = await fetch('/req/inv/roomInvitationAccept', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content') 
        },
        body: JSON.stringify({ invitation_id: invitation_id })
    });
    
    const data = await response.json();
    if(data.success){

        await keychainSet(data.room.slug, roomKey, true);

        createRoomItem(data.room);
        connectWebSocket(data.room.slug);
        connectWhisperSocket(data.room.slug);
    }
}

NOTE:
function openInvitationPanel(){
    const modal = document.querySelector('#add-member-modal');
    modal.querySelector('#user-search-bar').value = '';
    modal.querySelector('#searchResults').innerHTML = '';
    modal.querySelector('#searchResults').style.display = 'none';
    modal.querySelector('.added-members-list').innerHTML = '';
    tempSearchResult='';
    modal.style.display = 'flex';
}





//#endregion

//#region Load Room

function createRoomItem(roomData){
    const roomElement = roomItemTemplate.content.cloneNode(true);
    const roomsList = document.getElementById('rooms-list');

    const label = roomElement.querySelector('.label');
    label.textContent = roomData.room_name;

    roomElement.querySelector('.selection-item').setAttribute('slug', roomData.slug);
    roomsList.insertBefore(roomElement, roomsList.firstChild);
}


async function loadRoom(btn=null, slug=null){

    if(rooms.length === 0){
        history.replaceState(null, '', `/groupchat`);
        switchDyMainContent('group-welcome-panel');
        return;
    }

    if(!btn && !slug){
        return;
    }

    if(!slug) slug = btn.getAttribute('slug'); 
    if(!btn) btn = document.querySelector(`.selection-item[slug="${slug}"]`);

    const lastActive = document.getElementById('rooms-list').querySelector('.selection-item.active');
    if(lastActive){
        lastActive.classList.remove('active')
    }
    btn.classList.add('active');

    switchDyMainContent('chat');
    history.replaceState(null, '', `/groupchat/${slug}`);

    const roomData = await RequestRoomContent(slug);
    if(!roomData){
        return;
    }
    // console.log(roomData);
    clearChatlog();

    activeRoom = roomData;
    const chatControlPanel = document.querySelector('#room-control-panel');
    chatControlPanel.querySelector('#chat-name').textContent = roomData.name;
    chatControlPanel.querySelector('#chat-slug').textContent = roomData.slug;

    if(roomData.room_icon){
        chatControlPanel.querySelector('#info-panel-chat-icon').style.display = "block";
        chatControlPanel.querySelector('#control-panel-chat-initials').style.display = "none";
        chatControlPanel.querySelector('#info-panel-chat-icon').setAttribute('src', roomData.room_icon);
    }
    else{
        chatControlPanel.querySelector('#info-panel-chat-icon').style.display = "none";
        chatControlPanel.querySelector('#control-panel-chat-initials').style.display = "block";
        chatControlPanel.querySelector('#control-panel-chat-initials').innerHTML = roomData.name.slice(0, 2).toUpperCase();
        chatControlPanel.querySelector('#info-panel-chat-icon').setAttribute('src', '');
    }

    loadRoomMembers(roomData);

    const roomKey = await keychainGet(slug);
    const aiCryptoSalt = await fetchServerSalt('AI_CRYPTO_SALT');
    const aiKey = await deriveKey(roomKey, slug, aiCryptoSalt);

    if(roomData.room_description){
        const descriptObj = JSON.parse(roomData.room_description);
        const roomDescription = await decryptWithSymKey(roomKey, descriptObj.ciphertext, descriptObj.iv, descriptObj.tag, false);
        chatControlPanel.querySelector('#description-field').textContent = roomDescription;
        activeRoom.room_description = roomDescription;
    }
    if(roomData.system_prompt){
        const systemPromptObj = JSON.parse(roomData.system_prompt);
        const systemPrompt = await decryptWithSymKey(roomKey, systemPromptObj.ciphertext, systemPromptObj.iv, systemPromptObj.tag, false);
        chatControlPanel.querySelector('#system_prompt-field').innerText = systemPrompt;
        document.getElementById('input-controls-props-panel').querySelector('#system_prompt_field').textContent = systemPrompt;
        activeRoom.system_prompt = systemPrompt;
    }

    for (const msgData of roomData.messagesData) {
        const key = msgData.message_role === 'assistant' ? aiKey : roomKey;
        msgData.content = await decryptWithSymKey(key, msgData.content, msgData.iv, msgData.tag, false);
    }
    filterRoleElements(roomData.role);
    loadMessagesOnGUI(roomData.messagesData);
    scrollToLast(true);
}



function loadRoomMembers(roomData) {
    const membersList = document.getElementById('room-control-panel').querySelector('.members-list');
    // Clear existing members
    membersList.innerHTML = `
        <button class="btn-sm add-member-btn admin-only" id="invite-btn" onclick="openInvitationPanel()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="feather feather-plus">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
        </button>`;

    roomData.members.forEach(member => {
        if (member.name === 'AI') return;

        const memberBtnTemp = document.getElementById('member-listBtn-template').content.cloneNode(true);
        const memberBtnIcon = memberBtnTemp.querySelector('#member-icon');
        const memberBtnInit = memberBtnTemp.querySelector('#member-init');
        const memberBtn = memberBtnTemp.querySelector('#member-btn');

        if (member.avatar_url) {
            memberBtnIcon.setAttribute('src', member.avatar_url);
            memberBtnInit.remove();
        } else {
            memberBtnIcon.remove();
            memberBtnInit.textContent = member.name.slice(0, 2).toUpperCase();
        }
        // Set member object in the button attribute
        memberBtn.setAttribute('memberObj', JSON.stringify(member));
        // Append to the header and the list
        membersList.insertBefore(memberBtnTemp, membersList.querySelector('#invite-btn'));
    });
}



async function RequestRoomContent(slug){

    url = `/req/room/${slug}`;
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    try{
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken
            },
        });

        if(!response.ok){
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    }
    catch (err){
        console.error('Error fetching data:', error);
        throw err;
    }
}

const MemberRoles = {
    ADMIN: { id: 'admin', className: 'admin-only' },
    EDITOR: { id: 'editor', className: 'editor-only' },
    VIEWER: { id: 'viewer', className: 'viewer-only' }
};
function filterRoleElements(roleId) {
    const role = Object.values(MemberRoles).find(r => r.id === roleId);
    
    if (!role) {
        throw new Error('Invalid User Role.');
    }

    const elementsByClass = (role) => document.querySelectorAll(`.${role.className}`);
    const toggleDisplay = (elements, shouldShow) => elements.forEach(element => {
        if (shouldShow) {
            const originalDisplay = element.dataset.originalDisplay || element.style.display;
            element.style.display = originalDisplay || 'block';
        } else {
            if (!element.dataset.originalDisplay) {
                element.dataset.originalDisplay = window.getComputedStyle(element).display;
            }
            element.style.display = 'none';
        }
    });

    for (const currentRole of Object.values(MemberRoles)) {
        const elements = elementsByClass(currentRole);
        if (roleId === MemberRoles.ADMIN.id || roleId === currentRole.id) {
            toggleDisplay(elements, true);
        } else {
            toggleDisplay(elements, false);
        }
    }
} 

//#endregion

//#region Add Member
let tempSearchResult;
async function searchUser(searchBar) {
    const query = searchBar.value.trim();
    const resultPanel = searchBar.closest('.search-panel').querySelector('#searchResults');

    if (query.length > 2) { // Start searching after 3 characters
        try {
            const response = await fetch(`/req/search?query=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (data.success) {
                resultPanel.innerHTML = ''; // Clear previous results

                const addedList = searchBar.closest('.add-members-section').querySelector('.added-members-list');
                ignoreList = [];
                ignoreList.push('HAWKI');
                ignoreList.push(userInfo.username);
                if(activeRoom){
                    activeRoom.members.forEach(member => {
                        ignoreList.push(member.username);
                    });
                }
                addedList.childNodes.forEach(child => {
                    if (child.dataset && child.dataset.obj) {
                        const username = JSON.parse(child.dataset.obj).username;
                        ignoreList.push(username);
                    }
                });
                
                data.users.forEach(user => {
                    // Check if the user's username is already in the ignoreList
                    const isAlreadyAdded = ignoreList.some(invitedUsername => invitedUsername === user.username);
                    if(isAlreadyAdded){
                        const index = data.users.indexOf(user);
                        data.users.splice(index, 1);
                        return;
                    }

                    const option = document.createElement('li');
                    option.dataset.value = JSON.stringify(user);
                    option.innerText = user.username;
                    option.addEventListener('click', ()=>{
                        searchBar.value = user.username; // Fill the search bar with the selected username
                        tempSearchResult = JSON.stringify(user);
                        resultPanel.innerHTML = '';
                        resultPanel.style.display = "none";
                    })
                    
                    resultPanel.appendChild(option);

                });
                resultPanel.style.display = data.users.length > 0 ? "block" : "none";

            } else {
                resultPanel.style.display = "none";
                resultPanel.innerHTML = ''; // Clear results if no user found
            }
        } catch (error) {
            console.error('There was an error processing your request.', error);
            // Handle the error appropriately here
        }
    } else {
        resultPanel.style.display = "none";
        resultPanel.innerHTML = ''; // Clear results if query is too short
    }
}

function onHandleKeydownUserSearch(event, searchBar){
    if(event.key == "Enter" && !event.shiftKey){
        event.preventDefault();

        const resultsPanel = searchBar.closest('.search-panel').querySelector('#searchResults');
        if(resultsPanel.childElementCount > 0 ){
            const first = resultsPanel.firstElementChild
            searchBar.value = first.innerText;
            tempSearchResult = first.dataset.value;
            resultsPanel.innerHTML = '';
            resultsPanel.style.display = "none";
            return;
        }
        addUserToList(searchBar);
    }
}

function onAddUserButton(btn){
    const srcPanel = btn.closest('.search-panel');
    const searchBar = srcPanel.querySelector("#user-search-bar");
    addUserToList(searchBar);
}

function addUserToList(searchBar) {
    
    const selectedUser = searchBar.value.trim();
    if (!selectedUser || !tempSearchResult || tempSearchResult.length === 0) {
        // alert('Please select a valid user.');
        return;
    }

    // Ensure the added member list exists
    const addedList = searchBar.closest('.add-members-section').querySelector('.added-members-list');
    if (!addedList) {
        return;
    }
    // Clear the search bar value
    searchBar.value = '';

    // Create a new element for the added user
    const temp = document.getElementById('added-member-template');
    const item = temp.content.cloneNode(true);
    const element = item.querySelector('.added-member');

    // Store the user object with the selected
    tempSearchResult = JSON.parse(tempSearchResult);
    tempSearchResult.role = searchBar.parentElement.querySelector('#user-role-selector').value;
    element.dataset.obj = JSON.stringify(tempSearchResult);
    element.querySelector('p').innerHTML = `<b>${tempSearchResult.name}</b> - ${tempSearchResult.role}`;

    // Apply a random background color
    element.style.backgroundColor = generateRandomColor();

    // Add the new element to the list
    addedList.appendChild(element);

    // Optionally clear the temporary search result for new searches
    tempSearchResult = null;
}

function removeAddedMember(btn){
    const am = btn.closest('.added-member');
    am.remove();
}

function generateRandomColor() {
    const r = Math.floor(Math.random() * 128) + 127; // Random value between 127 and 255
    const g = Math.floor(Math.random() * 128) + 127; 
    const b = Math.floor(Math.random() * 128) + 127;
    return `rgba(${r}, ${g}, ${b}, 0.7)`;
}
//#endregion

//#region Room Control Panel
function openRoomCP(){

    // if edit modes are still active deactivate them
    const cp = document.getElementById('room-control-panel')
    const editBtns = cp.querySelectorAll('#edit-abort');
    editBtns.forEach(btn => {
        if(btn.closest('.edit-panel').parentElement.querySelector('.text-field').getAttribute('contenteditable') === true){
            // console.log('switching edit panel')
            abortTextPanelEdit(btn);
        }
    });

    const textField = document.getElementById('system_prompt-field');
    textField.addEventListener('paste', function(e) {
        // Prevent the default paste behavior
        e.preventDefault();

        // Get clipboard data as plain text
        const text = (e.clipboardData || window.clipboardData).getData('text');

        // Insert the plain text at the cursor position
        document.execCommand('insertText', false, text);
    });
    const descField = document.getElementById('description-panel');
    descField.addEventListener('paste', function(e) {
        // Prevent the default paste behavior
        e.preventDefault();
        
        // Get clipboard data as plain text
        const text = (e.clipboardData || window.clipboardData).getData('text');

        // Insert the plain text at the cursor position
        document.execCommand('insertText', false, text);
    });
    switchDyMainContent('room-control-panel');
}

function closeRoomCP(){
    submitInfoField();
    switchDyMainContent('chat');
}

function editTextPanel(btn) {
    const editPanel = btn.closest('.edit-panel');
    const textPanel = editPanel.closest('.text-cont');
    const textField = textPanel.querySelector('.text-field');

    textField.dataset.txtCache = textField.innerText;

    // Switch buttons
    const confirmBtn = editPanel.querySelector('#edit-confirm');
    const abortBtn = editPanel.querySelector('#edit-abort');

    confirmBtn.style.display = "inline-block";
    abortBtn.style.display = "inline-block";
    btn.style.display = "none";

    // Make the text field editable
    textField.setAttribute('contenteditable', true);
    if(textField.closest('.text-panel')){
        textField.closest('.text-panel').classList.add('editMode');
    }
    textField.focus();

    var range,selection;
    if(document.createRange)//Firefox, Chrome, Opera, Safari, IE 9+
    {
        range = document.createRange();
        range.selectNodeContents(textField);
        range.collapse(false);
        selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }
    else if(document.selection)//IE 8 and lower
    { 
        range = document.body.createTextRange();
        range.moveToElementText(textField);
        range.collapse(false);
        range.select();
    }
}

function abortTextPanelEdit(btn){

    const editPanel = btn.closest('.edit-panel');
    const textPanel = editPanel.closest('.text-cont');
    const textField = textPanel.querySelector('.text-field');
    const editBtn = editPanel.querySelector('#edit-btn');
    const confirmBtn = editPanel.querySelector('#edit-confirm');

    btn.style.display = "none";
    confirmBtn.style.display = "none";
    editBtn.style.display = "inline-block";

    textField.setAttribute('contenteditable', false);
    if(textField.closest('.text-panel')){
        textField.closest('.text-panel').classList.remove('editMode');
    }
    textField.innerText = textField.dataset.txtCache;
    textField.removeAttribute('data-txtCache')
}

function confirmTextPanelEdit(btn){
    const editPanel = btn.closest('.edit-panel');
    const textPanel = editPanel.closest('.text-cont');
    const textField = textPanel.querySelector('.text-field');
    const editBtn = editPanel.querySelector('#edit-btn');
    const abortBtn = editPanel.querySelector('#edit-abort');

    btn.style.display = "none";
    abortBtn.style.display = "none";
    editBtn.style.display = "inline-block";

    textField.setAttribute('contenteditable', false);
    if(textField.closest('.text-panel')){
        textField.closest('.text-panel').classList.remove('editMode');
    }
    textField.removeAttribute('data-txtCache')
}

async function submitInfoField(){

    const roomCP = document.getElementById('room-control-panel');    
    switch(activeModule){
        case('chat'): 

        break;
        case('groupchat'): 
            const chatName = roomCP.querySelector('#chat-name').textContent;
            document.getElementById('rooms-list')
                    .querySelector(`.selection-item[slug=${activeRoom.slug}`)
                    .querySelector('.label').innerText = chatName;

            const description = roomCP.querySelector('#description-field').textContent;
            const systemPrompt = roomCP.querySelector('#system_prompt-field').textContent;

            const roomKey = await keychainGet(activeRoom.slug);

            const cryptDescription = await encryptWithSymKey(roomKey, description, false);
            const descriptionStr = JSON.stringify({
                'ciphertext':cryptDescription.ciphertext,
                'iv':cryptDescription.iv,
                'tag':cryptDescription.tag,
            });
            const cryptSystemPrompt = await encryptWithSymKey(roomKey, systemPrompt, false);
            const systemPromptStr = JSON.stringify({
                'ciphertext':cryptSystemPrompt.ciphertext,
                'iv':cryptSystemPrompt.iv,
                'tag':cryptSystemPrompt.tag,
            });

            attributes ={
                'name':chatName,
                'systemPrompt':systemPromptStr,
                'description':descriptionStr
            }
            updateRoomInfo(activeRoom.slug, attributes);

        break;
    }
}


async function requestDeleteRoom() {

    const confirmed = await openModal(ModalType.CONFIRM, translation.Cnf_deleteRoom);
    if (!confirmed) {
        return;
    }

    const url = `/req/room/removeRoom/${activeRoom.slug}`;
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken
            },
        });
        const data = await response.json();

        if (data.success) {
            // console.log('Room removed successfully');

            const listItem = document.querySelector(`.selection-item[slug="${activeRoom.slug}"]`);
            const list = listItem.parentElement;
            listItem.remove();

            if(list.childElementCount > 0){
                loadRoom(list.firstElementChild, null);
                switchDyMainContent('chat');

            }
            else{
                switchDyMainContent('group-welcome-panel');
                history.replaceState(null, '', `/groupchat`);
            }


        } else {
            console.error('Room removal was not successful!');
        }
    } catch (error) {
        console.error('Failed to remove room!');
    }
}


async function leaveRoom(){

    const confirmed = await openModal(ModalType.CONFIRM, translation.Cnf_leaveRoom);
    if (!confirmed) {
        return;
    }

    const url = `/req/room/leaveRoom/${activeRoom.slug}`;
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken
            },
        });
        const data = await response.json();

        if (data.success) {
            const listItem = document.querySelector(`.selection-item[slug="${activeRoom.slug}"]`);
            const list = listItem.parentElement;
            listItem.remove();
            loadRoom(list.firstElementChild, null);
            switchDyMainContent('chat');

        } else {
            console.error('Room leave was not successful!');
        }
    } catch (error) {
        console.error('Failed to leave room!');
    }
}


async function removeMemberFromRoom(username){

    const confirmed = await openModal(ModalType.CONFIRM, translation.Cnf_removeMember);
    if (!confirmed) {
        return false;
    }

    const url = `/req/room/removeMember/${activeRoom.slug}`;
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken
            },
            body: JSON.stringify({'username': username})
        });
        const data = await response.json();

        if (data.success) {
            // console.log('user removed from room');
            return true;
        } else {
            console.error('Removeing user was not successful!');
        }
    } catch (error) {
        console.error('Failed to remove user!');
    }
    
}

//#endregion

//#region Room Info controls

function selectRoomAvatar(btn, upload = false){

    const imageElement = btn.parentElement.querySelector('.selectable-image');
    const initials = btn.parentElement.querySelector('#control-panel-chat-initials');
    // console.log(imageElement);
    openImageSelection(imageElement.getAttribute('src'), function(croppedImage) {
        imageElement.style.display = 'block';
        if(initials){
            initials.style.display = 'none';
        }

        imageElement.setAttribute('src', croppedImage);
        if(upload){
            uploadRoomAvatar(croppedImage);
        }
    });
}

async function uploadRoomAvatar(imgBase64){
    // console.log(activeRoom)
    const url = `/req/room/updateInfo/${activeRoom.slug}`;
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken
            },
            body: JSON.stringify({'img':imgBase64})
        });
        const data = await response.json();

        if (data.success) {
            // console.log('Image Uploaded Successfully');
            
        } else {
            console.error('Upload not successfull');
        }
    } catch (error) {
        console.error('Failed to upload image to server!');
    }
}


async function updateRoomInfo(slug, attributes){

    if(!slug){
        slug = activeRoom.slug;
        if(!slug){
            console.error('room slug not found');
        }
    }

    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    const url = `/req/room/updateInfo/${slug}`; 

    let requestObj = {};
    if(attributes.systemPrompt) requestObj.system_prompt = attributes.systemPrompt;
    if(attributes.description) requestObj.description = attributes.description;
    if(attributes.name) requestObj.name = attributes.name;
    if(attributes.img) requestObj.img = attributes.img;

    try{
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken
            },
            body: JSON.stringify(requestObj)
        });

        if(!response.ok){
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if(data.success){
            // console.log('Room Information updated successfully');
        }        
    }
    catch (err){
        console.error('Error fetching data:', error);
        throw err;
    }
}
//#endregion