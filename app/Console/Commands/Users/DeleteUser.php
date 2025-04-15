<?php

namespace App\Console\Commands\Users;

use App\Models\PasskeyBackup;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;


class DeleteUser extends Command
{
    protected $signature = 'user:delete 
        {username : username to be deleted}'
    ;
    protected $description = 'Command delete user record. To be used in case the user is deleted.';

    /**
     * This will DELETE the user records
     * and CASCADE DELETE conversations etc (with mysql built-in cascading).
     * The usage is kept but anonymized
     */
    public function handle()
    {
        $username = $this->input->getArgument('username');
        $validator = Validator::make(['username' => $username], [
            'username' => 'required|string|max:32|alpha_dash'
        ]);
        if ($validator->fails()) {
            $this->error('Bad username');
            return;
        }
        
        $user = User::where('username', $username)->first();
        //first user is "AI"
        if(!$user || $user->id == 1){
            $this->error('No such user');
            return;
        }
        
        DB::beginTransaction();
        $user->delete();
        PasskeyBackup::where('username', $username)->delete();
        DB::commit();
        
        $this->info('Done');

    }
}
