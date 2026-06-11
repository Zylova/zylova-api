# Zylova Project — Tổng Quan Toàn Bộ Dự Án

## 1. Tổng Quan

Zylova là nền tảng thương mại điện tử bán source code (template, boilerplate) cho lập trình viên.
Cho phép bán cả **số lượng không giới hạn** (non-exclusive) và **bán độc quyền 1 lần** (exclusive).

- **Frontend:** Next.js 16 + React 19 + Tailwind v4 — `zylova-landing.vercel.app`
- **Backend:** NestJS + Prisma 7 + PostgreSQL (Neon) — `zylova-api.onrender.com`
- **GitHub:** `Zylova/zylova-landing` (private) + `Zylova/zylova-api` (private)

---

## 2. Tech Stack

### Frontend (`C:\code\Tenny`)
| Công nghệ | Version |
|-----------|---------|
| Next.js | 16 |
| React | 19 |
| Tailwind CSS | v4 |
| TypeScript | Strict mode |
| next-intl | v4 (i18n: en / vi) |
| Framer Motion | Animation |
| Socket.IO Client | WebSocket real-time |
| Lucide React | Icons |
| Vitest + Testing Library | Unit tests |

### Backend (`C:\code\zylova-api`)
| Công nghệ | Version |
|-----------|---------|
| NestJS | 11 |
| Prisma | 7 (adapter: @prisma/adapter-pg) |
| PostgreSQL | Neon (serverless, ap-southeast-1) |
| Socket.IO | WebSocket (4.8.3) |
| Passport (JWT, Google, Facebook) | Auth |
| Nodemailer | Email |
| class-validator | DTO validation |
| bcrypt | Password hashing |
| Swagger | API docs |
| Throttler | Rate limiting |

### Deploy
- **Frontend:** Vercel (auto-deploy từ branch `main`)
- **Backend:** Render (Docker runtime, auto-deploy từ branch `main`)
- **Database:** Neon (PostgreSQL serverless, Singapore)

---

## 3. Kiến Trúc

```
Frontend (Next.js)          Backend (NestJS)           Database (Neon)
    │                            │                        │
    ├─ BFF Proxy (/api/*) ───────┤                        │
    ├─ Socket.IO Client ──────── Socket Gateway            │
    │                            ├─ Auth Module            │
    │                            ├─ Products Module       ├─ users
    │                            ├─ Orders Module         ├─ products
    │                            ├─ Admin Module          ├─ orders
    │                            ├─ Chat Module           ├─ chat_messages
    │                            ├─ Download Module       ├─ product_files
    │                            ├─ Email Module          ├─ download_logs
    │                            ├─ Events Module         ├─ services
    │                            └─ Contact Module        ├─ contact_submissions
    │                                                     └─ newsletter_subscribers
```

---

## 4. Database (8 tables)

| Table | Purpose |
|-------|---------|
| `users` | Tài khoản (admin + user), support Google/Facebook login, reset password, banned |
| `products` | Sản phẩm source code, có status (draft/pending/approved/rejected), exclusive/sold flag |
| `services` | Dịch vụ (Web Dev, Mobile, Security, Global) |
| `orders` | Đơn hàng, có downloadToken, items (JSON), trạng thái (paid/delivered/completed/refunded) |
| `chat_messages` | Live chat giữa user và admin |
| `product_files` | File .zip của sản phẩm (lưu trên server, không trong git) |
| `download_logs` | Lịch sử download, license key duy nhất |
| `contact_submissions` | Form liên hệ |
| `newsletter_subscribers` | Email đăng ký nhận tin |

---

## 5. API Endpoints (Backend)

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/db-check` | Kiểm tra kết nối DB |
| GET | `/api/products` | Danh sách sản phẩm (chỉ approved, không bao gồm exclusive+sold) |
| GET | `/api/products/:id` | Chi tiết sản phẩm |
| GET | `/api/services` | Danh sách dịch vụ |
| POST | `/api/contact` | Gửi liên hệ |
| POST | `/api/newsletter` | Đăng ký nhận tin |

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Đăng ký |
| POST | `/api/auth/login` | Đăng nhập → JWT |
| POST | `/api/auth/forgot-password` | Quên mật khẩu (gửi email) |
| POST | `/api/auth/reset-password` | Reset mật khẩu (token) |
| GET | `/api/auth/google` | Google OAuth |
| GET | `/api/auth/facebook` | Facebook OAuth |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders` | Tạo đơn hàng (tự động set exclusive+sold nếu cần) |
| GET | `/api/orders/token/:token` | Tra cứu đơn hàng theo download token |
| GET | `/api/orders/email/:email` | Lịch sử đơn hàng theo email |

### Download (rate limited: 5/min)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/download/info/:token` | Thông tin download |
| GET | `/api/download/file/:token/:productId` | Tải file (1 lần duy nhất) + sinh license key |
| GET | `/api/download/file-info/:productId` | Thông tin file (admin) |

### Admin (JWT + role ADMIN required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | Danh sách users |
| PATCH | `/api/admin/users/:id` | Cập nhật user (role, banned) |
| GET | `/api/admin/contacts` | Danh sách liên hệ |
| PATCH | `/api/admin/contacts/:id` | Cập nhật trạng thái liên hệ |
| GET | `/api/admin/orders` | Danh sách đơn hàng |
| PATCH | `/api/admin/orders/:id` | Cập nhật trạng thái đơn hàng |
| PATCH | `/api/admin/products/:id` | Cập nhật sản phẩm (status, exclusive) |
| POST | `/api/admin/products/:id/file` | Upload file .zip sản phẩm |
| DELETE | `/api/admin/products/:id/file` | Xóa file sản phẩm |
| GET | `/api/admin/products/:id/file` | Lấy thông tin file |
| GET | `/api/admin/stats` | Thống kê dashboard |
| GET | `/api/admin/newsletter` | Danh sách subscribers |
| POST | `/api/admin/reset-users` | Reset toàn bộ users (seed lại admin) |

### WebSocket (Socket.IO)
| Namespace | Events |
|-----------|--------|
| `/admin-room` | `stats-updated`, `new-order`, `new-contact`, `new-chat-message` |
| `/order-tracking` | `order-updated` (theo room = order.id) |
| `/chat` | `chat-message` (theo room = sessionId) |

---

## 6. Frontend Routes

| Route | Description |
|-------|-------------|
| `/` | Homepage (hero, services, shop section, contact) |
| `/shop` | Catalog sản phẩm (có filter, search, sort) |
| `/shop/:id` | Chi tiết sản phẩm |
| `/services` | Dịch vụ |
| `/about` | Giới thiệu |
| `/contact` | Liên hệ |
| `/cart` | Giỏ hàng |
| `/checkout` | Thanh toán |
| `/login` | Đăng nhập |
| `/register` | Đăng ký |
| `/forgot-password` | Quên mật khẩu |
| `/reset-password` | Đặt lại mật khẩu |
| `/dashboard` | Dashboard người dùng (orders, download) |
| `/download/:token` | Trang download sản phẩm đã mua |
| `/admin` | Admin dashboard (thống kê real-time) |
| `/admin/products` | Quản lý sản phẩm (CRUD + upload file + exclusive toggle) |
| `/admin/products/new` | Thêm sản phẩm mới |
| `/admin/products/:id/edit` | Sửa sản phẩm |
| `/admin/orders` | Quản lý đơn hàng |
| `/admin/chat` | Live chat với khách hàng |
| `/privacy` | Chính sách bảo mật |
| `/terms` | Điều khoản |
| `/license` | Giấy phép |

---

## 7. Tính Năng Chính

### 7.1. Bán Source Code
- Sản phẩm có các trạng thái: `draft` → `pending` → `approved` / `rejected`
- Admin duyệt sản phẩm trước khi public
- Public API chỉ trả về sản phẩm `approved`

### 7.2. Exclusive Sale (Bán Độc Quyền)
- Admin bật `exclusive` cho sản phẩm
- Khi có người mua, sản phẩm tự động set `sold = true`
- Sản phẩm exclusive + sold:
  - **Ẩn khỏi catalog** (API `findAll()` tự filter)
  - Không thể mua lần 2 (API trả lỗi)
  - Admin vẫn thấy trong dashboard
  - Nếu truy cập trực tiếp URL: hiển thị "SOLD OUT"

### 7.3. Secure Download
- Mỗi đơn hàng có `downloadToken` duy nhất (UUID)
- Download được rate limit: tối đa 5 lần/phút
- **One-time download:** mỗi sản phẩm chỉ tải được 1 lần
- Tự động sinh **license key** duy nhất (dạng `ZYL-XXXX-XXXX-XX`)
- License key lưu trong DB, trả về qua header `X-License-Key`
- File .zip sản phẩm lưu trên server (`/app/products/`), **không trong git repo**

### 7.4. Real-time (Socket.IO)
- Admin dashboard: thống kê cập nhật real-time
- Admin orders: trạng thái đơn hàng thay đổi real-time
- User dashboard: đơn hàng cập nhật real-time
- Live chat giữa user và admin

### 7.5. Auth
- JWT-based authentication
- Đăng nhập bằng email/password, Google, Facebook
- Forgot/reset password (gửi email thật)
- Role-based access (USER / ADMIN)

### 7.6. Email
- Gửi email forgot-password
- Gửi email thông báo (configurable: Mailtrap cho dev, SMTP thật cho production)

### 7.7. Admin
- Dashboard: tổng users, orders, sản phẩm, doanh thu
- Products: CRUD + duyệt/từ chối + upload file + exclusive toggle
- Orders: cập nhật trạng thái (pending→paid→delivered→completed/refunded)
- Chat: live chat với khách
- Users: quản lý user, ban/unban
- Contacts: xem và xử lý liên hệ

---

## 8. Bảo Mật

- ✅ Repo GitHub **private** (cả frontend và backend)
- ✅ File sản phẩm (.zip) **lưu trên server** — không trong git
- ✅ Download qua **token xác thực** — không có direct link
- ✅ **One-time download** — mỗi sản phẩm chỉ tải 1 lần
- ✅ **Rate limit** — 5 request/phút cho download
- ✅ **License key** — mỗi lần tải sinh key duy nhất
- ✅ JWT cho tất cả API admin
- ✅ Role guard (ADMIN required cho admin endpoints)
- ✅ Password hash bằng bcrypt (10 rounds)
- ✅ .env không nằm trong git
- ✅ Throttler module (100 request/phút global)

---

## 9. Tài Khoản Admin

| Email | Password | Role |
|-------|----------|------|
| `ttuan0147@gmail.com` | `admin123` | ADMIN |
| `dotruongphat9@gmail.com` | `admin123` | ADMIN |

---

## 10. Deployment

### Backend (Render — Docker)
- Repo: `Zylova/zylova-api` (branch `main`)
- URL: `https://zylova-api.onrender.com`
- Runtime: Docker (Node 22-alpine)
- Auto-deploy khi push lên `main`
- `prestart.js`: chạy `prisma migrate deploy` + `node seed.js` trước khi start

### Frontend (Vercel)
- Repo: `Zylova/zylova-landing` (branch `main`)
- URL: `https://zylova-landing.vercel.app`
- Auto-deploy khi push lên `main`
- Build: `next build`, output standalone

### Database (Neon)
- PostgreSQL serverless, region `ap-southeast-1` (Singapore)
- Connection pooling enabled

---

## 11. Hướng Dẫn Sử Dụng

### Thêm sản phẩm mới:
1. Vào `/admin/products/new` → điền thông tin → submit
2. Vào `/admin/products` → Approve sản phẩm
3. Click icon File → Upload file .zip

### Bật Exclusive Sale:
1. Vào `/admin/products` → click icon Gem (kim cương) để bật exclusive
2. Khi có khách mua, sản phẩm tự động ẩn + SOLD OUT

### Khách mua sản phẩm:
1. Vào catalog → thêm vào giỏ → checkout
2. Nhận download token → vào `/download/:token`
3. Tải file → nhận license key
4. Chỉ tải được 1 lần

---

## 12. Phát Triển Local

### Backend
```bash
cd C:\code\zylova-api
npm run start:dev    # Phát triển
npm run build        # Build
npm test             # Chạy test
npm run lint         # Kiểm tra lint
```

### Frontend
```bash
cd C:\code\Tenny
npm run dev          # Phát triển
npx tsc --noEmit     # Kiểm tra TypeScript
npm run test         # Chạy test
npm run lint         # Kiểm tra lint
```

---

## 13. State hiện tại (11/06/2026)

- ✅ Backend build: 0 lỗi
- ✅ Frontend tsc: 0 lỗi
- ✅ ESLint: 0 errors
- ✅ Unit tests: 23 backend + 36 frontend = 59 tests (all passing)
- ✅ WebSocket real-time: chat, notifications, order tracking
- ✅ Exclusive sale system
- ✅ Secure download with license key
- ✅ Backend + Frontend deployed và auto-deploy
- ✅ Cả 2 repo private

---

*Cập nhật lần cuối: 11/06/2026*
