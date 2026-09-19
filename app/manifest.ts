import type { MetadataRoute } from "next";

/**
 * Lets the app be added to a home screen and open without browser chrome, so it
 * behaves like an app for players who use it every week.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sunday Football",
    short_name: "Sunday",
    description: "Sign up, get your team, play.",
    start_url: "/home",
    display: "standalone",
    orientation: "portrait",
    background_color: "#240029",
    theme_color: "#240029",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
