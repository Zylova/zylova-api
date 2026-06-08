import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { ConfigModule } from "./config/config.module";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { ProductsModule } from "./products/products.module";
import { ServicesModule } from "./services/services.module";
import { ContactModule } from "./contact/contact.module";
import { NewsletterModule } from "./newsletter/newsletter.module";
import { UploadModule } from "./upload/upload.module";

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
  ],
})
export class AppModule {}
