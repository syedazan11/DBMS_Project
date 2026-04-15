import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "pennywise_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const getSecret = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
};

export const toClientUser = (user) => ({
  id: user.id,
  fullName: user.name,
  imageUrl:
    user.imageUrl ||
    "https://api.dicebear.com/9.x/initials/svg?seed=" +
      encodeURIComponent(user.name),
  primaryEmailAddress: {
    emailAddress: user.email,
  },
});

export const createSessionToken = async (user) => {
  return await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    imageUrl: user.imageUrl || null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
};

export const verifySessionToken = async (token) => {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload;
  } catch {
    return null;
  }
};

export const setSessionCookie = (response, token) => {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
};

export const clearSessionCookie = (response) => {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
};
