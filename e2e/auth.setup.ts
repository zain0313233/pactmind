import { test as setup } from "@playwright/test"
import fs from "fs"
import path from "path"

const authFile = path.join(__dirname, ".auth/user.json")

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

setup("authenticate", async ({ request }) => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD

  if (!email || !password) {
    throw new Error(
      "Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD in pactmind/.env"
    )
  }

  fs.mkdirSync(path.dirname(authFile), { recursive: true })

  let lastError = "unknown"

  for (let attempt = 1; attempt <= 24; attempt++) {
    const res = await request.post("/api/login", {
      data: { email, password },
      headers: { "Content-Type": "application/json" },
    })
    const text = await res.text()

    if (res.ok()) {
      const state = await request.storageState()
      fs.writeFileSync(authFile, JSON.stringify(state, null, 2))
      return
    }

    lastError = `Login failed (${res.status()}): ${text.slice(0, 400)}`

    if (res.status() === 400 || res.status() === 401) {
      throw new Error(lastError)
    }

    if (res.status() === 429) {
      await sleep(65_000)
      continue
    }

    await sleep(3_000)
  }

  throw new Error(lastError)
})
