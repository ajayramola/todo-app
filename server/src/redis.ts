// server/src/redis.ts
import Redis from 'ioredis';

// OPTION 1: Local Redis (Docker or WSL)
const redis = new Redis(); 

// OPTION 2: Cloud Redis (if using Upstash/URL)
// const redis = new Redis("redis://default:password@url:port");

redis.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redis.on('error', (err) => {
  console.error('❌ Redis Connection Error:', err);
});

export default redis;