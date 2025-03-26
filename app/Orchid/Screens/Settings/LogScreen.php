<?php

namespace App\Orchid\Screens\Settings;

use Orchid\Screen\Screen;
use Orchid\Support\Facades\Layout;
use Orchid\Screen\Actions\Button;
use Orchid\Support\Facades\Toast;

class LogScreen extends Screen
{
    /**
     * Fetch data to be displayed on the screen.
     *
     * @return array
     */
    public function query(): iterable
    {
        // Log-Datei laden (Pfad ggf. anpassen, falls erforderlich)
        $log = file_exists(storage_path('logs/laravel.log'))
            ? file_get_contents(storage_path('logs/laravel.log'))
            : 'Log-Datei nicht gefunden.';
			
        return [
            'logs' => $log,
        ];
    }

    /**
     * The name of the screen displayed in the header.
     *
     * @return string|null
     */
    public function name(): ?string
    {
        return 'Laravel Log';
    }

    /**
     * The screen's action buttons.
     *
     * @return \Orchid\Screen\Action[]
     */
    public function commandBar(): iterable
    {
        return [
            Button::make('Clear Log')
                ->icon('trash')
                ->method('clearLog'),
        ];
    }

    /**
     * Clear the log file.
     */
    public function clearLog()
    {
        $logFile = storage_path('logs/laravel.log');
        if (file_exists($logFile)) {
            file_put_contents($logFile, '');
            Toast::success('Log cleared.');
        } else {
            Toast::error('Log file not found.');
        }
    }

    /**
     * The screen's layout elements.
     *
     * @return \Orchid\Screen\Layout[]|string[]
     */
    public function layout(): iterable
    {
        // Layout, das die Blade-View einbindet
        return [
            Layout::view('orchid.settings.log'),
        ];
    }
}
