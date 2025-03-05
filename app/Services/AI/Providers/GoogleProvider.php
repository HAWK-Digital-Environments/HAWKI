<?php

namespace App\Services\AI\Providers;

use Illuminate\Support\Facades\Log;

class GoogleProvider extends BaseAIModelProvider
{
    /**
     * Format the raw payload for Google API
     *
     * @param array $rawPayload
     * @return array
     */
    public function formatPayload(array $rawPayload): array
    {
        $messages = $rawPayload['messages'];
        $modelId = $rawPayload['model'];
        
        // Format messages for Google
        $formattedMessages = [];
        foreach ($messages as $message) {
            $formattedMessages[] = [
                'role' => $message['role'] === 'assistant' ? 'model' : 'user',
                'parts' => [
                    'text' => $message['content']['text']
                ]
            ];
        }
        
        $payload = [
            'model' => $modelId,
            'contents' => $formattedMessages,
            'stream' => $rawPayload['stream'] && $this->supportsStreaming($modelId),
        ];
        
        // Add optional parameters if present in the raw payload
        if (isset($rawPayload['temperature'])) {
            $payload['generationConfig']['temperature'] = $rawPayload['temperature'];
        }
        
        if (isset($rawPayload['top_p'])) {
            $payload['generationConfig']['topP'] = $rawPayload['top_p'];
        }
        
        if (isset($rawPayload['top_k'])) {
            $payload['generationConfig']['topK'] = $rawPayload['top_k'];
        }
        
        if (isset($rawPayload['max_output_tokens'])) {
            $payload['generationConfig']['maxOutputTokens'] = $rawPayload['max_output_tokens'];
        }
        
        return $payload;
    }
    
    /**
     * Format the complete response from Google
     *
     * @param mixed $response
     * @return array
     */
    public function formatResponse($response): array
    {
        $responseContent = $response->getContent();
        $jsonContent = json_decode($responseContent, true);
        
        $content = $jsonContent['candidates'][0]['content']['parts'][0]['text'] ?? '';
        
        return [
            'content' => $content,
            'usage' => $this->extractUsage($jsonContent)
        ];
    }
    
    /**
     * Format a single chunk from a streaming response
     *
     * @param string $chunk
     * @return array
     */
    public function formatStreamChunk(string $chunk): array
    {
        $jsonChunk = json_decode($chunk, true);
        
        $content = '';
        $isDone = false;
        $usage = null;
        
        // Extract content if available
        if (isset($jsonChunk['candidates'][0]['content']['parts'][0]['text'])) {
            $content = $jsonChunk['candidates'][0]['content']['parts'][0]['text'];
        }
        
        // Check for completion
        if (isset($jsonChunk['candidates'][0]['finishReason']) && 
            $jsonChunk['candidates'][0]['finishReason'] !== 'FINISH_REASON_UNSPECIFIED') {
            $isDone = true;
        }
        
        // Extract usage if available
        if (isset($jsonChunk['usageMetadata'])) {
            $usage = $this->extractUsage($jsonChunk);
        }
        
        return [
            'content' => $content,
            'isDone' => $isDone,
            'usage' => $usage
        ];
    }
    
    /**
     * Extract usage information from Google response
     *
     * @param array $data
     * @return array|null
     */
    protected function extractUsage(array $data): ?array
    {
        if (empty($data['usageMetadata'])) {
            return null;
        }
        
        return [
            'prompt_tokens' => $data['usageMetadata']['promptTokenCount'] ?? 0,
            'completion_tokens' => $data['usageMetadata']['candidatesTokenCount'] ?? 0,
        ];
    }
    
    /**
     * Make a non-streaming request to the Google API
     *
     * @param array $payload
     * @return mixed
     */
    public function makeNonStreamingRequest(array $payload)
    {
        // Ensure stream is set to false
        $payload['stream'] = false;
        
        // Construct the URL with API key
        $url = $this->config['api_url'] . $payload['model'] . ':generateContent?key=' . $this->config['api_key'];
        
        // Extract just the necessary parts for Google's API
        $requestPayload = [
            'contents' => $payload['contents']
        ];
        
        // Add generation config if present
        if (isset($payload['generationConfig'])) {
            $requestPayload['generationConfig'] = $payload['generationConfig'];
        }
        
        // Initialize cURL
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        
        // Set common cURL options
        $this->setCommonCurlOptions($ch, $requestPayload, $this->getHttpHeaders());
        
        // Execute the request
        $response = curl_exec($ch);
        
        // Handle errors
        if (curl_errno($ch)) {
            $error = 'Error: ' . curl_error($ch);
            curl_close($ch);
            return response()->json(['error' => $error], 500);
        }
        
        curl_close($ch);
        
        return response($response)->header('Content-Type', 'application/json');
    }
    
    /**
     * Make a streaming request to the Google API
     *
     * @param array $payload
     * @param callable $streamCallback
     * @return void
     */
    public function makeStreamingRequest(array $payload, callable $streamCallback)
    {
        // Ensure stream is set to true
        $payload['stream'] = true;
        
        // Streaming endpoint for Google Gemini
        $url = $this->config['streaming_url'] . $payload['model'] . ':streamGenerateContent?key=' . $this->config['api_key'];
        
        // Extract necessary parts for Google's API
        $requestPayload = [
            'contents' => $payload['contents']
        ];
        
        // Add generation config if present
        if (isset($payload['generationConfig'])) {
            $requestPayload['generationConfig'] = $payload['generationConfig'];
        }
        
        set_time_limit(120);
        
        // Set headers for SSE
        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache');
        header('Connection: keep-alive');
        header('Access-Control-Allow-Origin: *');
        
        // Initialize cURL
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        
        // Set common cURL options
        $this->setCommonCurlOptions($ch, $requestPayload, $this->getHttpHeaders(true));
        
        // Set streaming-specific options
        $this->setStreamingCurlOptions($ch, $streamCallback);
        
        // Execute the cURL session
        curl_exec($ch);
        
        // Handle errors
        if (curl_errno($ch)) {
            $streamCallback('Error: ' . curl_error($ch));
            if (ob_get_length()) {
                ob_flush();
            }
            flush();
        }
        
        curl_close($ch);
        
        // Flush any remaining data
        if (ob_get_length()) {
            ob_flush();
        }
        flush();
    }
}