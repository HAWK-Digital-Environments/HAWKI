<?php

declare(strict_types=1);

namespace App\Orchid\Layouts\User;

use App\Models\User;
use Orchid\Screen\Field;
use Orchid\Screen\Fields\Password;
use Orchid\Screen\Layouts\Rows;

class UserPasswordLayout extends Rows
{
    /**
     * The screen's layout elements.
     *
     * @return Field[]
     */
    public function fields(): array
    {
        /** @var User $user */
        $user = $this->query->get('user');

        $exists = $user->exists;

        $placeholder = $exists
            ? __('Leave empty to keep current password')
            : __('Enter the password to be set');

        return [
            Password::make('user.password')
                ->placeholder($placeholder)
                ->title(__('Password'))
                ->required(! $exists),
        ];
    }
}
