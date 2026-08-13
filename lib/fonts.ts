import { Fraunces, Karla } from "next/font/google";

/**
 * Fraunces 600 only. The guide permits no other weight for headlines, and every
 * extra weight is payload on a phone in a room with bad wifi.
 */
export const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-display-loaded",
  display: "swap",
});

export const karla = Karla({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body-loaded",
  display: "swap",
});
