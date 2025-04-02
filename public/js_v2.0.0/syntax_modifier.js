
//0. initializeMessageFormating: resets all variables to start message.(at request function)
//1. Gets the received Chunk.
//2. escape HTML to prevent injection or mistaken rendering.
//3. format text for code blocks.
//4. replace markdown sytaxes for interface rendering

let summedText = '';

function initializeMessageFormating() {
    summedText = '';
}

function formatChunk(chunk, groundingMetadata) {
    // Append the incoming chunk to the summedText
    summedText += chunk;
    let formatText = summedText;

    // Count how many triple backticks are currently in the summedText
    const backtickCount = (summedText.match(/```/g) || []).length;
    // Check if there is an unclosed code block (odd number of backticks)
    if (backtickCount % 2 !== 0) {
        // Add a closing triple backtick to close the unclosed code block
        formatText += '```';
    }
    

    
    // Count how many <think> and </think> tags are currently in the summedText
    const thinkOpenCount = (summedText.match(/<think>/g) || []).length;
    const thinkCloseCount = (summedText.match(/<\/think>/g) || []).length;

    // Check if there is an unclosed <think> block (more open than close tags)
    if (thinkOpenCount > thinkCloseCount) {
        // Add a closing </think> to close the unclosed think block
        formatText += '</think>';
    }

    // Render the summedText using markdown processor
    const markdownReplaced = formatMessage(formatText, groundingMetadata);
    return markdownReplaced;
}

function escapeHTML(text) {
    return text.replace(/["&'<>]/g, function (match) {
        return {
            '"': '&quot;',
            '&': '&amp;',
            "'": '&#039;',
            '<': '&lt;',
            '>': '&gt;'
        }[match];
    });
}



function formatMessage(rawContent, groundingMetadata = '') {
    // Process citations and preserve HTML elements in one step
    let contentToProcess = formatGoogleCitations(rawContent, groundingMetadata);
    
    // Process content with placeholders for math and think blocks
    const { processedContent, mathReplacements, thinkReplacements } = preprocessContent(contentToProcess);
    
    // Apply markdown rendering
    const markdownProcessed = md.render(processedContent);
    
    // Restore math and think block content
    let finalContent = postprocessContent(markdownProcessed, mathReplacements, thinkReplacements);
    
    finalContent = convertHyperlinksToLinks(finalContent);
    
    // Restore preserved HTML elements
    finalContent = restoreGoogleCitations(finalContent);

    return finalContent;
}


function formatHljs(messageElement){
    messageElement.querySelectorAll('pre code').forEach((block) => {

        if(block.dataset.highlighted != 'true'){
            hljs.highlightElement(block);
        }
        const language = block.result?.language || block.className.match(/language-(\w+)/)?.[1];
        if (language) {
            if(!block.parentElement.querySelector('.hljs-code-header')){
                const header = document.createElement('div');
                header.classList.add('hljs-code-header');
                header.textContent = language;
                block.parentElement.insertBefore(header, block);
            }
        }
    });
}



// Preprocess content: Handle math formulas, think blocks, and preserve HTML elements
function preprocessContent(content) {
    const mathRegex = /(\$\$[^0-9].*?\$\$|\$[^0-9].*?\$|\\\(.*?\\\)|\\\[.*?\\\])/gs;
    const thinkRegex = /<think>[\s\S]*?<\/think>/g;
    const codeBlockRegex = /(```[\s\S]*?```)/g;

    const mathReplacements = [];
    const thinkReplacements = [];

    let splitContent = [];
    let lastIndex = 0;

    // Split the content on code blocks and process only non-code segments
    content.replace(codeBlockRegex, (match, codeBlock, offset) => {
        const nonCodeSegment = content.slice(lastIndex, offset);
        
        // Process and replace math expressions
        const processedSegment = nonCodeSegment.replace(mathRegex, (mathMatch) => {
            if (/^\$\d+/.test(mathMatch)) { 
                return mathMatch; // Leave currency values untouched
            }
            mathReplacements.push(mathMatch);
            return `%%%MATH${mathReplacements.length - 1}%%%`;
        });

        // Process and replace think blocks
        splitContent.push(processedSegment.replace(thinkRegex, (thinkMatch) => {
            thinkReplacements.push(thinkMatch);
            return `%%%THINK${thinkReplacements.length - 1}%%%`;
        }));

        // Add the code block segment unchanged
        splitContent.push(codeBlock);

        lastIndex = offset + codeBlock.length;
        return match;
    });

    // Add any remaining content after the last code block
    if (lastIndex < content.length) {
        const nonCodeSegment = content.slice(lastIndex);

        // Process and replace math expressions
        const processedSegment = nonCodeSegment.replace(mathRegex, (mathMatch) => {
            mathReplacements.push(mathMatch);
            return `%%%MATH${mathReplacements.length - 1}%%%`;
        });

        // Process and replace think blocks
        splitContent.push(processedSegment.replace(thinkRegex, (thinkMatch) => {
            thinkReplacements.push(thinkMatch);
            return `%%%THINK${thinkReplacements.length - 1}%%%`;
        }));
    }

    const processedContent = splitContent.join('');
    return { processedContent, mathReplacements, thinkReplacements };
}



// Process content after Markdown rendering
function postprocessContent(content, mathReplacements, thinkReplacements) {
    // Replace math placeholders
    content = content.replace(/%%%MATH(\d+)%%%/g, (_, index) => {
        const rawMath = mathReplacements[index];
        const isComplexFormula = rawMath.length > 10;
        if (isComplexFormula) {
            return `<div class="math" data-rawMath="${rawMath}" data-index="${index}">${rawMath}</div>`;
        } else {
            return rawMath;
        }
    });

    // Replace think placeholders
    content = content.replace(/%%%THINK(\d+)%%%/g, (_, index) => {
        const rawThinkContent = thinkReplacements[index];
        const thinkContent = rawThinkContent.slice(7, -8); // Remove <think> and </think> tags

        const thinkTemp = document.getElementById('think-block-template');
        const thinkClone = thinkTemp.content.cloneNode(true);
        const thinkElement = thinkClone.querySelector(".think");
        thinkElement.querySelector('.content').innerText = thinkContent.trim()

        const tempContainer = document.createElement('div');
        tempContainer.appendChild(thinkElement);
        return tempContainer.innerHTML;
    });

    return content;
}

function convertHyperlinksToLinks(text) {
    // Regular expression to match URLs
    const urlRegex = /https?:\/\/[^\s]+/g;

    // Replace each URL match with an <a> tag
    const processedText = text.replace(urlRegex, function(url) {
        return `<a href="${url}" target="_blank">${url}</a>`;
    });

    // Return the processed text
    return processedText;
}

// Helper function to escape special characters in regular expressions
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}



function formatMathFormulas(element) {
    renderMathInElement(element, {
        delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
        ],
        displayMode: true, // This sets a global setting for display mode; use delimiters for specific mode handling
        ignoredClasses: ["ignore_Format"],
        throwOnError: true // Whether to throw an error or render invalid syntax as red text
    });
}


function addGoogleRenderedContent(messageElement, groundingMetadata){
    // Handle search suggestions/rendered content
    if (groundingMetadata && typeof groundingMetadata === 'object' &&
        groundingMetadata.searchEntryPoint &&
        groundingMetadata.searchEntryPoint.renderedContent) {
                
        const render = groundingMetadata.searchEntryPoint.renderedContent;
        // Extract the HTML Tag (Styles already defined in CSS file)
        const parser = new DOMParser();
        const doc = parser.parseFromString(render, 'text/html');
        const divElement = doc.querySelector('.container');

        if (divElement) {
            const chips = divElement.querySelectorAll('a');
            chips.forEach(chip => {
                chip.setAttribute('target', "_blank");
            });

            // Create a new span to hold the content
            const newSpan = document.createElement('span');
            newSpan.classList.add('google-search');
            newSpan.innerHTML = divElement.outerHTML; 
            // Append the new span to the target element
            messageElement.querySelector(".message-content").appendChild(newSpan);
        }
    }
}

// Temporary storage for HTML elements to preserve
const preservedHTML = [];

function formatGoogleCitations(content, groundingMetadata = '') {
    // Clear the previous preserved HTML array
    preservedHTML.length = 0;
    
    let processedContent = content;
    
    if (groundingMetadata?.groundingSupports?.length) {
        groundingMetadata.groundingSupports.forEach((support) => {
            const segmentText = support.segment?.text || '';
            const indices = support.groundingChunkIndices;

            if (segmentText && Array.isArray(indices) && indices.length) {
                // Generate footnote references inline
                const footnotesRef = `<sup><span>` + indices.map(idx => 
                    `<a class="inline-citation" href="#source${idx + 1}">[${idx + 1}]</a>`).join(', ') 
                    + `</span></sup>`;

                // Replace the text segment with itself plus the footnote reference
                processedContent = processedContent.replace(
                    new RegExp(escapeRegExp(segmentText), 'g'), 
                    match => match + footnotesRef
                );
            }
        });
    }

    let sourcesMarkdown = '';

    if (groundingMetadata?.groundingChunks?.length) {
        sourcesMarkdown = '\n\n### Search Sources:\n';

        groundingMetadata.groundingChunks.forEach((chunk, index) => {
            if (chunk.web?.uri && chunk.web?.title) {
                sourcesMarkdown += `${index + 1}. <a id="source${index + 1}" href="${chunk.web.uri}" target="_blank" class="source-link"><b>${chunk.web.title}</b></a>\n`;
            }
        });

        if (sourcesMarkdown !== '\n\n### Search Sources:\n') {
            processedContent += sourcesMarkdown;
        }
    }

    // Preserve only necessary HTML elements in the main content (not sources)
    const htmlPattern = /<sup>.*?<\/sup>|<a\s+.*?<\/a>/g;
    processedContent = processedContent.replace(htmlPattern, (match) => {
        const id = preservedHTML.length;
        preservedHTML.push(match);
        return `%%HTML_PRESERVED_${id}%%`;
    });

    return processedContent;
}


// // Restore the preserved HTML after markdown processing
function restoreGoogleCitations(content) {
    let result = content;
    
    for (let i = 0; i < preservedHTML.length; i++) {
        // Use a regex with \b (if applicable) or a flexible match
        const placeholder = new RegExp(`%%HTML_PRESERVED_${i}%%`, 'g');
        
        // Replace and ensure a new line is added
        result = result.replace(placeholder, preservedHTML[i] + '\n');
    }
    
    return result;
}
