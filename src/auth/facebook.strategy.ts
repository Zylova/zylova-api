import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile } from "passport-facebook";

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, "facebook") {
  constructor() {
    super({
      clientID: process.env.FACEBOOK_CLIENT_ID || "disabled",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "disabled",
      callbackURL: process.env.FACEBOOK_CALLBACK_URL || "http://localhost:4000/api/auth/facebook/callback",
      scope: ["email"],
      profileFields: ["id", "emails", "name", "photos"],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile, done: (err: any, user: any) => void) {
    const { name, emails, photos } = profile;
    const user = {
      email: emails?.[0]?.value,
      firstName: name?.givenName,
      lastName: name?.familyName,
      picture: photos?.[0]?.value,
      facebookId: profile.id,
    };
    done(null, user);
  }
}
