<?php
declare(strict_types=1);


namespace App\Services\Ai\LaravelAi\Drivers\OpenAiExtended;


use App\Services\Ai\LaravelAi\Values\UrlMultiCitation;
use Generator;
use Illuminate\Support\Collection;
use Laravel\Ai\Gateway\OpenAi\OpenAiGateway;
use Laravel\Ai\Providers\Provider;
use Laravel\Ai\Streaming\Events\Citation;
use Laravel\Ai\Streaming\Events\ReasoningDelta;
use Laravel\Ai\Streaming\Events\ReasoningEnd;
use Laravel\Ai\Streaming\Events\ReasoningStart;
use Laravel\Ai\Streaming\Events\StreamEnd;
use Laravel\Ai\Streaming\Events\TextDelta;
use Laravel\Ai\Streaming\Events\TextEnd;

/**
 * Extends the Laravel AI OpenAI gateway to extract URL citations from the Responses
 * API streaming output and emit them as {@see Citation} stream events.
 *
 * The OpenAI Responses API can annotate message content blocks with `url_citation`
 * annotations. These arrive in the final SSE frame's `response.output` array rather
 * than incrementally, so this gateway records the last raw SSE data frame while
 * streaming and processes citations once a {@see StreamEnd} event is detected.
 *
 * OpenAI streams a reasoning item as several summary parts (typically
 * "**Title**\n\nBody") with no delimiter between them, and the parent gateway only
 * emits {@see ReasoningStart}/{@see ReasoningEnd} once per reasoning item. This gateway
 * watches the raw `response.reasoning_summary_part.done` frames and emits a paired
 * {@see ReasoningEnd}/{@see ReasoningStart} before the next {@see ReasoningDelta}, so
 * clients can separate the parts using the regular reasoning lifecycle events.
 *
 * Multiple annotation entries for the same URL are merged into one
 * {@see UrlMultiCitation} with accumulated ranges, so the client receives one
 * citation object per unique URL regardless of how many text spans reference it.
 */
class ExtendedOpenAiGateway extends OpenAiGateway
{
    /* =======================================================================
     * Override the text streaming to extract citations from the response.
     * ======================================================================= */

    /**
     * The last raw SSE data frame received during streaming.
     *
     * The Responses API places output metadata (including annotations) in the
     * last frame, so we shadow the parent's SSE iteration to capture it.
     */
    private array $lastData = [];

    /** OpenAI reported that the current reasoning summary part is complete. */
    private bool $reasoningPartBoundaryPending = false;

    /**
     * @inheritDoc
     *
     * Intercepts each parsed SSE data frame to keep {@see $lastData} current and to
     * flag completed reasoning summary parts for {@see processTextStream()}.
     */
    protected function parseServerSentEvents($streamBody): Generator
    {
        $this->reasoningPartBoundaryPending = false;
        foreach (parent::parseServerSentEvents($streamBody) as $data) {
            $this->lastData = $data;
            if (($data['type'] ?? '') === 'response.reasoning_summary_part.done') {
                $this->reasoningPartBoundaryPending = true;
            }
            yield $data;
        }
    }

    /**
     * @inheritDoc
     *
     * Converts OpenAI reasoning summary part boundaries to reasoning lifecycle
     * events and injects {@see Citation} events immediately before {@see StreamEnd}.
     */
    protected function processTextStream(string $invocationId, Provider $provider, string $model, $streamBody): Generator
    {
        $response = parent::processTextStream($invocationId, $provider, $model, $streamBody);
        $messageId = $this->generateEventId();
        $reasoningStarted = false;
        foreach ($response as $event) {
            if ($event instanceof TextDelta || $event instanceof TextEnd) {
                $messageId = $event->messageId;
            }

            if ($event instanceof ReasoningStart) {
                $reasoningStarted = true;
            }

            if ($event instanceof ReasoningDelta && $reasoningStarted && $this->reasoningPartBoundaryPending) {
                $this->reasoningPartBoundaryPending = false;
                yield (new ReasoningEnd(
                    $this->generateEventId(),
                    $event->reasoningId,
                    time(),
                ))->withInvocationId($invocationId);

                yield (new ReasoningStart(
                    $this->generateEventId(),
                    $event->reasoningId,
                    time(),
                ))->withInvocationId($invocationId);
            }

            if ($event instanceof ReasoningEnd) {
                $reasoningStarted = false;
                $this->reasoningPartBoundaryPending = false;
            }

            if ($event instanceof StreamEnd) {
                $citations = $this->extractCitations($this->lastData['response']['output'] ?? []);
                if ($citations->isNotEmpty()) {
                    foreach ($citations as $citation) {
                        yield new Citation(
                            $this->generateEventId(),
                            $messageId,
                            $citation,
                            time()
                        );
                    }
                }
            }

            yield $event;
        }

        return $response->getReturn();
    }

    /**
     * Extract URL citations from the `output` array of an OpenAI Responses API frame.
     *
     * Only `message`-type output items are inspected. Within each message, content
     * blocks are scanned for `url_citation` annotations. Multiple annotations for the
     * same URL are merged into one {@see UrlMultiCitation} with accumulated character
     * ranges so that clients receive one citation per unique source URL.
     *
     * @return Collection<int, UrlMultiCitation>
     */
    protected function extractCitations(array $output): Collection
    {
        /** @var Collection<string,UrlMultiCitation> $citations */
        $citations = new Collection;

        foreach ($output as $item) {
            if (($item['type'] ?? '') !== 'message') {
                continue;
            }

            foreach ($item['content'] ?? [] as $content) {
                foreach ($content['annotations'] ?? [] as $annotation) {
                    if (($annotation['type'] ?? '') === 'url_citation' && !empty($annotation['url'])) {
                        $citations->getOrPut(
                            $annotation['url'],
                            fn() => new UrlMultiCitation($annotation['url'], $annotation['title'] ?? null)
                        )->addRange(
                            isset($annotation['start_index']) ? (int)$annotation['start_index'] : null,
                            isset($annotation['end_index']) ? (int)$annotation['end_index'] : null
                        );
                    }
                }
            }
        }

        return $citations->values();
    }
}
