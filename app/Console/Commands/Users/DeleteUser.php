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
        if (!env('USER_DELETE_CONSOLE')){
            $this->error('Not allowed to delete user in app config');
            return;
        }
        $username = $this->input->getArgument('username');
        $result = $this->doIt($username);
        if ($result['error']) {
            $this->error($result['error']);
        }
        if ($result['success']) {
            $this->error($result['success']);
        }
    }
    
    
    public function doIt($username)
    {
        $validator = Validator::make(['username' => $username], [
            'username' => 'required|string|max:32|alpha_dash'
        ]);
        if ($validator->fails()) {
            return ['error' => 'Bad username'];
        }
        
        $user = User::where('username', $username)->first();
        //first user is "AI"
        if(!$user || $user->id == 1){
            return ['error' => 'No such user'];
        }
        
        DB::beginTransaction();
        $user->delete();
        PasskeyBackup::where('username', $username)->delete();
        DB::commit();
        
        return ['success' => 'Done'];
    }
}
