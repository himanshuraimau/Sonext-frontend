import { PrismaAdapter } from "@auth/prisma-adapter";
import type { DefaultSession, NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { signInSchema } from "~/schemas/auth";
import bycrpt from "bcryptjs";


import { db } from "~/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
	interface Session extends DefaultSession {
		user: {
			id: string;
			// ...other properties
			// role: UserRole;
		} & DefaultSession["user"];
	}

	// interface User {
	//   // ...other properties
	//   // role: UserRole;
	// }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
	providers: [
		Credentials({
			name: "credentials",
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" }
			},
			async authorize(credentials) {
				try {
					const { email, password } = await signInSchema.parseAsync(credentials);

					const user = db.user.findUnique({
						where: {
							email: email
						},
					})
					if (!user) {
						return null
					}

					const passwordMatch = await bycrpt.compare(password, user.password);

					if (!passwordMatch) {
						return null;
					}

					return {
						id: user.id,
						email: user.email,
						name: user.name,
						image: user.image
					}

				} catch (error) {
					return null;
				}
			}

		})
		/**
		 * ...add more providers here.
		 *
		 * Most other providers require a bit more work than the Discord provider. For example, the
		 * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
		 * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
		 *
		 * @see https://next-auth.js.org/providers/github
		 */
	],
	pages: {
		signIn: "/app/sign-in",

	},
	adapter: PrismaAdapter(db),
	callbacks: {
		session: ({ session, token }) => ({
			...session,
			user: {
				...session.user,
				id: token.sub,
			},
		}),
		jwt: ({ token, user }) => {
			if (user) {
				token.sub = user.id;
			}
			return token;

		}
	},
} satisfies NextAuthConfig;
