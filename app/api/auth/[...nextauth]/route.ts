import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

// In-memory users for MVP - replace with DB later
const users = [
  {
    id: "1",
    name: "Wolf",
    email: "wolf@pacaiwolfstudio.com",
    // Password: wolf123 (bcrypt hashed)
    password: "$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu/1u",
    tier: "pro" as const,
  },
  {
    id: "2",
    name: "WolfTeam",
    email: "wolfteamstudio2@pacai.com",
    // Password: AdminTeam15 (bcrypt hashed)
    password: "$2a$10$dK7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu/1u",
    tier: "admin" as const,
  },
];

declare module "next-auth" {
  interface User {
    tier?: string;
  }
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      tier?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tier?: string;
  }
}

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = users.find((u) => u.email === credentials.email);
        if (!user) return null;

        const isValid = await compare(credentials.password as string, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.tier = (user as any).tier;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.tier = token.tier as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET,
});

export { handler as GET, handler as POST };
