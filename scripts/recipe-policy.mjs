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

  // Web stack rules
  if (stack.has("react") && stack.has("vite")) {
    for (const required of ["tailwindcss", "shadcn-ui"]) {
      if (!stack.has(required)) errors.push(`${app.id}: web recipe '${recipe.id}' is missing required stack member '${required}'`);
    }
  }

  // Tauri Desktop stack rules
  if (recipe.id === "tauri-desktop") {
    for (const required of ["tauri", "rust", "react", "vite", "tailwindcss", "shadcn-ui"]) {
      if (!stack.has(required)) errors.push(`${app.id}: tauri-desktop recipe is missing required stack member '${required}'`);
    }
    if (app.mobile && !app.paths?.desktop && !app.web) {
      errors.push(`${app.id}: tauri-desktop is preferred for desktop (macOS/Windows/Linux/Web), not for mobile-only apps`);
    }
  }

  // React Native Expo stack rules
  if (recipe.id === "react-native-expo") {
    for (const required of ["react-native", "expo", "typescript", "nativewind"]) {
      if (!stack.has(required)) errors.push(`${app.id}: react-native-expo recipe is missing required stack member '${required}'`);
    }
  }

  // Native Android Kotlin stack rules
  if (recipe.id === "native-android-kotlin") {
    for (const required of ["android", "kotlin", "gradle"]) {
      if (!stack.has(required)) errors.push(`${app.id}: native-android-kotlin recipe is missing required stack member '${required}'`);
    }
  }

  // Native iOS Swift stack rules
  if (recipe.id === "native-ios-swift") {
    for (const required of ["ios", "swift"]) {
      if (!stack.has(required)) errors.push(`${app.id}: native-ios-swift recipe is missing required stack member '${required}'`);
    }
  }

  // Cross-layer compatibility rule: Direct Mobile-to-Database requires API
  const isMobileApp = Boolean(app.mobile || app.paths?.mobile || app.paths?.android || app.paths?.ios || recipe.id === "react-native-expo" || recipe.id === "native-android-kotlin" || recipe.id === "native-ios-swift");
  if (isMobileApp && app.data && (!app.api || !app.paths?.api)) {
    errors.push(`${app.id}: mobile clients cannot connect directly to remote databases; an API layer is required`);
  }

  // Full stack PostgreSQL rules
  if (recipe.id === "full-stack-postgresql") {
    if (!app.paths?.api || !app.api) errors.push(`${app.id}: full-stack-postgresql recipe requires an API`);
    if (app.data?.engine !== "postgresql") errors.push(`${app.id}: full-stack-postgresql recipe requires PostgreSQL data`);
    if (app.backup?.strategy !== "postgresql") errors.push(`${app.id}: full-stack-postgresql recipe requires a PostgreSQL backup strategy`);
    for (const required of ["shadcn-ui", "fastify", "prisma", "postgresql"]) {
      if (!stack.has(required)) errors.push(`${app.id}: full-stack-postgresql recipe is missing required stack member '${required}'`);
    }
  }

  // Full stack SQLite rules
  if (recipe.id === "full-stack-sqlite") {
    if (!app.paths?.api || !app.api) errors.push(`${app.id}: full-stack-sqlite recipe requires an API`);
    if (app.data?.engine !== "sqlite") errors.push(`${app.id}: full-stack-sqlite recipe requires SQLite data`);
    if (app.backup?.strategy !== "filesystem") errors.push(`${app.id}: full-stack-sqlite recipe requires a filesystem backup strategy`);
    if (!app.docker?.volumes?.length) errors.push(`${app.id}: full-stack-sqlite recipe requires a persistent data volume`);
    for (const required of ["shadcn-ui", "fastify", "prisma", "sqlite"]) {
      if (!stack.has(required)) errors.push(`${app.id}: full-stack-sqlite recipe is missing required stack member '${required}'`);
    }
  }

  // React Web rules
  if (recipe.id === "react-web") {
    if (app.paths?.api || app.api || app.data) errors.push(`${app.id}: react-web recipe cannot register server-side data or an API`);
  }

  return errors;
}
