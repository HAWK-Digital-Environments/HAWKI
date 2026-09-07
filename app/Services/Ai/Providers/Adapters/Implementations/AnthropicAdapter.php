<?php
declare(strict_types=1);


namespace App\Services\Ai\Providers\Adapters\Implementations;


use App\Models\Ai\AiProvider;
use App\Services\Ai\Agents\Adapters\AbstractTextGeneratingAgent;
use App\Services\Ai\Agents\Values\AgentRequestContext;
use App\Services\Ai\Providers\Adapters\AbstractProviderAdapter;
use App\Services\Ai\Providers\Adapters\DriverFactory;
use App\Services\Ai\Providers\Values\AiProviderProxy;
use Illuminate\Support\Collection;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Enums\Lab;
use Laravel\Ai\Gateway\Anthropic\Concerns\CreatesAnthropicClient;
use Laravel\Ai\Providers\Provider as Driver;


/**
 * Provider adapter for Anthropic (Claude models).
 *
 * Builds the Laravel AI Anthropic driver using the provider's stored API key and
 * fetches the available model list from the Anthropic REST API.
 *
 * @see https://platform.claude.com/docs/en/api/models/list Anthropic models API
 */
class AnthropicAdapter extends AbstractProviderAdapter
{
    use CreatesAnthropicClient;

    /**
     * Creates an Anthropic driver instance authenticated with the provider's API key.
     */
    public function createDriver(AiProvider $provider, DriverFactory $factory): Driver
    {
        return $factory->make(
            driverName: Lab::Anthropic,
            config: [
                'key' => $provider->api_key,
            ]
        );
    }

    /**
     * Enables Anthropic extended thinking for reasoning-capable text models.
     *
     * Thinking tokens count towards `max_tokens`, so the requested budget is limited to half
     * of the effective output limit and kept above Anthropic's 1,024-token minimum. Models
     * with limits too small for a valid budget keep thinking disabled. Anthropic rejects most
     * sampling values while thinking is enabled, so incompatible configured temperature and
     * top-p values are neutralised for this request instead of making it fail.
     *
     * @see https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking
     */
    public function getAdditionalDriverOptions(Agent $agent, AgentRequestContext $context): array
    {
        if (!$agent instanceof AbstractTextGeneratingAgent || !$context->model->flags->hasStrengthReasoning()) {
            return [];
        }

        $maxTokens = $agent->maxTokens() ?? 64_000;
        $budgetTokens = min(
            $context->modelParameters->getMaxThinkingTokens(),
            intdiv($maxTokens, 2),
        );
        $budgetTokens = max(1_024, $budgetTokens);

        if ($budgetTokens >= $maxTokens) {
            return [];
        }

        $options = [
            'thinking' => [
                'type' => 'enabled',
                'budget_tokens' => $budgetTokens,
            ],
        ];

        if ($agent->temperature() !== null) {
            $options['temperature'] = 1.0;
        }

        if ($agent->topP() !== null && $agent->topP() < 0.95) {
            $options['top_p'] = 1.0;
        }

        return $options;
    }

    /**
     * Fetches available Claude models from the Anthropic API.
     *
     * The response shape is `{ "data": [ { "id": "claude-...", … }, … ] }`.
     * Each entry is mapped to an unsaved {@see \App\Models\Ai\AiModel} instance.
     *
     * @return Collection<int, \App\Models\Ai\AiModel>
     *
     * @see https://platform.claude.com/docs/en/api/models/list
     */
    public function getModels(AiProviderProxy $provider): Collection
    {
        return $this->createModelListClient($this->client($provider->driver))
            ->get('/models')
            ->getMapped('data.*', function ($item) use ($provider) {
                return $this->createNewModelInfo(
                    modelId: data_get($item, 'id'),
                    provider: $provider,
                );
            });
    }
}
