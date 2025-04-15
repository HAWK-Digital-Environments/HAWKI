<?php

namespace App\Http\Controllers\User;

use App\Console\Commands\Users\DeleteUser;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class UserController extends Controller
{
 
    public function delete(){
        if(!env('USER_DELETE_SELF')){
            abort(403,'User deletion not allowed');
        }
        
        if(app('request')->isMethod('post')){
            $username = Auth::user()->username;
            if(!$username || $username != request('username')){
                return back()->withErrors(["username" => "Bad username"])->withInput();
            }
            $result = (new DeleteUser())->doIt( $username);
            Log::info('UserController::delete: ' . $username . ' '  . json_encode((array)$result));
            return redirect('/');
        }
        
        return view('modules.user_delete');
    }
}
