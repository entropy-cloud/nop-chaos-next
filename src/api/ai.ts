import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"

export const aiApi = {
  chat: async (messages: Array<{ role: "user" | "assistant"; content: string }>) => {
    const result = streamText({
      model: openai("gpt-4o-mini"),
      messages,
    })
    return result
  },
}
