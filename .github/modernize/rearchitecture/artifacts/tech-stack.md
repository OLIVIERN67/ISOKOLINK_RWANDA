# Technology Stack

## Runtime and languages

- Backend: Node.js, CommonJS package mode, TypeScript `^5.7.3`.
- Frontend: browser SPA, ES module package mode, TypeScript `^5.7.3`.
- Database: MySQL via `mysql2`.
- No explicit Node.js engine constraint is declared in either package manifest.

## Backend frameworks and dependencies

- Express `^4.21.2`
- Zod `^3.24.1`
- MySQL2 `^3.12.0`
- bcryptjs `^2.4.3`
- cookie-parser `^1.4.7`
- cors `^2.8.5`
- dotenv `^16.4.7`
- express-rate-limit `^7.5.0`
- helmet `^8.0.0`
- multer `^2.0.1`
- nodemailer `^6.10.1`
- Development/test: tsx `^4.19.2`, Vitest `^2.1.8`, Supertest `^7.0.0`, Node/Express/Multer/Nodemailer type packages.

## Frontend frameworks and dependencies

- React `^18.3.1` and React DOM `^18.3.1`
- Vite `^6.0.7` with `@vitejs/plugin-react ^4.3.4`
- React Router DOM `^6.28.1`
- Axios `^1.7.9`
- React Hook Form `^7.54.2`
- Zod `^3.24.1` and `@hookform/resolvers ^3.10.0`
- Recharts `^2.15.0`
- lucide-react `^0.469.0`
- Tailwind CSS `^3.4.17`, PostCSS `^8.4.49`, Autoprefixer `^10.4.20`

## Configuration and runtime constraints

- Backend configuration is environment-driven and validated in `backend/src/config/env.ts`.
- Production requires a 32+ character session secret and forces secure cookies.
- Backend defaults to port 5000 and frontend defaults to port 5173.
- Uploads are stored in the configured upload directory and served by Express.
- Sessions are cookie-based, stored as hashed tokens in MySQL, and periodically cleaned by the server process.
- Frontend API base URL is configured through its environment example and uses credentialed Axios requests.
