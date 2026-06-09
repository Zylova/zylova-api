import { Controller, Get, Inject } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { PrismaService } from "./prisma/prisma.service";

@SkipThrottle()
@Controller()
export class AppController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get("health")
  health(): { status: string } {
    return { status: "ok" };
  }

  @Get("db-check")
  async dbCheck(): Promise<Record<string, unknown>> {
    try {
      await this.prisma.$queryRawUnsafe("SELECT 1 AS ok");
      const tables = await this.prisma.$queryRawUnsafe(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
      );
      return { connected: true, tables };
    } catch (error: unknown) {
      const err = error as Error;
      return { connected: false, error: err.message, stack: err.stack?.split("\n").slice(0, 5).join("\n") };
    }
  }
}
