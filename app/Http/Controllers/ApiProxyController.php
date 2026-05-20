<?php

namespace App\Http\Controllers;

use Illuminate\Http\Client\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ApiProxyController extends Controller
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.solar_api.base_url', env('SOLAR_API_BASE_URL', 'http://localhost:5016')), '/');
    }

    private function proxy(Request $request, string $path, array $query = []): JsonResponse
    {
        $url = "{$this->baseUrl}{$path}";

        try {
            $http = $request->method() === 'GET'
                ? Http::timeout(30)->get($url, $query)
                : Http::timeout(60)->asJson()->post($url, $request->all());
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error'   => 'No se pudo conectar con la API Olympus',
                'detail'  => $e->getMessage(),
            ], 503);
        }

        return $this->jsonFromHttp($http);
    }

    private function proxyGet(string $path, array $query = []): JsonResponse
    {
        $url = "{$this->baseUrl}{$path}";

        try {
            $http = Http::timeout(30)->get($url, $query);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error'   => 'No se pudo conectar con la API Olympus',
                'detail'  => $e->getMessage(),
            ], 503);
        }

        return $this->jsonFromHttp($http);
    }

    private function jsonFromHttp(Response $response): JsonResponse
    {
        $status = $response->status();
        $body   = $response->json();

        $data = [
            'success' => $response->successful() && ($body['success'] ?? true),
            'data'    => $body['data']    ?? $body,
            'error'   => $body['error']   ?? null,
            'detail'  => $body['detail']  ?? null,
        ];

        if (! $response->successful() || ($body['success'] ?? true) === false) {
            return response()->json($data, $status);
        }

        return response()->json($data, $status);
    }

    public function today(Request $request): JsonResponse
    {
        return $this->proxy($request, '/api/solar/today');
    }

    public function forecast(Request $request): JsonResponse
    {
        return $this->proxy($request, '/api/solar/forecast', $request->query());
    }

    public function history(Request $request): JsonResponse
    {
        return $this->proxy($request, '/api/solar/history', $request->query());
    }

    public function score(): JsonResponse
    {
        return $this->proxyGet('/api/solar/score');
    }

    public function recommendations(Request $request): JsonResponse
    {
        return $this->proxy($request, '/api/ai/recommendations');
    }

    public function chat(Request $request): JsonResponse
    {
        return $this->proxy($request, '/api/ai/chat');
    }

    public function recommendationsDemo(): JsonResponse
    {
        return $this->proxyGet('/api/ai/recommendations/demo');
    }

    public function companies(): JsonResponse
    {
        return $this->proxyGet('/api/solar/companies');
    }

    public function historyHourly(Request $request): JsonResponse
    {
        return $this->proxy($request, '/api/solar/forecast/hourly', $request->query());
    }
}
