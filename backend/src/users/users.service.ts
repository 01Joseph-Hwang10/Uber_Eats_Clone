import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// import * as jwt from 'jsonwebtoken';
import { Users } from './entities/user.entity';
import { CreateAccountInput } from './dtos/create-account.dto';
import { LoginInput } from './dtos/login.dto';
// import { ConfigService } from '@nestjs/config';
import { JwtService } from '@jwt/jwt.service';
import { EditProfileInput, EditProfileOutput } from './dtos/edit-profile.dto';
import { Verification } from './entities/verification.entity';
import { UserProfileInput, UserProfileOutput } from './dtos/user-profile.dto';
import { VerifyEmailOutput, VerifyEmailInput } from './dtos/verify-email.dto';
import { MailService } from '@mail/mail.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users) private readonly users: Repository<Users>,
    @InjectRepository(Verification)
    private readonly verification: Repository<Verification>,
    // private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async createAccount({
    email,
    password,
    role,
  }: CreateAccountInput): Promise<{ ok: boolean; error?: string }> {
    try {
      const exists = await this.users.findOne({ email });
      if (exists) {
        // make error
        return { ok: false, error: 'There is a user with that email already' };
      }
      const user = await this.users.save(
        this.users.create({ email, password, role }),
      );
      const verification = await this.verification.save(
        this.verification.create({
          user,
        }),
      );
      this.mailService.sendVerificationEmail(user.email, verification.code);
      return { ok: true };
    } catch (error) {
      // console.error(error);
      // make error
      return { ok: false, error: 'Could not create account' };
    }
    // check new user
    // create user & hash the password
    // ok
  }

  async login({
    email,
    password,
  }: LoginInput): Promise<{ ok: boolean; error?: string; token?: string }> {
    // find the user with the email
    // check if the password is correct
    // make a JWT and give it to the user
    try {
      const user = await this.users.findOne(
        { email },
        { select: ['password', 'id'] },
      );
      if (!user) {
        return { ok: false, error: 'User not found' };
      }
      const passwordCorrect = await user.checkPassword(password);
      if (!passwordCorrect) {
        return { ok: false, error: 'Wrong password' };
      }
      const token = this.jwtService.sign(user.id);
      return { ok: true, token };
    } catch (error) {
      return { ok: false, error };
    }
  }

  async findById({ userId }: UserProfileInput): Promise<UserProfileOutput> {
    try {
      const user = await this.users.findOneOrFail(userId);
      return { ok: true, user };
    } catch (error) {
      return { ok: false, error: 'User Not Found' };
    }
  }

  async editProfile(
    userId: number,
    { email, password }: EditProfileInput,
  ): Promise<EditProfileOutput> {
    // Don't Spread in update
    try {
      const user = await this.users.findOne(userId);
      if (email) {
        user.email = email;
        user.verified = false;
        await this.verification.delete({ user: { id: user.id } });
        const verification = await this.verification.save(
          this.verification.create({ user }),
        );
        this.mailService.sendVerificationEmail(user.email, verification.code);
      }
      if (password) user.password = password;
      this.users.save(user);
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  }

  async verifyEmail({ code }: VerifyEmailInput): Promise<VerifyEmailOutput> {
    try {
      const verification = await this.verification.findOne(
        { code },
        // { loadRelationIds: true }, // Brings id
        { relations: ['user'] }, // Brings everything
      );
      if (verification) {
        verification.user.verified = true;
        await this.users.save(verification.user);
        await this.verification.delete(verification.id);
        return { ok: true };
      }
      return { ok: false, error: 'Verification not found' };
    } catch (error) {
      // console.error(error);
      return { ok: false, error: 'Could not verify email' };
    }
  }
}
