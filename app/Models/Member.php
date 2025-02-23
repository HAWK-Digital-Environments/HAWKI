<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Member extends Model
{
    const ROLE_ADMIN = 'admin';
    const ROLE_EDITOR = 'editor';
    const ROLE_VIEWER = 'viewer';
    const ROLE_ASSISTANT = 'assistant';

    protected $fillable = [
        'room_id', 
        'user_id',
        'role',
        'last_read'
    ];

    // public function room()
    // {
    //     return $this->belongsTo(Room::class);
    // }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function hasRole($role)
    {
        return $this->role === $role;
    }

    public function updateRole($role){
        $this->update(['role', $role]);
    }

    public function updateLastRead(){
        $this->update(['last_read' => Carbon::now()]);
    }
}