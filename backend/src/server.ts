import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);

const app = createApp();
app.listen(port, () => {
  console.log(`DevLens API running on http://localhost:${port}`);
});
