import { Controller, Post, Get, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { ContactService } from "./contact.service";
import { CreateContactSubmissionDto } from "./dto/contact.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

@ApiTags("contact")
@Controller("contact")
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @ApiOperation({ summary: "Submit a contact form" })
  submit(@Body() dto: CreateContactSubmissionDto) {
    return this.contactService.submit(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all contact submissions (admin)" })
  findAll() {
    return this.contactService.findAll();
  }
}
