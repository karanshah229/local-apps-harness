import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadRecipe(root, recipeId) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(recipeId ?? "")) {
    throw new Error(`Invalid recipe id '${recipeId ?? ""}'`);
  }
  const path = resolve(root, "templates", recipeId, "recipe.json");
  if (!existsSync(path)) throw new Error(`Unknown recipe '${recipeId}'`);
  return JSON.parse(readFileSync(path, "utf8"));
}

export function validateRecipePolicy(root, app) {
  if (app.status === "legacy") return [];

  let recipe;
  try {
    recipe = loadRecipe(root, app.recipe);
  } catch (error) {
    return [`${app.id}: ${error.message}; non-legacy apps must use a repository recipe`];
  }

  const errors = [];
  const stack = new Set(recipe.stack ?? []);
  if (stack.has("shadcn-ui") && !stack.has("tailwindcss")) {
    errors.push(`${app.id}: recipe '${recipe.id}' must pair shadcn/ui with Tailwind CSS`);
  }
  if (recipe.id === "full-stack") {
    if (!app.paths?.api || !app.api) errors.push(`${app.id}: full-stack recipe requires an API`);
    if (app.data?.engine !== "postgresql") errors.push(`${app.id}: full-stack recipe requires PostgreSQL data`);
    if (app.backup?.strategy !== "postgresql") errors.push(`${app.id}: full-stack recipe requires a PostgreSQL backup strategy`);
    for (const required of ["shadcn-ui", "fastify", "prisma", "postgresql"]) {
      if (!stack.has(required)) errors.push(`${app.id}: full-stack recipe is missing required stack member '${required}'`);
    }
  }
  if (recipe.id === "react-web") {
    if (app.paths?.api || app.api || app.data) errors.push(`${app.id}: react-web recipe cannot register server-side data or an API`);
    if (!stack.has("shadcn-ui")) errors.push(`${app.id}: react-web recipe is missing required stack member 'shadcn-ui'`);
  }
  return errors;
}
