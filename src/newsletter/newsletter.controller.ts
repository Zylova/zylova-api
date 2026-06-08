import { Controller, Post, Delete, Get, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { NewsletterService, SubscribeDto } from "./newsletter.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

@ApiTags("newsletter")
@Controller("newsletter")
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post("subscribe")
  @ApiOperation({ summary: "Subscribe to newsletter" })
  subscribe(@Body() dto: SubscribeDto) {
    return this.newsletterService.subscribe(dto.email);
  }

  @Delete("unsubscribe/:email")
  @ApiOperation({ summary: "Unsubscribe from newsletter" })
  unsubscribe(@Param("email") email: string) {
    return this.newsletterService.unsubscribe(email);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all subscribers (admin)" })
  findAll() {
    return this.newsletterService.findAll();
  }

  @Get("count")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get subscriber count (admin)" })
  count() {
    return this.newsletterService.count();
  }
}
