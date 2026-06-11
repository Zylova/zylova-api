import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { ServicesModule } from './services/services.module';
import { ContactModule } from './contact/contact.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { UploadModule } from './upload/upload.module';
import { OrdersModule } from './orders/orders.module';
import { AdminModule } from './admin/admin.module';
import { EventsModule } from './events/events.module';
import { ChatModule } from './chat/chat.module';
import { EmailModule } from './email/email.module';
import { DownloadModule } from './download/download.module';
import { ReviewsModule } from './reviews/reviews.module';
import { PaymentModule } from './payment/payment.module';
import { StorageModule } from './storage/storage.module';
import { AuditModule } from './audit/audit.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { CouponModule } from './coupon/coupon.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ConfigModule,
    PrismaModule,
    AuthModule,
    ProductsModule,
    ServicesModule,
    ContactModule,
    NewsletterModule,
    UploadModule,
    OrdersModule,
    AdminModule,
    EventsModule,
    ChatModule,
    EmailModule,
    DownloadModule,
    ReviewsModule,
    PaymentModule,
    StorageModule,
    AuditModule,
    WishlistModule,
    CouponModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
