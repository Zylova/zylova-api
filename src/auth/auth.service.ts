import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterDto, LoginDto } from "./dto/auth.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException("Email already registered");

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, name: dto.name, password: hashedPassword },
    });

    return { token: this.generateToken(user.id, user.email, user.role), user: this.sanitize(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException("Invalid credentials");

    return { token: this.generateToken(user.id, user.email, user.role), user: this.sanitize(user) };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.sanitize(user);
  }

  private generateToken(id: string, email: string, role: string) {
    return this.jwtService.sign({ sub: id, email, role });
  }

  private sanitize(user: { id: string; email: string; name: string; role: string; createdAt: Date }) {
    return { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt };
  }
}
