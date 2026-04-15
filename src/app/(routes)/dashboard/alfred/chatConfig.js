// Client-side wrapper that calls the /api/alfred route in "chat" mode
const chatCache = new Map();

async function chat(budgetList, incomeList, expenseList, prompt) {
  try {
    // Simple cache key to avoid duplicate requests for same input
    const cacheKey = `${prompt}_${JSON.stringify(budgetList)}`.substring(0, 100);
    if (chatCache.has(cacheKey)) {
      console.log("Returning cached chat response");
      return chatCache.get(cacheKey);
    }

    const response = await fetch("/api/alfred", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "chat",
        budgetList,
        incomeList,
        expenseList,
        prompt,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      console.error("Chat API error:", data);
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.response) {
      chatCache.set(cacheKey, data.response);
    }
    return data.response;
  } catch (error) {
    console.error("Chat error:", error);
    throw error;
  }
}

export default chat;
