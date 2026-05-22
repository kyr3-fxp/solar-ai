using Olympus.Models;
using System.Collections.Concurrent;

namespace Olympus.Services
{
    public class RecommendationCacheService
    {
        private readonly ConcurrentDictionary<string, CacheEntry> _cache = new();
        private readonly TimeSpan _ttl = TimeSpan.FromMinutes(30);

        private class CacheEntry
        {
            public RecommendationResult Data { get; set; } = null!;
            public DateTime CreatedAt { get; set; }
        }

        /// <summary>
        /// Builds a cache key from the profile fields.
        /// </summary>
        public string BuildKey(string targetType, string name, string? companyType = null)
        {
            var normalized = $"{(targetType ?? "company").ToLower()}:{(companyType ?? "").ToLower()}:{(name ?? "").ToLower().Trim()}";
            return normalized;
        }

        /// <summary>
        /// Tries to get a cached recommendation. Returns null if not found or expired.
        /// </summary>
        public RecommendationResult? Get(string key)
        {
            if (_cache.TryGetValue(key, out var entry))
            {
                if (DateTime.UtcNow - entry.CreatedAt < _ttl)
                {
                    return entry.Data;
                }

                // Expired — remove it
                _cache.TryRemove(key, out _);
            }

            return null;
        }

        /// <summary>
        /// Stores a recommendation result in the cache.
        /// </summary>
        public void Set(string key, RecommendationResult data)
        {
            _cache[key] = new CacheEntry
            {
                Data = data,
                CreatedAt = DateTime.UtcNow
            };
        }

        /// <summary>
        /// Returns all cached keys (for diagnostics).
        /// </summary>
        public int Count => _cache.Count;
    }
}
