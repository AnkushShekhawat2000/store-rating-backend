# Store Rating API

A REST API for managing users, stores, and customer ratings. It is built with
Node.js, Express, PostgreSQL, and Prisma. The API supports three roles:
`ADMIN`, `USER`, and `STORE_OWNER`.

This repository contains the backend API only; it does not include a web
frontend.

## Contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Requirements](#requirements)
- [Setup](#setup)
- [Environment variables](#environment-variables)
- [Database schema](#database-schema)
- [Run the API](#run-the-api)
- [Authentication and roles](#authentication-and-roles)
- [API reference](#api-reference)
- [Validation rules](#validation-rules)
- [Error responses](#error-responses)
- [Tests and development tools](#tests-and-development-tools)
- [Security notes](#security-notes)

## Features

- Register and authenticate users with JSON Web Tokens (JWT).
- Manage users and stores as an administrator.
- Search and sort users and stores.
- Browse stores and see overall and personal ratings as a user.
- Create or update a rating from 1 to 5 for a store.
- View assigned stores, rating averages, and raters as a store owner.
- Seed an initial administrator account from environment variables.

## Technology stack

- Node.js and Express 4
- PostgreSQL
- Prisma ORM and Prisma Migrate
- JSON Web Tokens for stateless authentication
- bcrypt for password hashing
- Zod for request validation
- Node.js built-in test runner and Supertest

## Requirements

- Node.js 18.11 or newer
- npm
- PostgreSQL running locally or accessible through a connection URL

## Setup

The following commands use PowerShell and assume the terminal is open in the
project root.

### 1. Install dependencies

```powershell
npm install
```

### 2. Create the PostgreSQL database

Connect to PostgreSQL using an account with permission to create databases,
then create the database:

```sql
CREATE DATABASE store_rating_db;
```

If you already have a database, use its name in `DATABASE_URL` instead.

### 3. Create and configure `.env`

Create a `.env` file in the project root. The repository ignores this file so
local credentials and secrets are not committed. Add the variables described
in [Environment variables](#environment-variables), replacing all example
values with your own.

For example, in PowerShell:

```powershell
New-Item -ItemType File -Path .env
```

Open `.env` in your editor and add the required settings. Do not copy production
credentials into source control or share them in documentation.

### 4. Generate the Prisma client and apply migrations

```powershell
npx prisma generate
npm run db:migrate -- --name init
```

Prisma reads the database connection from `DATABASE_URL`. The migration
command applies the checked-in migrations and creates a development migration
for schema changes when necessary. If Prisma reports schema drift for a
database that already contains data, stop and review the migration plan before
accepting a reset or destructive change.

### 5. Seed the initial administrator

Set `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_ADDRESS`, and `ADMIN_PASSWORD` in
`.env`, then run:

```powershell
npm run db:seed
```

The seed script creates an `ADMIN` user if the email does not exist. If it
already exists, the script updates that account's name, address, and role; it
does not replace the existing password.

### 6. Start the API

For development with automatic restart:

```powershell
npm run dev
```

For a normal start:

```powershell
npm start
```

The default API base URL is `http://localhost:5000`. Confirm that the service
is running with:

```text
GET http://localhost:5000/api/health
```

Expected response:

```json
{
  "status": "OK"
}
```

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection URL used by Prisma. |
| `JWT_SECRET` | Yes | Secret used to sign and verify JWTs. The server requires at least 32 characters. |
| `PORT` | No | HTTP port. Defaults to `5000`; must be a valid TCP port. |
| `CORS_ORIGIN` | No | Allowed browser origin for CORS. Defaults to allowing any origin if unset. |
| `ADMIN_NAME` | Required for seeding | Name for the initial administrator. |
| `ADMIN_EMAIL` | Required for seeding | Email used to find or create the initial administrator. |
| `ADMIN_ADDRESS` | Required for seeding | Address for the initial administrator. |
| `ADMIN_PASSWORD` | Required for seeding | Initial administrator password, stored as a bcrypt hash. |

Example structure (use your own values; do not use these placeholders as
credentials):

```dotenv
DATABASE_URL="postgresql://<db_user>:<db_password>@localhost:5432/store_rating_db?schema=public"
JWT_SECRET="<generate-a-unique-secret-of-at-least-32-characters>"
PORT=5000
CORS_ORIGIN=http://localhost:5173

ADMIN_NAME="Initial System Administrator"
ADMIN_EMAIL="admin@example.com"
ADMIN_ADDRESS="System Administration Office"
ADMIN_PASSWORD="<choose-a-strong-unique-password>"
```

If the database username or password contains URL-reserved characters, URL
encode those characters in `DATABASE_URL`.

## Database schema

The Prisma schema is in [`prisma/schema.prisma`](./prisma/schema.prisma). It
defines three PostgreSQL tables and one role enum. Prisma model names are
mapped to lowercase table names, and selected fields are mapped to
snake_case column names.

### `users`

Stores account details and role information.

| Column | Type / rule | Description |
| --- | --- | --- |
| `id` | Integer, primary key, auto-increment | User identifier. |
| `name` | `VARCHAR(60)`, required | User's name; API input must be 20–60 characters. |
| `email` | `VARCHAR(255)`, required, unique | Login email address. |
| `password_hash` | String, required | bcrypt hash; the original password is not stored. |
| `address` | `VARCHAR(400)`, required | User's address. |
| `role` | `Role`, required, default `USER` | One of `ADMIN`, `USER`, or `STORE_OWNER`. |
| `created_at` | Timestamp, required, default current time | Account creation time. |

Relationships:

- A user can submit ratings for multiple stores.
- A user can own multiple stores in the Prisma schema.

### `stores`

Stores information about each store and the user assigned as its owner.

| Column | Type / rule | Description |
| --- | --- | --- |
| `id` | Integer, primary key, auto-increment | Store identifier. |
| `name` | `VARCHAR(100)`, required | Store name. |
| `email` | `VARCHAR(255)`, required | Store contact email. |
| `address` | `VARCHAR(400)`, required | Store address. |
| `created_at` | Timestamp, required, default current time | Store creation time. |
| `owner_id` | Integer, required, references `users.id` | Assigned store owner. |

The API checks that `owner_id` identifies an existing user whose role is
`STORE_OWNER` before creating a store. The schema indexes `owner_id`.

### `ratings`

Stores a user's rating for a store.

| Column | Type / rule | Description |
| --- | --- | --- |
| `id` | Integer, primary key, auto-increment | Rating identifier. |
| `score` | Integer, required | Rating value from 1 through 5, validated by the API. |
| `created_at` | Timestamp, required, default current time | Time the rating was first created. |
| `updated_at` | Timestamp, automatically updated | Time the rating was last changed. |
| `user_id` | Integer, required, references `users.id` | User who submitted the rating. |
| `store_id` | Integer, required, references `stores.id` | Store being rated. |

The pair `(user_id, store_id)` is unique, so a user has at most one rating per
store. Submitting another rating for the same store updates that rating rather
than creating a second row. `store_id` is indexed. Deleting a user or store
cascades to its ratings.

### Relationships at a glance

```text
users 1 ─────── * stores
  │                 │
  └──── * ratings * ┘
```

- Each store has one assigned owner (`stores.owner_id` → `users.id`).
- Each rating belongs to exactly one user and one store.
- A user's rating is unique per store.
- Store and rating averages are calculated from the individual rating rows;
  they are not stored as separate database columns.

## Run the API

```powershell
npm run dev
```

The server connects to PostgreSQL before it begins listening. By default,
routes are mounted under `/api`, and JSON request bodies are limited to 1 MB.
Set `CORS_ORIGIN` to the exact frontend origin during development or
deployment.

## Authentication and roles

Login returns a JWT that is valid for 1 day. Include it in the
`Authorization` request header using the `Bearer` scheme, followed by the
token returned by the login endpoint.

Access is role-based:

| Role | Permissions |
| --- | --- |
| `ADMIN` | Dashboard counts, user management, and store management. |
| `USER` | Browse stores, view ratings, and submit or update personal ratings. |
| `STORE_OWNER` | View assigned stores and their ratings and raters. |

Signup always creates a `USER`. Administrators can create accounts for all
three roles. There is no server-side logout endpoint: discard the token in the
client to log out. Password changes are available to any authenticated role.

## API reference

All request and response bodies use JSON unless specified otherwise. Protected
routes require a valid bearer token and the role listed in the access column.

### Health

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | Returns `{ "status": "OK" }` when the API is running. |

### Authentication

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | Public | Register a normal user. |
| `POST` | `/api/auth/login` | Public | Verify credentials and return a JWT. |
| `PUT` | `/api/auth/password` | Any authenticated role | Change the current user's password. |

Signup request:

```json
{
  "name": "Rahul Kumar Sharma Singh",
  "email": "rahul@example.com",
  "address": "Dehradun, Uttarakhand",
  "password": "Example@123"
}
```

Login request:

```json
{
  "email": "rahul@example.com",
  "password": "Example@123"
}
```

Password update request:

```json
{
  "oldPassword": "Example@123",
  "newPassword": "Another@123"
}
```

### Administrator

All routes in this section require the `ADMIN` role.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/admin/dashboard` | Return counts for users, stores, and ratings. |
| `POST` | `/api/admin/users` | Create an account with any supported role. |
| `GET` | `/api/admin/users` | Search, filter, and sort users. |
| `GET` | `/api/admin/users/:id` | Return user details; store owners also include store and rating details. |
| `POST` | `/api/admin/stores` | Create a store assigned to a `STORE_OWNER`. |
| `GET` | `/api/admin/stores` | Search and sort stores, including by average rating. |

Create-user request:

```json
{
  "name": "Aarav Sharma Store Owner",
  "email": "owner@example.com",
  "address": "Dehradun, Uttarakhand",
  "password": "Owner@1234",
  "role": "STORE_OWNER"
}
```

Create-store request (the `ownerId` must be a JSON number, not a string):

```json
{
  "name": "Fresh Mart",
  "email": "contact@freshmart.example",
  "address": "Clock Tower, Dehradun",
  "ownerId": 2
}
```

User-list query parameters:

| Parameter | Description |
| --- | --- |
| `name` | Case-insensitive partial match on name. |
| `email` | Case-insensitive partial match on email. |
| `address` | Case-insensitive partial match on address. |
| `role` | Exact role filter: `ADMIN`, `USER`, or `STORE_OWNER`. |
| `sortBy` | `name`, `email`, `address`, or `role`; defaults to `name`. |
| `order` | `asc` or `desc`; defaults to `asc`. |

Example:

```text
GET /api/admin/users?role=STORE_OWNER&name=aarav&sortBy=email&order=asc
```

Store-list query parameters:

| Parameter | Description |
| --- | --- |
| `name` | Case-insensitive partial match on store name. |
| `email` | Case-insensitive partial match on store email. |
| `address` | Case-insensitive partial match on store address. |
| `sortBy` | `name`, `email`, `address`, or `rating`; defaults to `name`. |
| `order` | `asc` or `desc`; defaults to `asc`. |

Each store in the response includes `id`, `name`, `email`, `address`, and
`rating`. `rating` is the average score rounded to one decimal place, or `0`
when the store has no ratings.

### User

All routes in this section require the `USER` role.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/user/stores` | Browse stores with overall and personal rating information. |
| `POST` | `/api/user/stores/:storeId/rating` | Create or update the current user's rating. |

Store-list query parameters:

| Parameter | Description |
| --- | --- |
| `name` | Case-insensitive partial match on store name. |
| `address` | Case-insensitive partial match on store address. |
| `search` | Case-insensitive partial match across store name or address. |
| `page` | Page number; defaults to `1`. |
| `limit` | Items per page; defaults to `10`, minimum `1`, maximum `100`. |
| `sortBy` | `name`, `address`, `createdAt`, or `rating`; defaults to `name`. |
| `order` | `asc` or `desc`; defaults to `asc`. |

Example:

```text
GET /api/user/stores?search=market&page=1&limit=10&sortBy=rating&order=desc
```

The response contains a `stores` array and a `pagination` object. Each store
includes `overallRating` (rounded to one decimal place, or `0` with no
ratings), `totalRatings`, and `myRating` (`null` if the current user has not
rated it). Although `createdAt` is accepted as a sort field, the store-list
response does not include that field, so use `name`, `address`, or `rating`
for reliable sorting.

Rating request:

```json
{
  "value": 5
}
```

`value` must be an integer from `1` to `5`. If the user already rated the
store, the existing rating is updated.

### Store owner

All routes in this section require the `STORE_OWNER` role.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/owner/dashboard` | View assigned stores, their average ratings, and individual raters. |

The response contains a `stores` array. For compatibility, it also includes
top-level fields (`store`, `averageRating`, `totalRatings`, and `raters`) for
the first store in that array. The owner dashboard's average is rounded to
two decimal places; a store with no ratings has a `null` average in `stores`
and `0` in the top-level `averageRating`. If no store is assigned, the API
returns `404`.

## Validation rules

- User name: 20–60 characters.
- Email: valid email address, up to 254 characters.
- Address: up to 400 characters.
- Password: 8–16 characters, with at least one uppercase letter and one
  non-alphanumeric special character.
- Store name: 1–100 characters.
- Store owner: a positive integer ID belonging to a `STORE_OWNER`.
- Rating: a whole number from 1 through 5.
- Request objects reject unknown fields.

## Error responses

Errors are returned as JSON with a `message` field. Common status codes:

| Status | Meaning |
| --- | --- |
| `400` | Invalid input, malformed JSON, incorrect current password, or invalid foreign-key reference. |
| `401` | Missing, invalid, or expired token; or invalid login credentials. |
| `403` | Authenticated account does not have permission for the route. |
| `404` | Route, user, store, or owner assignment was not found. |
| `409` | A unique value already exists, such as an email address. |
| `413` | Request body exceeds the 1 MB limit. |
| `500` | Unexpected server error. |

## Tests and development tools

Run the test suite:

```powershell
npm test
```

Open Prisma Studio to inspect the configured database:

```powershell
npm run db:studio
```

Generate the Prisma client after changing the Prisma schema:

```powershell
npx prisma generate
```

Create and apply a development migration after changing the schema:

```powershell
npm run db:migrate -- --name describe-your-change
```

## Security notes

- Keep `.env` private. It contains database credentials, the JWT signing
  secret, and initial administrator credentials.
- Use a unique, high-entropy `JWT_SECRET` of at least 32 characters; do not use
  a sample value in production.
- Use strong, unique database and administrator passwords.
- Configure `CORS_ORIGIN` to the trusted frontend origin in production rather
  than relying on the permissive default.
- Use HTTPS in production so credentials and bearer tokens are protected in
  transit.
- Passwords are hashed with bcrypt before they are stored.
- JWTs expire after one day. Since tokens are stateless, logging out requires
  the client to discard its token.
