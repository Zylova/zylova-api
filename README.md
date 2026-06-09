# Zylova API

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NestJS](https://img.shields.io/badge/NestJS-11-red)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7-blue)](https://prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://postgresql.org/)

Enterprise backend for Zylova Digital Agency — a REST API built with NestJS, Prisma, and PostgreSQL.

## Tech Stack

- **Framework:** NestJS 11
- **ORM:** Prisma 7 with PostgreSQL adapter
- **Database:** PostgreSQL 16
- **Auth:** JWT with bcrypt password hashing
- **Email:** Nodemailer (Mailtrap for dev)
- **File Upload:** Multer with disk storage
- **Documentation:** Swagger/OpenAPI at `GET /api/docs`

## Quick Start

```bash
# Prerequisites: Node 22+, Docker, Docker Compose

# 1. Clone & install
git clone https://github.com/Zylova/zylova-api.git
cd zylova-api
npm install

# 2. Set environment variables (edit .env)
cp .env.example .env

# 3. Start PostgreSQL with Docker
docker compose up -d

# 4. Run migrations + seed
npx prisma migrate dev --name init
npx prisma db seed

# 5. Start dev server
npm run start:dev
```

## API Endpoints

| Module        | Method | Endpoint                    | Description              | Auth |
|---------------|--------|-----------------------------|--------------------------|------|
| **Auth**      | POST   | `/api/auth/register`        | Register new user        | ❌   |
|               | POST   | `/api/auth/login`           | Login                    | ❌   |
|               | GET    | `/api/auth/profile`         | Get user profile         | ✅   |
| **Products**  | GET    | `/api/products`             | List published products  | ❌   |
|               | GET    | `/api/products/:id`         | Get product by ID        | ❌   |
|               | POST   | `/api/products`             | Create product           | ✅   |
|               | PATCH  | `/api/products/:id`         | Update product           | ✅   |
|               | DELETE | `/api/products/:id`         | Delete product           | ✅   |
| **Services**  | GET    | `/api/services`             | List services            | ❌   |
|               | POST   | `/api/services`             | Create service           | ✅   |
|               | PATCH  | `/api/services/:id`         | Update service           | ✅   |
|               | DELETE | `/api/services/:id`         | Delete service           | ✅   |
| **Contact**   | POST   | `/api/contact`              | Submit contact form      | ❌   |
|               | GET    | `/api/contact`              | List submissions         | ✅   |
| **Newsletter**| POST   | `/api/newsletter/subscribe` | Subscribe to newsletter  | ❌   |
|               | POST   | `/api/newsletter/unsubscribe` | Unsubscribe            | ❌   |
| **Upload**    | POST   | `/api/upload`               | Upload file (image)      | ✅   |

> Full OpenAPI docs available at `http://localhost:4000/api/docs` when running in dev mode.

## Environment Variables

| Variable          | Description                  | Default                          |
|-------------------|------------------------------|----------------------------------|
| `DATABASE_URL`    | PostgreSQL connection string | `postgresql://...`               |
| `JWT_SECRET`      | JWT signing secret           | `super-secret-jwt-key-...`       |
| `JWT_EXPIRATION`  | Token expiry                 | `7d`                             |
| `PORT`            | Server port                  | `4000`                           |
| `CORS_ORIGIN`     | Allowed CORS origin          | `http://localhost:3000`          |
| `SMTP_HOST`       | SMTP server host             | `smtp.mailtrap.io`               |
| `SMTP_PORT`       | SMTP server port             | `2525`                           |
| `SMTP_USER`       | SMTP username                | —                                |
| `SMTP_PASS`       | SMTP password                | —                                |
| `CONTACT_EMAIL`   | Contact notification email   | `hello@zylova.com`               |
| `UPLOAD_DIR`      | File upload directory        | `./uploads`                      |

## Scripts

```bash
npm run start:dev       # Start dev server with watch mode
npm run build           # Compile to dist/
npm run lint            # ESLint
npm run typecheck       # TypeScript type check
npm test                # Run unit tests
npm run test:cov        # Unit tests with coverage
npm run test:e2e        # E2E tests (requires running app)
npm run prisma:migrate  # Run Prisma migrations
npm run prisma:seed     # Seed database
npm run docker:up       # Start Docker services
npm run docker:down     # Stop Docker services
```

## Deployment

### Docker (recommended)

```bash
# Build and run with Docker Compose
docker compose up -d --build
```

### Manual

```bash
npm run build
npm run start:prod
```

Ensure `NODE_ENV=production` and all environment variables are configured for production (PostgreSQL, SMTP credentials, strong JWT secret).

## Project Structure

```
src/
├── auth/          # Authentication (JWT, register, login)
├── common/        # Shared decorators, filters, guards, pipes
├── config/        # NestJS ConfigModule configuration
├── contact/       # Contact form submissions
├── newsletter/    # Email newsletter subscriptions
├── prisma/        # Prisma client service
├── products/      # Product CRUD
├── services/      # Service listings CRUD
├── upload/        # File upload handling
├── app.module.ts  # Root module
└── main.ts        # Entry point
```

## License

MIT — see [LICENSE](LICENSE).
