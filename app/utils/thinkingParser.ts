// Utility to parse <think> tags from AI responses
export interface ParsedResponse {
  thinking: string;
  content: string;
}

export function parseThinkingTags(text: string): ParsedResponse {
  // Debug logging in development
  if (process.env.NODE_ENV !== 'production') {
    if (text.includes('<think>') || text.includes('</think>')) {
      console.log('DEBUG: Found thinking tags in text:', text.substring(0, 300) + '...');
    }
  }

  // Regular expression to match <think>...</think> tags (case insensitive, multiline)
  const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;

  let thinking = '';
  let content = text;

  // Extract all thinking content
  const matches = text.match(thinkRegex);
  if (matches) {
    matches.forEach(fullMatch => {
      const innerMatch = fullMatch.match(/<think>([\s\S]*?)<\/think>/i);
      if (innerMatch && innerMatch[1]) {
        thinking += innerMatch[1].trim() + '\n\n';
      }
    });
  }

  // Remove thinking tags from main content
  content = content.replace(thinkRegex, '').trim();

  // Debug logging in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('DEBUG: Extracted thinking:', thinking);
    console.log('DEBUG: Cleaned content:', content);
    console.log('DEBUG: Original text length:', text.length, 'Clean content length:', content.length);
  }

  return {
    thinking: thinking.trim(),
    content: content
  };
}

// Function to check if text contains thinking tags
export function hasThinkingTags(text: string): boolean {
  const thinkRegex = /<think>/i;
  return thinkRegex.test(text);
}