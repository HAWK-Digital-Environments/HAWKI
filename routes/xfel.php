<?php

use Illuminate\Support\Facades\Route;

Route::middleware('prevent_back')->group(function () {
   
    //disable groupchat
    Route::any('/groupchat', function () {abort(404);});
    Route::any('/groupchat/{slug?}', function () {abort(404);});
});


