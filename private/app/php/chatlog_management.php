<?php

$encryptionSalt = isset($env) ? $env['CHATLOG_ENCRYPTION_SALT'] : getenv('CHATLOG_ENCRYPTION_SALT');
$userSpecificSalt = $encryptionSalt . $_SESSION['username'];

?>

<script>

    function saveMessagesToLocalStorage() {

        const username = '<?= htmlspecialchars($_SESSION['username']) ?>';
        const messagesElement = document.querySelector(".messages");
        const messageElements = messagesElement.querySelectorAll(".message");
        
        let archiveObject = { 
            storageDate: Date.now(), 
            messages: {} 
        };


        // Laden der existierenden Daten aus dem localStorage
        const existingData = JSON.parse(localStorage.getItem('chatLog_' + username));
        if (existingData) {
            archiveObject = existingData;
        }

        // Neue Nachrichten für das aktuelle Thema
        let newMessages = [];

        messageElements.forEach(messageElement => {
            let messageObject = {};
            messageObject = messageElement.dataset;

            if (messageElement.dataset.role === 'assistant') {
                messageObject.content = messageElement.querySelector(".message-text").getAttribute('rawContent');
            } else {
                messageObject.content = messageElement.querySelector(".message-text").textContent;
            }
            newMessages.push(messageObject);
        });

        // Stringify the message objects with pretty printing to preserve newlines
        const messageString = JSON.stringify(newMessages, null, 2);
        const compressedMessages = LZString.compressToUTF16(messageString);
        const salt = '<?= htmlspecialchars($userSpecificSalt) ?>';

        // Ableitung eines Schlüssels aus dem Benutzernamen
        const key = CryptoJS.PBKDF2(username, CryptoJS.enc.Hex.parse(salt), {
            keySize: 256 / 32,
            iterations: 1000
        });

        const encrypted = CryptoJS.AES.encrypt(compressedMessages, key.toString());
        const storageDate = Date.now();

        const roomStoragePackage = {
            encryptedData: encrypted.toString(),
        };

        // Speichern der verschlüsselten Nachrichten unter dem entsprechenden Thema
        archiveObject.messages[ActiveRoomID] = roomStoragePackage;

        // Aktualisierte Daten in den localStorage zurückschreiben
        localStorage.setItem('chatLog_' + username, JSON.stringify(archiveObject));
    }

    function loadMessagesFromLocalStorage() {
        const username = '<?= htmlspecialchars($_SESSION['username']) ?>'; // Use the PHP variable
        const storedData = localStorage.getItem('chatLog_' + username);
        if(storedData === null){
            return;
        }
        const parsedData = JSON.parse(storedData);
        const messagesObj = parsedData.messages[ActiveRoomID];
        if(messagesObj == null){
            return;
        }

        const encryptedData = messagesObj.encryptedData;
        const salt = '<?= htmlspecialchars($userSpecificSalt) ?>';

        if (encryptedData) {
            try {
                // Derive the key from the username
                const key = CryptoJS.PBKDF2(username, CryptoJS.enc.Hex.parse(salt), {
                    keySize: 256 / 32,
                    iterations: 1000
                });

                // Decrypt the messages
                const decrypted = CryptoJS.AES.decrypt(encryptedData, key.toString());
                const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
                // Decompress the messages
                const decompressedString = LZString.decompressFromUTF16(decryptedString)
                const messages = JSON.parse(decompressedString);

                if(messages == null){
                    return;
                }

                document.querySelector('.limitations')?.remove();
                const systemMessage = document.querySelector('.message[data-role="system"]');
                document.querySelector('.messages').removeChild(systemMessage);

                messages.forEach(message => {
                    const messagesElement = document.querySelector(".messages");
                    const messageTemplate = document.querySelector('#message');
                    const messageElement = messageTemplate.content.cloneNode(true);

                    messageElement.querySelector(".message").dataset.role = message.role;

                    if(message.role === "assistant"){
                        messageElement.querySelector(".message-icon").textContent = "AI";
                        messageElement.querySelector(".message-text").setAttribute('rawContent', message.content);

                        //FORMAT RAW TEXT AGAIN
                        const formattedContent = FormatWholeMessage(message.content);
                        messageElement.querySelector(".message-text").innerHTML = formattedContent;

                    } else{
                        messageElement.querySelector(".message-text").innerHTML = message.content;
                        messageElement.querySelector(".message-icon").textContent = '<?= htmlspecialchars($_SESSION['username']) ?>';
                        messageElement.querySelector(".message").classList.add("me");
                    }

                    messagesElement.appendChild(messageElement);
                    hljs.highlightAll();
                    FormatMathFormulas();
                    scrollToLast(true);

                    if(!document.querySelector(".message:last-child").classList.contains('me')){
                        ShowCopyButton();
                    }

                });
            } catch (error) {
                console.error("Failed to decrypt or parse messages:", error);
            }
        }
    }


    function cleanupStoredLogs(){
        const items = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith("chatLog_")) {
                const storedData = localStorage.getItem(localStorage.key(i));
                const parsedData = JSON.parse(storedData);

                // check if the stored data is older than one week
                if(Date.now() > parsedData.storageDate + 7 * 24 * 60 * 60 * 1000){
                    localStorage.removeItem(localStorage.key(i));
                }
            }
        }
    }


    function deleteChatLog(){
        const username = '<?= htmlspecialchars($_SESSION['username']) ?>'; // Use the PHP variable

        const storageUnit = localStorage.getItem('chatLog_' + username);

        if (storageUnit) {
            const parsedData = JSON.parse(storageUnit);

            if (parsedData && parsedData.messages) {
                const messages = parsedData.messages;
                // Remove the item corresponding to ActiveRoomID from messages
                if (messages[ActiveRoomID]) {
                    delete messages[ActiveRoomID];
                    
                    // Update the parsedData object
                    parsedData.messages = messages;

                    // Save the updated object back to localStorage
                    localStorage.setItem('chatLog_' + username, JSON.stringify(parsedData));
                }
            }
        }


        const chatBtn = document.getElementById(ActiveRoomID + "_MenuButton");
        load(chatBtn , ActiveRoomID + '.php');
        closeDeletePanel();
    }
    function openDeletePanel(){
        document.getElementById('delete-chat-confirm').style.display = "flex";
    }
    function closeDeletePanel(){
        document.getElementById('delete-chat-confirm').style.display = "none";
    }

</script>
