import { randomBytes, scryptSync, timingSafeEqual, createHash } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "flexplan_session";
const SESSION_LENGTH_DAYS = 30;

const starterCategories = [
  { name: "Work", color: "#2a9d8f" },
  { name: "Personal", color: "#e76f51" },
  { name: "School", color: "#7f95d1" },
  { name: "Errands", color: "#f4a261" }
];

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, derived] = storedHash.split(":");

  if (!salt || !derived) {
    return false;
  }

  const attempted = scryptSync(password, salt, 64);
  const expected = Buffer.from(derived, "hex");

  if (attempted.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(attempted, expected);
}

async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function createUserWithSession(input: {
  name: string;
  email: string;
  password: string;
}) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await prisma.user.findFirst({
    where: {
      email: normalizedEmail
    }
  });

  if (existing) {
    return {
      error: "An account with that email already exists."
    } as const;
  }

  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash: hashPassword(input.password),
      timezone: "America/New_York",
      defaultWorkDays: [1, 2, 3, 4, 5],
      defaultWorkStartTime: "09:00",
      defaultWorkEndTime: "17:00",
      categories: {
        create: starterCategories
      }
    }
  });

  await createSessionForUser(user.id);

  return {
    user
  } as const;
}

export async function signInWithPassword(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      email: normalizedEmail
    }
  });

  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return {
      error: "That email and password combination did not match."
    } as const;
  }

  await createSessionForUser(user.id);

  return {
    user
  } as const;
}

export async function createSessionForUser(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_LENGTH_DAYS);

  await prisma.authSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt
    }
  });

  await setSessionCookie(token, expiresAt);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.authSession.findFirst({
    where: {
      tokenHash: hashToken(sessionToken),
      expiresAt: {
        gt: new Date()
      }
    },
    include: {
      user: true
    }
  });

  if (!session?.user) {
    return null;
  }

  return session.user;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function signOutCurrentSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    await prisma.authSession.deleteMany({
      where: {
        tokenHash: hashToken(sessionToken)
      }
    });
  }

  await clearSessionCookie();
}
