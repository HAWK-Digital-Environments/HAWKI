<?php

declare(strict_types=1);

namespace App\Orchid;

use Orchid\Platform\Dashboard;
use Orchid\Platform\ItemPermission;
use Orchid\Platform\OrchidServiceProvider;
use Orchid\Screen\Actions\Menu;
use Orchid\Support\Color;

class PlatformProvider extends OrchidServiceProvider
{
    /**
     * Bootstrap the application services.
     *
     * @param Dashboard $dashboard
     *
     * @return void
     */
    public function boot(Dashboard $dashboard): void
    {
        parent::boot($dashboard);

        // ...
    }

    /**
     * Register the application menu.
     *
     * @return Menu[]
     */
    public function menu(): array
    {
        return [
            Menu::make('Get Started')
                ->icon('bs.book')
                ->title('Navigation')
                ->route(config('platform.index')),
            
            Menu::make('Dashboard')
                ->icon('bs.rocket-takeoff')
                ->route('platform.dashboard')
                ->list([
                    Menu::make('Users')
                        ->route('platform.dashboard.users')
                        ->icon('bs.people'),
                    Menu::make('Requests')
                        ->route('platform.dashboard.requests')
                        ->icon('bs.bar-chart'),
                    ]),

            Menu::make('Settings')
                ->icon('bs.gear')
                ->list([
                    Menu::make('System')
                        ->route('platform.settings.system')
                        ->icon('bs.house-gear'),
                    Menu::make('Logs')
                        ->route('platform.settings.log')
                        ->icon('bs.journal-code'),    
                    Menu::make('Storage')
                        ->route('platform.settings.storage')
                        ->icon('bs.database'),     
                    Menu::make('Styling')
                        ->route('platform.settings.styling')
                        ->icon('bs.paint-bucket'),       
                    Menu::make('Texts')
                        ->route('platform.settings.texts')
                        ->icon('bs.info-circle'),    
                    ]),    
            
            Menu::make('Models')
                ->icon('bs.stars')
                ->list([        
                    Menu::make('API Providers')
                        ->route('platform.modelsettings.providers')
                        ->icon('bs.plug'),
                    Menu::make('Active Models')
                        ->route('platform.modelsettings.activemodels')
                        ->icon('bs.toggles'),
                    Menu::make('Utility Models')
                        ->route('platform.modelsettings.utilitymodels')
                        ->icon('bs.tools'),                  
                    ]),          
//            Menu::make('Sample Screen')
//                ->icon('bs.collection')
//                ->route('platform.example'),
                //->badge(fn () => 6),

           Menu::make('Form Elements')
               ->icon('bs.card-list')
               ->route('platform.example.fields')
               ->active('*/examples/form/*'),

//            Menu::make('Overview Layouts')
//                ->icon('bs.window-sidebar')
//                ->route('platform.example.layouts'),

//           Menu::make('Grid System')
//               ->icon('bs.columns-gap')
//               ->route('platform.example.grid'),

//            Menu::make('Charts')
//                ->icon('bs.bar-chart')
//                ->route('platform.example.charts'),

//            Menu::make('Cards')
//                ->icon('bs.card-text')
//                ->route('platform.example.cards')
//                ->divider(),

            Menu::make(__('Users'))
                ->icon('bs.people')
                ->route('platform.systems.users')
                ->permission('platform.systems.users')
                ->title(__('Access Controls')),

            Menu::make(__('Roles'))
                ->icon('bs.shield')
                ->route('platform.systems.roles')
                ->permission('platform.systems.roles')
                ->divider(),

            Menu::make('Documentation')
                ->title('Docs')
                ->icon('bs.box-arrow-up-right')
                ->url('https://orchid.software/en/docs')
                ->target('_blank'),

            Menu::make('Changelog')
                ->icon('bs.box-arrow-up-right')
                ->url('https://github.com/orchidsoftware/platform/blob/master/CHANGELOG.md')
                ->target('_blank')
                ->badge(fn () => Dashboard::version(), Color::DARK),
        ];
    }

    /**
     * Register permissions for the application.
     *
     * @return ItemPermission[]
     */
    public function permissions(): array
    {
        return [
            ItemPermission::group(__('System'))
                ->addPermission('platform.systems.roles', __('Roles'))
                ->addPermission('platform.systems.users', __('Users')),
        ];
    }
}
