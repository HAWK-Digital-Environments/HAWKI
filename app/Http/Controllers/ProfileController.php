<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use App\Http\Controllers\ImageController;
use App\Models\PasskeyBackup;


class ProfileController extends Controller
{
 

    /// Update user information
    public function update(Request $request){

        $validatedData = $request->validate([
            'img' => 'string',
            'displayName' => 'string|max:20',
            'bio' => 'string|max:255',
        ]);
        $user = Auth::user();


        if(!empty($validatedData['img'])){
            $imageController = new ImageController();
            $response = $imageController->storeImage($validatedData['img'], 'profile_avatars');
            $response = $response->original;

            if ($response && $response['success']) {
                $user->update(['avatar_id' => $response['fileName']]);
            } else {
                return response()->json([
                    'success' => false,
                    'response' => 'Image upload failed: ' . $response['error'] ?? 'Unknown error'
                ]);
            }
        }

        if(!empty($validatedData['displayName'])){
            $user->update(['name' => $validatedData['displayName']]);
        }

        if(!empty($validatedData['bio'])){
            $user->update(['bio' => $validatedData['bio']]);
        }
        return response()->json([
            'success' => true,
            'response' => 'User information updated'
        ]);
    }



    public function backupPassKey(Request $request){        
        $validatedData = $request->validate([
            'username' => 'required|string',
            'cipherText' => 'required|string',
            'tag' => 'required|string',
            'iv' => 'required|string',
        ]);

        $userInfo = json_decode(Session::get('authenticatedUserInfo'), true);
        $username = $userInfo['username'];

        if($username != $validatedData['username']){
            return response()->json([
                'success' => false,
                'message' => 'Username comparision failed!',
            ]);
        }

        $backup = PasskeyBackup::updateOrCreate([
            'username' => $validatedData['username'],
            'ciphertext' => $validatedData['cipherText'],
            'iv' => $validatedData['iv'],
            'tag' => $validatedData['tag'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Backup Successfull!',
        ]);


    }

    public function requestPasskeyBackup(Request $request){      

        $user = Auth::user();
        $backup = PasskeyBackup::where('username', $user->username)->firstOrFail();

        $response = [
            'ciphertext' => $backup->ciphertext,
            'iv' => $backup->iv,
            'tag' => $backup->tag,
        ];

        return response()->json([
            'success' => true,
            'passkeyBackup' => $response,
        ]);
    }

}
