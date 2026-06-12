import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor() {
    super({
      clientID: process.env.GITHUB_CLIENT_ID || 'disabled',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'disabled',
      callbackURL:
        process.env.GITHUB_CALLBACK_URL ||
        'http://localhost:4000/api/auth/github/callback',
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: any, user: any) => void,
  ) {
    const { username, emails, photos } = profile;
    const user = {
      email: emails?.[0]?.value || `${username}@github.local`,
      firstName: username || '',
      lastName: '',
      picture: photos?.[0]?.value || '',
      githubId: profile.id,
    };
    done(null, user);
  }
}
