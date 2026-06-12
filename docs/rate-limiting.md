# API Rate Limiting

## Global Limits

| Scope | Limit | Window |
|-------|-------|--------|
| All endpoints | 100 requests | 60 seconds |

## Per-Endpoint Limits

| Endpoint | Limit | Window | Notes |
|----------|-------|--------|-------|
| `POST /auth/login` | 10 requests | 60 seconds | Brute force protection |
| `POST /auth/register` | 5 requests | 60 seconds | Registration spam prevention |
| `POST /auth/forgot-password` | 3 requests | 60 seconds | Email spam prevention |
| `POST /auth/reset-password` | 5 requests | 60 seconds | Token brute force protection |
| `GET /download/file/:token/:productId` | 5 requests | 60 seconds | Per-token download throttling |
| `POST /coupon/validate` | 10 requests | 60 seconds | Coupon brute force protection |
| WebSocket events | 30 messages | 10 seconds | Per-connection rate limit |

## Response Headers

All rate-limited endpoints return the following headers:

```
X-RateLimit-Limit: <limit>
X-RateLimit-Remaining: <remaining>
X-RateLimit-Reset: <unix_timestamp>
```

## Error Response

When rate limit is exceeded, the API returns:

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "error": "Too Many Requests"
}
```

## WebSocket Rate Limiting

WebSocket connections are limited to 30 messages per 10 seconds.
When the limit is exceeded, the connection receives a `rate-limited` event and is disconnected.

## OTP (2FA) Lockout

- 5 failed OTP attempts → 30-minute lockout
- Lockout is tracked per user account
- Lockout resets after 30 minutes or upon successful login

## Best Practices for API Consumers

1. **Cache responses**: Use the `Cache-Control` headers where available
2. **Retry with backoff**: When receiving 429 responses, wait at least `X-RateLimit-Reset - current_time` seconds before retrying
3. **Use persistent connections**: Reuse HTTP connections to reduce overhead
4. **Batch requests**: Combine multiple operations into single requests where possible

## Configuration

Rate limits are configured through environment variables:

```
THROTTLE_TTL=60000          # Default: 60 seconds
THROTTLE_LIMIT=100          # Default: 100 requests per TTL
```

Or by modifying the `ThrottlerModule` configuration in `src/app.module.ts`.
