FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/scripts/migrate-run-artifacts.cjs ./scripts/migrate-run-artifacts.cjs
COPY --from=build /app/next.config.ts ./next.config.ts
EXPOSE 3000
CMD ["sh","-c","npx prisma migrate deploy && npm run start"]
