import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { ServicesService } from "./services.service";
import { CreateServiceDto, UpdateServiceDto } from "./dto/service.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

@ApiTags("services")
@Controller("services")
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({ summary: "Get all services" })
  findAll() {
    return this.servicesService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get service by ID" })
  findById(@Param("id") id: string) {
    return this.servicesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new service (admin)" })
  create(@Body() dto: CreateServiceDto) {
    return this.servicesService.create(dto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a service (admin)" })
  update(@Param("id") id: string, @Body() dto: UpdateServiceDto) {
    return this.servicesService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a service (admin)" })
  remove(@Param("id") id: string) {
    return this.servicesService.remove(id);
  }
}
