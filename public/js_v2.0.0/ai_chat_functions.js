
let convMessageTemplate;
let chatItemTemplate;
let activeConv;
let defaultPromt;
let chatlogElement;

function initializeAiChatModule(chatsObject){

    convMessageTemplate = document.getElementById('message-template');
    chatItemTemplate = document.getElementById('selection-item-template');
    chatlogElement = document.querySelector('.chatlog');

    // defaultPromt = "You're a helpful assistant at the HAWK university of applied sciences and arts.";
    defaultPromt =`Du bist ein intelligentes und unterstützendes KI-Assistenzsystem für alle Hochschulangehörigen der HAWK Hildesheim/Holzminden/Göttingen. Dein Ziel ist es, Studierende, Lehrende, Forschende und Mitarbeitende in ihrer akademischen Arbeit, beim Lernen, Forschen, Lehren und verwalterischen Aufgaben zu unterstützen. Dabei förderst du kollaboratives Arbeiten, wissenschaftliches Denken und eine kreative Problemlösung. Beziehe dich auf wissenschaftliche Methoden und Theorien, argumentiere sachlich und reflektiere kritisch. Sei objektiv und verzichte auf unbegründete Meinungen. Fördere akademische Integrität und unterstütze keine Plagiate. Sei inklusiv, wertschätzend und respektiere Vielfalt.`

    const systemPromptFields = document.querySelectorAll('.system_prompt_field');
    systemPromptFields.forEach(field => {
        field.textContent = defaultPromt;
    });

    chats = chatsObject.original;

    chats.forEach(conv => {
        createChatItem(conv);
    });

    if(document.querySelector('.trunk').childElementCount == 0){
        chatlogElement.classList.add('start-state');
    }

    initializeChatlogFunctions();

}


function onHandleKeydownConv(event){

    if(getSendBtnStat() === SendBtnStatus.SENDABLE){
        if(event.key == "Enter" && !event.shiftKey){
            event.preventDefault();
            selectActiveThread(event.target);
            sendMessageConv(event.target);
        }
    }
}

function onSendClickConv(btn){

    if(getSendBtnStat() === SendBtnStatus.SENDABLE){

        selectActiveThread(btn);
        //get inputfield relative to the button for multiple inputfields
        const input = btn.closest('.input');
        const inputField = input.querySelector('.input-field');
        sendMessageConv(inputField);
    }
    else if(getSendBtnStat() === SendBtnStatus.STOPPABLE){
        abortCtrl.abort();
    }
}

// SEND MESSAGE FUNCTION
async function sendMessageConv(inputField) {
    // block empty input field.
    if (inputField.value.trim() == "") {
        return;
    }
    inputText = String(escapeHTML(inputField.value.trim()));

    setSendBtnStatus(SendBtnStatus.LOADING);

    //create a message object.
    let messageObj = {
        message_role: 'user',
        content: inputText,
        filteredContent: detectMentioning(inputText),
        author: {
            username: userInfo.username,
            name: userInfo.name,
            avatar_url: userInfo.avatar_url,
        }
    };
    // empty input field
    inputField.value = "";
    resizeInputField(inputField);

    // if the chat is empty we need to initialize a new chatlog.
    let initConvPromise;
    if (document.querySelector('.trunk').childElementCount === 0) {
        await initNewConv(messageObj);
    }
    else{
        // ADDING MESSAGE TO CHATLOG
        // encrypt message
        const convKey = await keychainGet('aiConvKey');
        const cryptoMsg = await encryptWithSymKey(convKey, messageObj.content, false);
        messageObj.ciphertext = cryptoMsg.ciphertext;
        messageObj.iv = cryptoMsg.iv;
        messageObj.tag = cryptoMsg.tag;

        // Submit Message to server.

        const requestObj = {
            'isAi': false,
            'threadID': activeThreadIndex,
            'content': messageObj.ciphertext,
            'iv': messageObj.iv,
            'tag': messageObj.tag,
            'completion': true,
        }
        const submittedObj = await submitMessageToServer(requestObj, `/req/conv/sendMessage/${activeConv.slug}`);
        submittedObj.content = messageObj.content;
        submittedObj.username = userInfo.username

        // create and add message element to chatlog.
        const messageElement = addMessageToChatlog(submittedObj);
        messageElement.dataset.rawMsg = submittedObj.content;
        scrollToLast(true, messageElement);
    }

    const msgAttributes = {
        'threadIndex': activeThreadIndex,
        'broadcasting': false,
        'slug': '',
        'stream': true,
        'model': activeModel.id,
    }

    buildRequestObjectForAiConv(msgAttributes);
}


async function buildRequestObjectForAiConv(msgAttributes, messageElement = null, isUpdate = false, isDone = null){
    // let messageElement;
    let msg = "";
    let messageObj;

    // Start buildRequestObject processing
    buildRequestObject(msgAttributes, async (data, done) => {

        if(data){
            if(!msgAttributes['broadcasting'] && msgAttributes['stream']){
                setSendBtnStatus(SendBtnStatus.STOPPABLE);
            }

            const content = data.content;
            msg += content;
            messageObj = data;
            messageObj.message_role = 'assistant';
            messageObj.content = content;
            messageObj.completion = data.isDone;
            messageObj.model = msgAttributes['model'];

            if (!messageElement) {
                initializeMessageFormating()
                messageElement = addMessageToChatlog(messageObj, false);
            }
            messageElement.dataset.rawMsg = msg;

            const msgTxtElement = messageElement.querySelector(".message-text");

            msgTxtElement.innerHTML = formatChunk(content);
            formatMathFormulas(msgTxtElement);
            formatHljs(messageElement);

            if(messageElement.querySelector('.think')){
                scrollPanelToLast(messageElement.querySelector('.think').querySelector('.content-container'));
            }

            scrollToLast(false, messageElement);
        }

        if(done){
            setSendBtnStatus(SendBtnStatus.SENDABLE);

            const convKey = await keychainGet('aiConvKey');
            const cryptoMsg = await encryptWithSymKey(convKey, msg, false);

            messageObj.ciphertext = cryptoMsg.ciphertext;
            messageObj.iv = cryptoMsg.iv;
            messageObj.tag = cryptoMsg.tag;

            activateMessageControls(messageElement);

            const requestObj = {
                'threadID': activeThreadIndex,
                'content': messageObj.ciphertext,
                'iv': messageObj.iv,
                'tag': messageObj.tag,
                'model': messageObj.model,
                'completion': messageObj.completion
            }

            if(isUpdate){
                requestObj.message_id = messageElement.id;
                await requestMsgUpdate(requestObj, messageElement, `/req/conv/updateMessage/${activeConv.slug}`)
            }
            else{
                requestObj.isAi = true;
                const submittedObj = await submitMessageToServer(requestObj, `/req/conv/sendMessage/${activeConv.slug}`);

                submittedObj.content = msg;
                messageElement.dataset.rawMsg = msg;
                updateMessageElement(messageElement, submittedObj);
                activateMessageControls(messageElement);
            }

            if(isDone){
                isDone(true);
            }
        }
    });
}


//#region CONVERSATION FUNCTIONS

/// Initializing a new conversation.
async function initNewConv(messageObj){

    // if start State panel is there remove it.
    chatlogElement.classList.remove('start-state');

    // empty chatlog
    clearChatlog();
    //
    history.replaceState(null, '', `/chat`);

    //add new message Element.
    const messageElement = addMessageToChatlog(messageObj, false);

    //create conversation button in the list.
    const convItem = createChatItem();
    convItem.classList.add('active');

    //create conversation name.
    const convName = await generateChatName(messageObj.content, convItem);
    // console.log(convName);
    //submit conv to server.
    // after the server has accepted Submission conv data will be updated.
    const convData = await submitConvToServer(convName);

    //assign Slug to conv Item.
    convItem.setAttribute('slug', convData.slug);
    //update URL
    history.replaceState(null, '', `/chat/${convData.slug}`);

    //update active conv cache.
    activeConv = convData;

    //Encyrpt message
    const convKey = await keychainGet('aiConvKey');
    const contData = await encryptWithSymKey(convKey, messageObj.content);
    messageObj.ciphertext = contData.ciphertext;
    messageObj.iv = contData.iv;
    messageObj.tag = contData.tag;

    //submit message to server
    const requestObj = {
        'isAi': false,
        'threadID': activeThreadIndex,
        'content': messageObj.ciphertext,
        'iv': messageObj.iv,
        'tag': messageObj.tag,
        'completion': true,
    }
    const submittedObj = await submitMessageToServer(requestObj, `/req/conv/sendMessage/${activeConv.slug}`);

    // submitted message content is encrypted.
    // since we already have it we assign the unencrypted from messageObj.
    submittedObj.content = messageObj.content;
    // messageObj.content is still not processed. it equals the rawData.
    messageElement.dataset.rawMsg = submittedObj.content;

    // set the unassigned attirbutes to the temporarily made message Element.
    updateMessageElement(messageElement, submittedObj);
    // unlock message controls.
    activateMessageControls(messageElement);

}


function startNewChat(){
    chatlogElement.classList.add('start-state');
    clearChatlog();
    history.replaceState(null, '', `/chat`);

    const systemPromptFields = document.querySelectorAll('.system_prompt_field');
    systemPromptFields.forEach(field => {
        field.textContent = defaultPromt;
    });

    const lastActive = document.getElementById('chats-list').querySelector('.selection-item.active');
    if(lastActive){
        lastActive.classList.remove('active')
    }

    document.getElementById('input-container').focus();
}

function createChatItem(conv = null){

    const convItem = chatItemTemplate.content.cloneNode(true);
    const chatsList = document.getElementById('chats-list');
    const label = convItem.querySelector('.label');

    if(conv){
        convItem.querySelector('.selection-item').setAttribute('slug', conv.slug);
        label.textContent = conv.conv_name;
    }
    else{
        label.textContent = 'New Chat';
    }

    chatsList.insertBefore(convItem, chatsList.firstChild);

    return chatsList.firstElementChild;
}


async function generateChatName(firstMessage, convItem) {
    const requestObject = {
        payload: {
            model: titleGenerationModel,
            stream: true,
            messages: [
                {
                    role: "system",
                    content: {
                        text: `You are an assistant who assigns a three-word title to the message you receive. You only respond with the name. The naming accurately describes the message. The naming should be in  ${activeLocale.name}`
                    }
                },
                {
                    role: "user",
                    content: {
                        text: firstMessage
                    }
                }
            ]
        },
        broadcast: false,
        threadIndex: '',
        slug: '',
    };

    return new Promise((resolve, reject) => {
        postData(requestObject)
        .then((response) => response.json())
        .then((data) => {
           const convElement = convItem.querySelector('.label');
           let convName = ""; // Initialize to an empty string
            if (data) {
                convName += data.content;
                convElement.innerText = convName;
            }
            resolve(convName); // Resolve the promise with convName
            processStream(response.body, onData);
        })
        .catch(error => reject(error));
    });

}



async function submitConvToServer(convName) {
    // console.log(convName);
    const systemPrompt = document.querySelector('#system_prompt_field').textContent;
    const convKey = await keychainGet('aiConvKey');
    const cryptSystemPrompt = await encryptWithSymKey(convKey, systemPrompt, false);
    const systemPromptStr = JSON.stringify({
        'ciphertext':cryptSystemPrompt.ciphertext,
        'iv':cryptSystemPrompt.iv,
        'tag':cryptSystemPrompt.tag,
    });


    const requestObject = {
        conv_name: convName,
        system_prompt: systemPromptStr
    }

    try {
        const response = await fetch('/req/conv/createChat', {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify(requestObject)
        });

        const data = await response.json();

        if (data.success) {
            return data.conv;
        } else {
            // Handle unexpected response
            console.error('Unexpected response:', data);
        }
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
    }
}


async function loadConv(btn=null, slug=null){

    abortCtrl.abort();

    if(!btn && !slug){
        return;
    }

    if(!slug) slug = btn.getAttribute('slug');
    if(!btn) btn = document.querySelector(`.selection-item[slug="${slug}"]`);
    // switchDyMainContent('chat');

    const lastActive = document.getElementById('chats-list').querySelector('.selection-item.active');
    if(lastActive){
        lastActive.classList.remove('active')
    }
    btn.classList.add('active');



    switchDyMainContent('chat');

    history.replaceState(null, '', `/chat/${slug}`);

    const convData = await RequestConvContent(slug);

    if(!convData){
        return;
    }

    clearChatlog();
    activeConv = convData;

    const convKey = await keychainGet('aiConvKey');
    const systemPromptObj = JSON.parse(convData.system_prompt);
    const systemPrompt = await decryptWithSymKey(convKey, systemPromptObj.ciphertext, systemPromptObj.iv, systemPromptObj.tag, false);

    activeConv.system_prompt = systemPrompt;

    const systemPromptFields = document.querySelectorAll('.system_prompt_field');
    systemPromptFields.forEach(field => {
        field.textContent = systemPrompt;
    });


    const msgs = convData.messages;
    for (const msg of msgs) {
        const decryptedContent =  await decryptWithSymKey(convKey, msg.content, msg.iv, msg.tag);
        msg.content = decryptedContent;
        // console.log(msg.content);
    };

    if(msgs.length > 0){
        chatlogElement.classList.remove('start-state');
    }
    else{
        chatlogElement.classList.add('start-state');
    }

    loadMessagesOnGUI(convData.messages);
    scrollToLast(true);
}




async function RequestConvContent(slug){

    url = `/req/conv/${slug}`;
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



async function requestDeleteConv() {

    const confirmed = await openModal(ModalType.WARNING , translation.Cnf_deleteConv);
    if (!confirmed) {
        return;
    }

    const url = `/req/conv/removeConv/${activeConv.slug}`;
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
            // console.log('conv removed successfully');

            const listItem = document.querySelector(`.selection-item[slug="${activeConv.slug}"]`);
            const list = listItem.parentElement;
            listItem.remove();
            // console.log(list.childElementCount);
            if(list.childElementCount > 0){
                loadConv(list.firstElementChild, null);
            }
            else{
                clearChatlog();
                chatlogElement.classList.remove('active');
                history.replaceState(null, '', `/chat`);
            }

        } else {
            console.error('Conv removal was not successful!');
        }
    } catch (error) {
        console.error('Failed to remove conv!');
    }
}

//#endregion
