import { z } from "zod";

export const rollDiceTool = {
  name: "roll_dice",
  description: "Rolls an N-sided die",
  inputSchema: {
    sides: z.number().int().min(2),
  },
  handler: async ({ sides }: { sides: number }) => {
    const value = 1 + Math.floor(Math.random() * sides);
    return {
      content: [{ type: "text" as const, text: `🎲 You rolled a ${value}!` }],
    };
  }
};