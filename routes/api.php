<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ApiProxyController;

Route::prefix('solar')->group(function () {
    Route::get('/today',       [ApiProxyController::class, 'today']);
    Route::get('/forecast',    [ApiProxyController::class, 'forecast']);
    Route::get('/history',     [ApiProxyController::class, 'history']);
    Route::get('/score',       [ApiProxyController::class, 'score']);
    Route::get('/companies',   [ApiProxyController::class, 'companies']);
    Route::get('/forecast/hourly', [ApiProxyController::class, 'historyHourly']);
});

Route::prefix('ai')->group(function () {
    Route::post('/recommendations',   [ApiProxyController::class, 'recommendations']);
    Route::post('/chat',              [ApiProxyController::class, 'chat']);
    Route::get('/recommendations/demo', [ApiProxyController::class, 'recommendationsDemo']);
});
