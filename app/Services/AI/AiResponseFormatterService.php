<?php

namespace App\Services\AI;
use Illuminate\Support\Facades\Log;

use App\Services\AI\ModelUtilityService;


class AiResponseFormatterService
{
    public function __construct(ModelUtilityService $utilities){
        $this->utilities = $utilities;
    }

    public function formatDefaultChunk($chunk){

        $jsonChunk = json_decode($chunk, true);
        $usage = NULL;
        $isDone = false;
        // Check for the finish_reason flag
        if (isset($jsonChunk['choices'][0]['finish_reason']) && $jsonChunk['choices'][0]['finish_reason'] === 'stop') {
            $isDone = true;
        }
        if(!empty($jsonChunk['usage'])){
            $usage = [
                'prompt_tokens' => $jsonChunk['usage']['prompt_tokens'],
                'completion_tokens' =>  $jsonChunk['usage']['completion_tokens'],
            ];
        }

        $chunk = '';
        if (isset($jsonChunk['choices'][0]['delta']['content'])) {
            $chunk =  $jsonChunk['choices'][0]['delta']['content'];
        }

        return [$chunk, $isDone, $usage];
    }

    public function formatDefaultResponse($response){
        $responseContent = $response->getContent();
        
        $jsonContent = json_decode($responseContent, true);
        
        // tested with OpenAI, GWDG and Open WebUI
        if (containsKey($jsonContent, 'content')){
            $content = getValueForKey($jsonContent, 'content');
        }

        $usage = NULL;
        if(!empty($jsonContent['usage'])){
            $usage = [
                'prompt_tokens' => $jsonContent['usage']['prompt_tokens'],
                'completion_tokens' =>  $jsonContent['usage']['completion_tokens'],
            ];
        }
        
        return [$content, $usage];
    }

    public function formatGoogleResponse($response){
        $responseContent = $response->getContent();
        $jsonContent = json_decode($responseContent, true);
        $content = $jsonContent['candidates'][0]['content']['parts'][0]['text'];
        
        $usage = NULL;
        if(!empty($jsonContent['usage'])){
            $usage = [
                'prompt_tokens' => $jsonContent['usageMetadata']['promptTokenCount'],
                'completion_tokens' =>  $jsonContent['usageMetadata']['candidatesTokenCount'],
            ];
        }
        return [$content, $usage];
    }

    public function formatOpenWebUiResponse($response){
        $responseContent = $response->getContent();
        $jsonContent = json_decode($responseContent, true);
        
        if (containsKey($jsonContent, 'content')){
            $content = getValueForKey($jsonContent, 'content');
        }
        
        $usage = NULL;
        if(!empty($jsonContent['usage']) && $jsonContent['usage'] !== Null){
            // 'prompt_token/s' and 'response_token/s' not yet implemented in db table
            $usage = [
                'prompt_eval_count' => $jsonContent['usageMetadata']['promptTokenCount'],
                'eval_count' =>  $jsonContent['usageMetadata']['candidatesTokenCount'],
                'prompt_token/s' =>  $jsonContent['usageMetadata']['prompt_token/s'],
                'response_token/s' =>  $jsonContent['usageMetadata']['response_token/s'],
            ];
        }
        Log::info($usage);

        return [$content, $usage];
    }

    public function containsKey($obj, $targetKey){
        if (!is_array($obj)) {
            return false;
        }
        if (array_key_exists($targetKey, $obj)) {
            return true;
        }
        foreach ($obj as $value) {
            if ($this->containsKey($value, $targetKey)) {
                return true;
            }
        }
        return false;
    }

    public function getValueForKey($obj, $targetKey){
        if (!is_array($obj)) {
            return null;
        }
        if (array_key_exists($targetKey, $obj)) {
            return $obj[$targetKey];
        }
        foreach ($obj as $value) {
            $result = $this->getValueForKey($value, $targetKey);
            if ($result !== null) {
                return $result;
            }
        }
        return null;
    }

}