<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('dashboard', [
        'apiBase' => env('SOLAR_API_BASE', 'http://localhost:5016'),
    ]);
});
