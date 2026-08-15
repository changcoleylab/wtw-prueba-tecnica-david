import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#ececec",
        ink: {
          950: "#0b1220",
          900: "#111827",
          800: "#1f2937"
        },
        accent: {
          400: "#5eead4",
          500: "#14b8a6",
          600: "#0d9488"
        }
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "Segoe UI", "sans-serif"]
      },
      boxShadow: {
        float: "0 8px 30px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
} satisfies Config;
