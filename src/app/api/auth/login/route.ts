import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { verifyPassword, signAuthToken } from '@/lib/auth';
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid email or password format' },
        { status: 400 }
      );
    }

    try {
      await connectToDatabase();
    } catch (dbErr: any) {
      return NextResponse.json(
        {
          error: 'Database connection failed. Please ensure MongoDB is running and MONGODB_URI is correctly configured in .env.local',
          dbError: dbErr.message,
        },
        { status: 503 }
      );
    }

    const { email, password } = parsed.data;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Invalid credentials or inactive account' },
        { status: 401 }
      );
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = signAuthToken({
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set('lab_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error during login' },
      { status: 500 }
    );
  }
}
