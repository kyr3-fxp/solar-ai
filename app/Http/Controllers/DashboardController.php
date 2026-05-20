<?php

namespace App\Http\Controllers;

use Illuminate\View\View;

class DashboardController extends Controller
{
    public function __invoke(): View
    {
        return view('dashboard', [
            // Same-origin: el frontend llama /api/... y Laravel hace proxy a Olympus.
            // Esto elimina CORS, redirects y dependencias del puerto del backend.
            'apiBase' => '',
        ]);
    }
}
