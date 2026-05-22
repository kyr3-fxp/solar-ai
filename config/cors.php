<?php

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_hosts' => [],

    'allowed_origins' => ['http://localhost:8000', 'http://localhost:5173'],

    'allowed_origins_patterns' => [],

    'allowedHeaders' => ['X-Requested-With', 'Content-Type', 'Accept', 'Origin', 'Authorization', 'X-CSRF-TOKEN'],

    'exposedHeaders' => [],

    'maxAge' => 0,

    'supportsCredentials' => true,

];
